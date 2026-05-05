// contact3d.js
(function() {
    const container = document.getElementById('contact3d-canvas');
    if(!container) return;

    // Ensure container takes full size but lets clicks pass through
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'none';

    // SCENE SETUP
    const scene = new THREE.Scene();
    
    // Transparent camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 8;
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff6b00, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x4444ff, 0.8);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // MATERIALS
    const metallicGrey = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
    const metallicDarkGrey = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 });
    const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xff4d00, roughness: 0.3, metalness: 0.6 });

    // DRONE GROUP
    const drone = new THREE.Group();
    scene.add(drone);

    // BUILD DRONE (Same as hero, but static pre-assembled)
    function place(mesh, pos) {
        mesh.position.set(pos.x, pos.y, pos.z);
        drone.add(mesh);
    }

    // Chassis
    const mainBodyGeo = new THREE.SphereGeometry(0.22, 32, 32);
    mainBodyGeo.scale(1.0, 0.85, 2.2);
    const mainBody = new THREE.Mesh(mainBodyGeo, metallicGrey);
    place(mainBody, { x: 0, y: 0.12, z: 0 });

    const batteryGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);
    const battery = new THREE.Mesh(batteryGeo, metallicDarkGrey);
    place(battery, { x: 0, y: 0.28, z: -0.1 });

    const cameraGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
    const cameraMesh = new THREE.Mesh(cameraGeo, metallicDarkGrey);
    cameraMesh.rotation.z = Math.PI / 2;
    place(cameraMesh, { x: 0, y: 0.12, z: 0.45 });

    const lensGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const lens = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 }));
    lens.scale.set(1, 1, 0.5);
    place(lens, { x: 0, y: 0.12, z: 0.52 });

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 16);
    const armGeoLong = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 16);
    
    const armF = new THREE.Mesh(armGeo, metallicDarkGrey);
    armF.rotation.x = Math.PI / 2;
    armF.rotation.z = Math.PI / 4;
    place(armF, { x: 0, y: 0.1, z: 0.2 });

    const armB = new THREE.Mesh(armGeoLong, metallicDarkGrey);
    armB.rotation.x = Math.PI / 2;
    armB.rotation.z = -Math.PI / 4;
    place(armB, { x: 0, y: 0.1, z: -0.2 });

    // Propellers & Guards
    const guardGeo = new THREE.TorusGeometry(0.35, 0.02, 16, 64);
    const motorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
    
    const propellers = [];
    
    const createPropGroup = (x, z) => {
        const pGroup = new THREE.Group();
        pGroup.position.set(x, 0.1, z);
        drone.add(pGroup);

        const motor = new THREE.Mesh(motorGeo, metallicGrey);
        pGroup.add(motor);

        const guard = new THREE.Mesh(guardGeo, metallicDarkGrey);
        guard.rotation.x = Math.PI / 2;
        pGroup.add(guard);

        const propAxis = new THREE.Group();
        pGroup.add(propAxis);
        propellers.push(propAxis);

        const bladeGeo = new THREE.BoxGeometry(0.6, 0.01, 0.04);
        const blade1 = new THREE.Mesh(bladeGeo, orangeMaterial);
        propAxis.add(blade1);
        
        const blade2 = new THREE.Mesh(bladeGeo, orangeMaterial);
        blade2.rotation.y = Math.PI / 2;
        propAxis.add(blade2);
    };

    createPropGroup(0.3, 0.45);
    createPropGroup(-0.3, 0.45);
    createPropGroup(0.3, -0.45);
    createPropGroup(-0.3, -0.45);

    // Initial positioning
    drone.rotation.y = Math.PI; // Face forward initially
    drone.position.z = 2; // Bring it closer

    // MOUSE TRACKING
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const contactSection = document.getElementById('contact');
    
    contactSection.addEventListener('mousemove', (event) => {
        const rect = contactSection.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        // Convert to normalized device coordinates (-1 to +1)
        mouseX = (x * 2) - 1;
        mouseY = -(y * 2) + 1;
    });

    contactSection.addEventListener('mouseleave', () => {
        // Return to center when mouse leaves
        mouseX = 0;
        mouseY = 0;
    });

    // RESIZE HANDLER
    window.addEventListener('resize', () => {
        if(!container || container.clientWidth === 0) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    // RENDER LOOP
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime();

        // Spin propellers rapidly
        propellers.forEach((p, index) => {
            p.rotation.y += (index % 2 === 0 ? 0.5 : -0.5);
        });

        // Calculate target positions based on mouse
        targetX = mouseX * 5; 
        targetY = mouseY * 2; 

        // Smooth Lerping
        drone.position.x += (targetX - drone.position.x) * 0.05;
        drone.position.y += (targetY - drone.position.y) * 0.05;
        
        // Add a gentle hover bobbing effect
        drone.position.y += Math.sin(time * 2) * 0.005;

        // Bank and tilt based on movement vector
        const targetRotationZ = (drone.position.x - targetX) * 0.2; 
        const targetRotationX = (targetY - drone.position.y) * 0.2; 
        const targetRotationY = Math.PI + (mouseX * 0.5); 

        drone.rotation.z += (targetRotationZ - drone.rotation.z) * 0.1;
        drone.rotation.x += (targetRotationX - drone.rotation.x) * 0.1;
        drone.rotation.y += (targetRotationY - drone.rotation.y) * 0.1;

        renderer.render(scene, camera);
    }

    animate();
})();
