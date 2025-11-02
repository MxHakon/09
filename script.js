let canvas;
let ctx;
let placedObjects = [];
let ifcModel = null;
let rotation = { x: 0.5, y: 0.5 };
let zoom = 1;
let offset = { x: 0, y: 0 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let dragButton = 0;
let showGrid = true;

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth - 250;
    canvas.height = window.innerHeight;
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    setupFileUpload();
    setupDragAndDrop();
    
    draw();
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (showGrid) {
        drawGrid();
    }
    
    if (ifcModel) {
        drawBuilding();
    }
    
    placedObjects.forEach(obj => {
        drawObject(obj);
    });
    
    requestAnimationFrame(draw);
}

function drawGrid() {
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    
    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;
    const spacing = 30 * zoom;
    
    for (let i = -20; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * spacing, 0);
        ctx.lineTo(centerX + i * spacing, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, centerY + i * spacing);
        ctx.lineTo(canvas.width, centerY + i * spacing);
        ctx.stroke();
    }
    
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
}

function drawBuilding() {
    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;
    
    const width = 150 * zoom;
    const height = 100 * zoom;
    const depth = 80 * zoom;
    
    const rx = rotation.x;
    const ry = rotation.y;
    
    ctx.fillStyle = '#888888';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    ctx.beginPath();
    ctx.moveTo(-width/2, -height/2);
    ctx.lineTo(width/2, -height/2);
    ctx.lineTo(width/2 + depth * Math.cos(ry), -height/2 + depth * Math.sin(ry));
    ctx.lineTo(-width/2 + depth * Math.cos(ry), -height/2 + depth * Math.sin(ry));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-width/2, -height/2);
    ctx.lineTo(-width/2, height/2);
    ctx.lineTo(-width/2 + depth * Math.cos(ry), height/2 + depth * Math.sin(ry));
    ctx.lineTo(-width/2 + depth * Math.cos(ry), -height/2 + depth * Math.sin(ry));
    ctx.closePath();
    ctx.fillStyle = '#666666';
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-width/2, -height/2);
    ctx.lineTo(width/2, -height/2);
    ctx.lineTo(width/2, height/2);
    ctx.lineTo(-width/2, height/2);
    ctx.closePath();
    ctx.fillStyle = '#999999';
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

function drawObject(obj) {
    const centerX = canvas.width / 2 + offset.x + obj.x * zoom;
    const centerY = canvas.height / 2 + offset.y + obj.y * zoom;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    if (obj.type === 'crane') {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-15 * zoom, 0, 30 * zoom, 10 * zoom);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-5 * zoom, -100 * zoom, 10 * zoom, 100 * zoom);
        
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(-80 * zoom, -105 * zoom, 160 * zoom, 5 * zoom);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-15 * zoom, 0, 30 * zoom, 10 * zoom);
        ctx.strokeRect(-5 * zoom, -100 * zoom, 10 * zoom, 100 * zoom);
        ctx.strokeRect(-80 * zoom, -105 * zoom, 160 * zoom, 5 * zoom);
    } else if (obj.type === 'scaffold') {
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            ctx.strokeRect(-30 * zoom, -60 * zoom + i * 15 * zoom, 60 * zoom, 15 * zoom);
        }
    } else if (obj.type === 'container') {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-40 * zoom, -15 * zoom, 80 * zoom, 30 * zoom);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-40 * zoom, -15 * zoom, 80 * zoom, 30 * zoom);
    }
    
    ctx.restore();
}

function onMouseDown(e) {
    isDragging = true;
    dragButton = e.button;
    lastMouse = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    
    if (dragButton === 0) {
        rotation.x += dy * 0.01;
        rotation.y += dx * 0.01;
    } else if (dragButton === 2) {
        offset.x += dx;
        offset.y += dy;
    }
    
    lastMouse = { x: e.clientX, y: e.clientY };
}

function onMouseUp(e) {
    isDragging = false;
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    zoom = Math.max(0.1, Math.min(3, zoom + delta));
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.onclick = function() {
        fileInput.click();
    };

    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            loadIFCFile(file);
        }
    };

    uploadArea.ondragover = function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#4CAF50';
    };

    uploadArea.ondragleave = function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#666';
    };

    uploadArea.ondrop = function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#666';
        const file = e.dataTransfer.files[0];
        if (file) {
            loadIFCFile(file);
        }
    };
}

function loadIFCFile(file) {
    ifcModel = { loaded: true };
    document.getElementById('uploadArea').innerHTML = '<p>✓ ' + file.name + ' lastet</p>';
}

function setupDragAndDrop() {
    const tools = document.querySelectorAll('.tool-item');
    
    tools.forEach(function(tool) {
        tool.ondragstart = function(e) {
            const type = tool.getAttribute('data-type');
            const duration = tool.querySelector('input').value;
            e.dataTransfer.setData('type', type);
            e.dataTransfer.setData('duration', duration);
        };
    });

    canvas.ondragover = function(e) {
        e.preventDefault();
    };

    canvas.ondrop = function(e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const duration = e.dataTransfer.getData('duration');
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - canvas.width / 2 - offset.x;
        const y = e.clientY - rect.top - canvas.height / 2 - offset.y;
        
        placeObject(type, duration, x / zoom, y / zoom);
    };
}

function placeObject(type, duration, x, y) {
    const obj = {
        id: Date.now(),
        type: type,
        duration: duration,
        x: x,
        y: y
    };
    placedObjects.push(obj);
    updatePlacedElementsList();
}

function updatePlacedElementsList() {
    const list = document.getElementById('placedElements');
    list.innerHTML = '';
    
    placedObjects.forEach(function(obj) {
        const div = document.createElement('div');
        div.className = 'placed-element';
        const name = obj.type === 'crane' ? 'Tårnkran' : obj.type === 'scaffold' ? 'Stillas' : 'Container';
        div.innerHTML = '<strong>' + name + '</strong><br>Varighet: ' + obj.duration + ' måneder<button class="remove-btn" onclick="removeObject(' + obj.id + ')">Fjern</button>';
        list.appendChild(div);
    });
}

function removeObject(id) {
    placedObjects = placedObjects.filter(function(o) {
        return o.id !== id;
    });
    updatePlacedElementsList();
}

function resetView() {
    rotation = { x: 0.5, y: 0.5 };
    zoom = 1;
    offset = { x: 0, y: 0 };
}

function toggleGrid() {
    showGrid = !showGrid;
}

window.onresize = function() {
    canvas.width = window.innerWidth - 250;
    canvas.height = window.innerHeight;
};

window.onload = function() {
    init();
};