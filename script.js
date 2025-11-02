let scene, camera, renderer, controls;
let grid, axes;
let placedObjects = [];
let ifcModels = [];
let ifcLoader;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    camera = new THREE.PerspectiveCamera(
        75,
        (window.innerWidth - 250) / window.innerHeight,
        0.1,
        2000
    );
    camera.position.set(100, 100, 100);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth - 250, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    grid = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
    scene.add(grid);

    axes = new THREE.AxesHelper(50);
    scene.add(axes);

    ifcLoader = new THREE.IFCLoader();
    ifcLoader.ifcManager.setWasmPath('https://cdn.jsdelivr.net/npm/web-ifc@0.0.44/');

    setupFileUpload();
    setupDragAndDrop();

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
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
    ifcModels.forEach(model => {
        scene.remove(model);
    });
    ifcModels = [];

    document.getElementById('uploadArea').innerHTML = '<p>⏳ Laster ' + file.name + '...</p>';

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);

        ifcLoader.load(
            url,
            function(ifcModel) {
                scene.add(ifcModel);
                ifcModels.push(ifcModel);

                ifcModel.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.side = THREE.DoubleSide;
                                    mat.transparent = false;
                                });
                            } else {
                                child.material.side = THREE.DoubleSide;
                                child.material.transparent = false;
                            }
                        }
                    }
                });

                const box = new THREE.Box3().setFromObject(ifcModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraZ *= 1.5;

                camera.position.set(
                    center.x + cameraZ,
                    center.y + cameraZ,
                    center.z + cameraZ
                );
                camera.lookAt(center);
                controls.target.copy(center);
                controls.update();

                document.getElementById('uploadArea').innerHTML = '<p>✓ ' + file.name + ' lastet</p>';
            },
            function(progress) {
                const percent = (progress.loaded / progress.total) * 100;
                document.getElementById('uploadArea').innerHTML = '<p>⏳ Laster ' + Math.round(percent) + '%</p>';
            },
            function(error) {
                console.error('Feil ved lasting av IFC:', error);
                document.getElementById('uploadArea').innerHTML = '<p>❌ Kunne ikke laste filen. Prøv en annen IFC-fil.</p>';
            }
        );
    };

    reader.readAsArrayBuffer(file);
}

function setupDragAndDrop() {
    const tools = document.querySelectorAll('.tool-item');
    const canvas = document.getElementById('canvas');

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
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        placeObject(type, duration, intersectPoint);
    };
}

function placeObject(type, duration, position) {
    let object;

    if (type === 'crane') {
        object = new THREE.Group();

        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const baseGeometry = new THREE.CylinderGeometry(3, 4, 5, 8);
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 2.5;
        base.castShadow = true;
        base.receiveShadow = true;
        object.add(base);

        const towerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const towerGeometry = new THREE.CylinderGeometry(0.8, 0.8, 60, 8);
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.y = 35;
        tower.castShadow = true;
        object.add(tower);

        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        const armGeometry = new THREE.BoxGeometry(50, 1, 1);
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.y = 65;
        arm.castShadow = true;
        object.add(arm);

        const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cableGeometry = new THREE.CylinderGeometry(0.2, 0.2, 20, 8);
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(20, 55, 0);
        object.add(cable);

    } else if (type === 'scaffold') {
        object = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.7,
            roughness: 0.3
        });

        for (let level = 0; level < 6; level++) {
            const platformGeometry = new THREE.BoxGeometry(12, 0.3, 3);
            const platform = new THREE.Mesh(platformGeometry, material);
            platform.position.y = level * 3 + 1.5;
            platform.castShadow = true;
            platform.receiveShadow = true;
            object.add(platform);

            for (let i = 0; i < 4; i++) {
                const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
                const pole = new THREE.Mesh(poleGeometry, material);
                const x = i < 2 ? -6 : 6;
                const z = i % 2 === 0 ? -1.5 : 1.5;
                pole.position.set(x, level * 3 + 1.5, z);
                pole.castShadow = true;
                object.add(pole);
            }
        }

    } else if (type === 'container') {
        const geometry = new THREE.BoxGeometry(12, 3, 2.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.8,
            roughness: 0.2
        });
        object = new THREE.Mesh(geometry, material);
        object.position.y = 1.5;
        object.castShadow = true;
        object.receiveShadow = true;

        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        object.add(edges);
    }

    object.position.copy(position);
    scene.add(object);

    const obj = {
        id: Date.now(),
        type: type,
        duration: duration,
        mesh: object
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
    const obj = placedObjects.find(function(o) {
        return o.id === id;
    });
    if (obj) {
        scene.remove(obj.mesh);
        placedObjects = placedObjects.filter(function(o) {
            return o.id !== id;
        });
        updatePlacedElementsList();
    }
}

function resetView() {
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

function toggleGrid() {
    grid.visible = !grid.visible;
    axes.visible = !axes.visible;
}

window.onresize = function() {
    camera.aspect = (window.innerWidth - 250) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 250, window.innerHeight);
};

window.onload = function() {
    init();
};