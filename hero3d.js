// =============================================
// SKY NEX Drones — 3D Hero Animation (Three.js)
// Cinewhoop Style, Metallic Grey, Assembling
// =============================================

let scene, camera, renderer, droneGroup;
let droneParts = [];
let mouseDown = false;
let prevMouse = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let isUserInteracting = false;
let interactionTimeout;
let clock;
let glowLight;

// Assembly state
const ASSEMBLY_DURATION = 4.5; // seconds
let assemblyComplete = false;

function initHero3D() {
    const container = document.getElementById('hero3d-container');
    if (!container) return;

    clock = new THREE.Clock();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 5.0);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    setupLighting();
    buildDrone();

    droneGroup.scale.set(1.6, 1.6, 1.6);
    currentRotation.x = -0.15;
    currentRotation.y = 0.2;

    createParticles();
    setupInteraction(container);
    window.addEventListener('resize', () => onResize(container));

    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0x666666, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaabbcc, 0.8);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 1.5, 20);
    rimLight.position.set(-4, 2, -4);
    scene.add(rimLight);

    const topLight = new THREE.PointLight(0xffffff, 0.8, 15);
    topLight.position.set(0, 7, 0);
    scene.add(topLight);

    glowLight = new THREE.PointLight(0xffffff, 0.0, 8); // Starts at 0, ramps up during assembly
    glowLight.position.set(0, -0.5, 1.5);
    scene.add(glowLight);
}

function createMaterial(color, metalness, roughness) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        envMapIntensity: 1.5
    });
}

function buildDrone() {
    droneGroup = new THREE.Group();
    scene.add(droneGroup);

    // "greyish metalic colour"
    const metallicGrey = createMaterial(0x9999a0, 0.85, 0.3);
    const metallicDarkGrey = createMaterial(0x555558, 0.8, 0.4);
    const brushedSteel = createMaterial(0xb0b0b0, 0.95, 0.2);
    const blackMetal = createMaterial(0x222222, 0.7, 0.5);
    const glassMat = createMaterial(0x000000, 1.0, 0.0);
    glassMat.transparent = true;
    glassMat.opacity = 0; // Start invisible

    // Helper to store parts for assembly animation
    const place = (mesh, targetPos, delay, explodedOffset) => {
        const startPos = {
            x: targetPos.x + explodedOffset.x,
            y: targetPos.y + explodedOffset.y,
            z: targetPos.z + explodedOffset.z
        };
        
        mesh.position.set(startPos.x, startPos.y, startPos.z);
        
        // Clone material so we can animate opacity per-mesh without affecting others
        mesh.material = mesh.material.clone();
        mesh.material.transparent = true;
        mesh.material.opacity = 0;
        // Save original opacity target
        mesh.userData.targetOpacity = (mesh.material === glassMat) ? 0.8 : 1.0;
        
        droneGroup.add(mesh);
        
        droneParts.push({
            mesh: mesh,
            targetPos: targetPos,
            startPos: startPos,
            delay: delay,
            isGroup: false
        });
    };

    // --- MAIN BODY (Cinewhoop style - Natural/Aerodynamic) ---
    // Smooth capsule chassis using a stretched sphere for broad compatibility
    const mainBodyGeo = new THREE.SphereGeometry(0.18, 32, 32);
    mainBodyGeo.scale(1.0, 0.85, 2.2); // Stretch into an aerodynamic pod
    const mainBody = new THREE.Mesh(mainBodyGeo, metallicGrey);
    place(mainBody, { x: 0, y: 0.12, z: 0 }, 0.0, { x: 0, y: 5, z: 0 });

    const batteryGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);
    const battery = new THREE.Mesh(batteryGeo, metallicDarkGrey);
    place(battery, { x: 0, y: 0.28, z: -0.1 }, 0.4, { x: 0, y: 5, z: -2 });

    // --- CAMERA SYSTEM ---
    const camHousingGeo = new THREE.BoxGeometry(0.22, 0.25, 0.22);
    const camHousing = new THREE.Mesh(camHousingGeo, blackMetal);
    place(camHousing, { x: 0, y: 0.05, z: 0.4 }, 0.6, { x: 0, y: -2, z: 4 });

    const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32);
    const lens = new THREE.Mesh(lensGeo, glassMat);
    lens.rotation.x = Math.PI / 2;
    place(lens, { x: 0, y: 0.05, z: 0.52 }, 0.8, { x: 0, y: -2, z: 4 });
    // Override target opacity for glass
    droneParts[droneParts.length - 1].mesh.userData.targetOpacity = 0.8;

    const lensRingGeo = new THREE.TorusGeometry(0.09, 0.015, 16, 32);
    const lensRing = new THREE.Mesh(lensRingGeo, brushedSteel);
    place(lensRing, { x: 0, y: 0.05, z: 0.51 }, 0.9, { x: 0, y: -2, z: 4 });

    // --- PROP GUARDS & MOTORS ---
    const guardRadius = 0.32;
    const guardTube = 0.035;
    
    const armConfigs = [
        { x: 1, z: 1, rot: -Math.PI / 4, delay: 1.0, ox: 4, oz: 4 },
        { x: -1, z: 1, rot: Math.PI / 4, delay: 1.2, ox: -4, oz: 4 },
        { x: 1, z: -1, rot: Math.PI / 4, delay: 1.4, ox: 4, oz: -4 },
        { x: -1, z: -1, rot: -Math.PI / 4, delay: 1.6, ox: -4, oz: -4 }
    ];

    armConfigs.forEach((cfg) => {
        const px = cfg.x * 0.34;
        const pz = cfg.z * 0.32;
        const offX = cfg.ox;
        const offZ = cfg.oz;

        const guardGeo = new THREE.TorusGeometry(guardRadius, guardTube, 16, 48);
        const guard = new THREE.Mesh(guardGeo, metallicGrey);
        guard.rotation.x = Math.PI / 2;
        place(guard, { x: px, y: 0.1, z: pz }, cfg.delay, { x: offX, y: 0, z: offZ });

        const bumperGeo = new THREE.TorusGeometry(guardRadius + 0.01, 0.01, 8, 48);
        const bumper = new THREE.Mesh(bumperGeo, metallicDarkGrey);
        bumper.rotation.x = Math.PI / 2;
        place(bumper, { x: px, y: 0.1, z: pz }, cfg.delay + 0.1, { x: offX, y: 0, z: offZ });

        const strutGeo = new THREE.BoxGeometry(0.04, 0.02, guardRadius * 2);
        const strut1 = new THREE.Mesh(strutGeo, metallicGrey);
        strut1.rotation.y = Math.PI / 4;
        place(strut1, { x: px, y: 0.05, z: pz }, cfg.delay + 0.2, { x: offX, y: -2, z: offZ });

        const strut2 = new THREE.Mesh(strutGeo, metallicGrey);
        strut2.rotation.y = -Math.PI / 4;
        place(strut2, { x: px, y: 0.05, z: pz }, cfg.delay + 0.2, { x: offX, y: -2, z: offZ });

        const motorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 24);
        const motor = new THREE.Mesh(motorGeo, metallicDarkGrey);
        place(motor, { x: px, y: 0.06, z: pz }, cfg.delay + 0.3, { x: offX, y: 2, z: offZ });

        const motorTopGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 24);
        const motorTop = new THREE.Mesh(motorTopGeo, brushedSteel);
        place(motorTop, { x: px, y: 0.13, z: pz }, cfg.delay + 0.4, { x: offX, y: 2, z: offZ });

        // Propeller Group
        const propGroup = new THREE.Group();
        const bladeCount = 5;
        
        for(let b=0; b<bladeCount; b++) {
            const bladeGeo = new THREE.BoxGeometry(guardRadius * 0.88, 0.005, 0.07, 4, 1, 1);
            const posAttr = bladeGeo.attributes.position;
            for(let j=0; j<posAttr.count; j++) {
                const x = posAttr.getX(j);
                const z = posAttr.getZ(j);
                posAttr.setY(j, posAttr.getY(j) + x * z * 0.7);
            }
            bladeGeo.computeVertexNormals();

            const blade = new THREE.Mesh(bladeGeo, blackMetal.clone());
            blade.material.transparent = true;
            blade.material.opacity = 0;
            blade.userData.targetOpacity = 1.0;
            blade.geometry.translate(guardRadius * 0.44, 0, 0); 
            
            const angle = (b / bladeCount) * Math.PI * 2;
            blade.rotation.y = angle;
            
            propGroup.add(blade);
        }

        const hubGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
        const hub = new THREE.Mesh(hubGeo, brushedSteel.clone());
        hub.material.transparent = true;
        hub.material.opacity = 0;
        hub.userData.targetOpacity = 1.0;
        propGroup.add(hub);

        propGroup.userData.isPropeller = true;
        propGroup.userData.spinDir = (cfg.x * cfg.z > 0) ? 1 : -1;

        propGroup.position.set(px + offX, 0.14 + 5, pz + offZ);
        droneGroup.add(propGroup);

        droneParts.push({
            mesh: propGroup,
            targetPos: { x: px, y: 0.14, z: pz },
            startPos: { x: px + offX, y: 0.14 + 5, z: pz + offZ },
            delay: cfg.delay + 0.5,
            isGroup: true
        });
    });
}

function createParticles() {
    const count = 100;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        sizes[i] = Math.random() * 2 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.012,
        transparent: true,
        opacity: 0.3,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(geo, mat);
    particles.userData.isParticles = true;
    scene.add(particles);
}

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function updateAssembly(time) {
    let allDone = true;
    const assemblySpeed = 1.8;

    droneParts.forEach(part => {
        // Calculate progress based on time and individual delay
        let progress = (time * assemblySpeed) - part.delay;
        progress = Math.max(0, Math.min(1, progress));
        
        if (progress < 1) allDone = false;

        const eased = easeOutCubic(progress);

        // Position Lerp
        part.mesh.position.x = part.startPos.x + (part.targetPos.x - part.startPos.x) * eased;
        part.mesh.position.y = part.startPos.y + (part.targetPos.y - part.startPos.y) * eased;
        part.mesh.position.z = part.startPos.z + (part.targetPos.z - part.startPos.z) * eased;

        // Opacity fade in
        if (part.isGroup) {
            part.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = (child.userData.targetOpacity || 1.0) * eased;
                }
            });
        } else {
            if (part.mesh.material) {
                part.mesh.material.opacity = (part.mesh.userData.targetOpacity || 1.0) * eased;
            }
        }
    });

    // Animate glow light intensity
    if (glowLight) {
        let globalProgress = Math.max(0, Math.min(1, time / ASSEMBLY_DURATION));
        glowLight.intensity = globalProgress * 1.5;
    }

    if (allDone && time > ASSEMBLY_DURATION) {
        assemblyComplete = true;
        
        // Final cleanup: set materials to non-transparent if targetOpacity is 1
        droneParts.forEach(part => {
            if (part.isGroup) {
                part.mesh.children.forEach(child => {
                    if (child.material && child.userData.targetOpacity === 1.0) {
                        child.material.transparent = false;
                        child.material.needsUpdate = true;
                    }
                });
            } else {
                if (part.mesh.material && part.mesh.userData.targetOpacity === 1.0) {
                    part.mesh.material.transparent = false;
                    part.mesh.material.needsUpdate = true;
                }
            }
        });
    }
}

function updateIdle(time) {
    // Propeller spin
    droneParts.forEach(part => {
        if (part.mesh.userData && part.mesh.userData.isPropeller) {
            // Spin slowly during assembly, extremely fast when flying
            const spinSpeed = assemblyComplete ? 1.0 : 0.2;
            part.mesh.rotation.y += spinSpeed * part.mesh.userData.spinDir;
        }
    });

    if (assemblyComplete) {
        // Active hover float
        if (!isUserInteracting) {
            droneGroup.position.y = Math.sin(time * 2.0) * 0.06;
            droneGroup.position.x = Math.sin(time * 1.2) * 0.02;

            currentRotation.x += (-0.15 - currentRotation.x) * 0.03;
            currentRotation.y += (0.2 - currentRotation.y) * 0.03;
        } else {
            currentRotation.x += velocity.y * 0.005;
            currentRotation.y += velocity.x * 0.005;

            velocity.x *= 0.88;
            velocity.y *= 0.88;
        }

        currentRotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, currentRotation.x));

        droneGroup.rotation.x = currentRotation.x;
        droneGroup.rotation.y = currentRotation.y;

        if (glowLight) {
            glowLight.intensity = 1.0 + Math.sin(time * 4.0) * 0.2;
        }
    } else {
        // Gentle rotation during assembly
        droneGroup.rotation.y = Math.sin(time * 0.5) * 0.1 + 0.2;
        droneGroup.rotation.x = -0.15;
    }
}

function updateParticles(time) {
    if (!assemblyComplete) return; // Only fly past when assembled

    scene.children.forEach(child => {
        if (child.userData && child.userData.isParticles) {
            const positions = child.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += 0.02; 
                if (positions[i + 2] > 5) positions[i + 2] = -5;
                positions[i + 1] += Math.sin(time * 2.0 + i) * 0.001;
            }
            child.geometry.attributes.position.needsUpdate = true;
        }
    });
}

function setupInteraction(container) {
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', (e) => {
        if (!assemblyComplete) return;
        mouseDown = true;
        isUserInteracting = true;
        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;
        canvas.style.cursor = 'grabbing';
        clearTimeout(interactionTimeout);
    });

    window.addEventListener('mousemove', (e) => {
        if (!mouseDown || !assemblyComplete) return;
        velocity.x = e.clientX - prevMouse.x;
        velocity.y = e.clientY - prevMouse.y;
        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        mouseDown = false;
        canvas.style.cursor = 'grab';
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
            isUserInteracting = false;
        }, 1500);
    });

    canvas.addEventListener('touchstart', (e) => {
        if (!assemblyComplete) return;
        isUserInteracting = true;
        prevMouse.x = e.touches[0].clientX;
        prevMouse.y = e.touches[0].clientY;
        clearTimeout(interactionTimeout);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (!assemblyComplete) return;
        velocity.x = e.touches[0].clientX - prevMouse.x;
        velocity.y = e.touches[0].clientY - prevMouse.y;
        prevMouse.x = e.touches[0].clientX;
        prevMouse.y = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
            isUserInteracting = false;
        }, 1500);
    });
}

function onResize(container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (!assemblyComplete) {
        updateAssembly(time);
    }
    
    updateIdle(time);
    updateParticles(time);

    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', initHero3D);
