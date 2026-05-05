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
    // Soft sky light for natural depth
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 6, 8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaabbcc, 1.2);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 3.0, 30);
    rimLight.position.set(-6, 4, -8);
    scene.add(rimLight);

    glowLight = new THREE.PointLight(0xff6b00, 0, 10);
    glowLight.position.set(0, -0.5, 1.5);
    scene.add(glowLight);
}

function createMaterial(color, metalness, roughness) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        emissive: new THREE.Color(color).multiplyScalar(0.02)
    });
}

function buildDrone() {
    droneGroup = new THREE.Group();
    scene.add(droneGroup);

    // Realistic Industrial Palette
    const metallicGrey = createMaterial(0x333336, 0.95, 0.15); 
    const metallicDarkGrey = createMaterial(0x1a1a1c, 0.85, 0.25);
    const brushedSteel = createMaterial(0x88888b, 0.95, 0.1);
    const blackMetal = createMaterial(0x050505, 0.9, 0.35);
    const glassMat = createMaterial(0x000000, 1.0, 0.0);
    glassMat.transparent = true;
    glassMat.opacity = 0;

    const place = (mesh, targetPos, delay, explodedOffset) => {
        const startPos = {
            x: targetPos.x + explodedOffset.x,
            y: targetPos.y + explodedOffset.y,
            z: targetPos.z + explodedOffset.z
        };
        mesh.position.set(startPos.x, startPos.y, startPos.z);
        mesh.material = mesh.material.clone();
        mesh.material.transparent = true;
        mesh.material.opacity = 0;
        mesh.userData.targetOpacity = (mesh.material === glassMat) ? 0.8 : 1.0;
        droneGroup.add(mesh);
        droneParts.push({ mesh, targetPos, startPos, delay, isGroup: false });
    };

    // --- MAIN CHASSIS (Sleek Modular Design) ---
    const lowerBodyGeo = new THREE.SphereGeometry(0.2, 32, 16);
    lowerBodyGeo.scale(1.2, 0.4, 2.2);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, metallicGrey);
    place(lowerBody, { x: 0, y: 0.1, z: 0 }, 0.0, { x: 0, y: 5, z: 0 });

    const upperBodyGeo = new THREE.SphereGeometry(0.18, 32, 16);
    upperBodyGeo.scale(1.1, 0.35, 1.8);
    const upperBody = new THREE.Mesh(upperBodyGeo, metallicDarkGrey);
    place(upperBody, { x: 0, y: 0.2, z: -0.1 }, 0.3, { x: 0, y: 5, z: -2 });

    // GPS Module (The "Puck")
    const gpsGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 32);
    const gps = new THREE.Mesh(gpsGeo, blackMetal);
    place(gps, { x: 0, y: 0.28, z: -0.4 }, 0.6, { x: 0, y: 5, z: -3 });

    // Heat Vents (Small details)
    const ventGeo = new THREE.BoxGeometry(0.12, 0.02, 0.05);
    for(let i=0; i<3; i++) {
        const vent = new THREE.Mesh(ventGeo, blackMetal);
        place(vent, { x: 0, y: 0.22, z: -0.1 + (i*0.1) }, 0.8 + (i*0.1), { x: 0, y: 2, z: 0 });
    }

    // --- GIMBAL & CAMERA ---
    const gimbalBaseGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
    const gimbalBase = new THREE.Mesh(gimbalBaseGeo, blackMetal);
    place(gimbalBase, { x: 0, y: 0.02, z: 0.4 }, 1.0, { x: 0, y: -2, z: 3 });

    const camHousingGeo = new THREE.SphereGeometry(0.12, 24, 24);
    const camHousing = new THREE.Mesh(camHousingGeo, blackMetal);
    place(camHousing, { x: 0, y: -0.05, z: 0.45 }, 1.2, { x: 0, y: -2, z: 4 });

    const lensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 32);
    const lens = new THREE.Mesh(lensGeo, glassMat);
    lens.rotation.x = Math.PI / 2;
    place(lens, { x: 0, y: -0.05, z: 0.55 }, 1.4, { x: 0, y: -2, z: 5 });
    droneParts[droneParts.length-1].mesh.userData.targetOpacity = 0.9;

    // --- ARMS & PROPULSION ---
    const armConfigs = [
        { x: 1, z: 1, delay: 1.6, ox: 5, oz: 5 },
        { x: -1, z: 1, delay: 1.8, ox: -5, oz: 5 },
        { x: 1, z: -1, delay: 2.0, ox: 5, oz: -5 },
        { x: -1, z: -1, delay: 2.2, ox: -5, oz: -5 }
    ];

    armConfigs.forEach(cfg => {
        const px = cfg.x * 0.4;
        const pz = cfg.z * 0.45;
        
        // Motor Arm
        const armGeo = new THREE.BoxGeometry(0.08, 0.04, 0.5);
        const arm = new THREE.Mesh(armGeo, metallicGrey);
        arm.rotation.y = Math.atan2(px, pz);
        place(arm, { x: px/2, y: 0.12, z: pz/2 }, cfg.delay, { x: cfg.ox, y: 0, z: cfg.oz });

        // Motor
        const motorGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 24);
        const motor = new THREE.Mesh(motorGeo, metallicDarkGrey);
        place(motor, { x: px, y: 0.15, z: pz }, cfg.delay + 0.2, { x: cfg.ox, y: 2, z: cfg.oz });

        // Propellers
        const propGroup = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(0.45, 0.005, 0.04);
        const blade1 = new THREE.Mesh(bladeGeo, blackMetal.clone());
        const blade2 = new THREE.Mesh(bladeGeo, blackMetal.clone());
        blade2.rotation.y = Math.PI / 2;
        
        [blade1, blade2].forEach(b => {
            b.material.transparent = true;
            b.material.opacity = 0;
            b.userData.targetOpacity = 0.8;
            propGroup.add(b);
        });

        propGroup.userData.isPropeller = true;
        propGroup.userData.spinDir = (cfg.x * cfg.z > 0) ? 1 : -1;
        
        propGroup.position.set(px + cfg.ox, 0.22 + 5, pz + cfg.oz);
        droneGroup.add(propGroup);
        droneParts.push({ mesh: propGroup, targetPos: { x: px, y: 0.22, z: pz }, startPos: { x: px + cfg.ox, y: 0.22 + 5, z: pz + cfg.oz }, delay: cfg.delay + 0.4, isGroup: true });
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
