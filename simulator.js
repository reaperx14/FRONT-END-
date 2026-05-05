/**
 * SKY NEX Drone Simulator
 * Powered by Three.js
 */

class DroneSimulator {
    constructor() {
        this.container = document.getElementById('sim-canvas-container');
        this.isActive = false;
        this.mode = 'intermediate'; // learner, intermediate, expert
        
        // Physics constants
        this.physics = {
            gravity: 9.8,
            thrust: 0,
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            tilt: { x: 0, z: 0 },
            damping: 0.98,
            maxSpeed: 40,
            isCrashed: false
        };

        // Mode settings
        this.modeSettings = {
            learner: { stabilization: 0.95, speed: 0.5, tiltMax: 0.15, wind: 0 },
            intermediate: { stabilization: 0.6, speed: 1.0, tiltMax: 0.3, wind: 0.02 },
            expert: { stabilization: 0.1, speed: 1.8, tiltMax: 0.6, wind: 0.05 }
        };

        this.keys = {};
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.Fog(0x050505, 50, 200);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xff6b00, 0.8);
        directionalLight.position.set(50, 100, 50);
        this.scene.add(directionalLight);

        this.createEnvironment();
        this.createDrone();
        this.setupControls();
        
        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    createEnvironment() {
        // Ground
        const grid = new THREE.GridHelper(1000, 100, 0xff6b00, 0x222222);
        this.scene.add(grid);

        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        this.scene.add(ground);

        // Obstacles (Neon Pillars & Rings)
        for (let i = 0; i < 40; i++) {
            const h = 5 + Math.random() * 25;
            const geo = new THREE.BoxGeometry(2, h, 2);
            const mat = new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0xff6b00, emissiveIntensity: 0.2 });
            const pillar = new THREE.Mesh(geo, mat);
            pillar.position.set(
                (Math.random() - 0.5) * 300,
                h / 2,
                (Math.random() - 0.5) * 300
            );
            this.scene.add(pillar);

            // Add some "rings" to fly through
            if (i % 5 === 0) {
                const ringGeo = new THREE.TorusGeometry(4, 0.2, 16, 32);
                const ring = new THREE.Mesh(ringGeo, mat);
                ring.position.set(
                    (Math.random() - 0.5) * 200,
                    5 + Math.random() * 15,
                    (Math.random() - 0.5) * 200
                );
                ring.rotation.y = Math.random() * Math.PI;
                this.scene.add(ring);
            }
        }
    }

    createDrone() {
        this.drone = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.drone.add(body);

        // Arms & Rotors
        const armGeo = new THREE.BoxGeometry(1.5, 0.05, 0.05);
        const arm1 = new THREE.Mesh(armGeo, bodyMat);
        arm1.rotation.y = Math.PI / 4;
        this.drone.add(arm1);
        
        const arm2 = new THREE.Mesh(armGeo, bodyMat);
        arm2.rotation.y = -Math.PI / 4;
        this.drone.add(arm2);

        this.rotors = [];
        const rotorGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.01, 16);
        const rotorMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
        
        const positions = [
            {x: 0.5, z: 0.5}, {x: -0.5, z: 0.5},
            {x: 0.5, z: -0.5}, {x: -0.5, z: -0.5}
        ];

        positions.forEach(pos => {
            const rotor = new THREE.Mesh(rotorGeo, rotorMat);
            rotor.position.set(pos.x, 0.15, pos.z);
            this.drone.add(rotor);
            this.rotors.push(rotor);
        });

        this.scene.add(this.drone);
        this.drone.position.y = 1;
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updatePhysics(dt) {
        if (!this.isActive || this.physics.isCrashed) return;

        const settings = this.modeSettings[this.mode];
        const moveForce = 25 * settings.speed;
        const rotateSpeed = 2.5;
        const liftForce = 15;

        // Input Handling
        let targetTiltX = 0;
        let targetTiltZ = 0;

        if (this.keys['KeyW']) targetTiltX = settings.tiltMax;
        if (this.keys['KeyS']) targetTiltX = -settings.tiltMax;
        if (this.keys['KeyA']) targetTiltZ = settings.tiltMax;
        if (this.keys['KeyD']) targetTiltZ = -settings.tiltMax;

        // Altitude
        if (this.keys['ArrowUp']) this.physics.velocity.y += liftForce * dt;
        if (this.keys['ArrowDown']) this.physics.velocity.y -= liftForce * dt;

        // Rotation (Yaw)
        if (this.keys['KeyQ']) this.drone.rotation.y += rotateSpeed * dt;
        if (this.keys['KeyE']) this.drone.rotation.y -= rotateSpeed * dt;

        // Apply Smoothing (Stabilization)
        this.physics.tilt.x = THREE.MathUtils.lerp(this.physics.tilt.x, targetTiltX, 0.1);
        this.physics.tilt.z = THREE.MathUtils.lerp(this.physics.tilt.z, targetTiltZ, 0.1);

        // Calculate Directional Thrust
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.drone.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.drone.quaternion);

        this.physics.velocity.addScaledVector(forward, targetTiltX * moveForce * dt);
        this.physics.velocity.addScaledVector(right, -targetTiltZ * moveForce * dt);

        // Gravity & Damping
        this.physics.velocity.y -= this.physics.gravity * dt;
        this.physics.velocity.multiplyScalar(this.physics.damping);

        // Apply Transformation
        this.drone.position.addScaledVector(this.physics.velocity, dt);
        
        // Tilt Visuals
        this.drone.rotation.x = this.physics.tilt.x;
        this.drone.rotation.z = this.physics.tilt.z;

        // Wind Effect
        if (settings.wind > 0) {
            this.drone.position.x += Math.sin(Date.now() * 0.001) * settings.wind;
        }

        // Constraints & Collisions
        if (this.drone.position.y < 0.2) {
            if (this.physics.velocity.length() > 5 && this.mode === 'expert') {
                this.crash();
            } else {
                this.drone.position.y = 0.2;
                this.physics.velocity.y = 0;
            }
        }

        // Boundary
        if (this.drone.position.length() > 200) {
            this.drone.position.setLength(200);
        }

        this.updateHUD();
        this.updateCamera();
    }

    updateCamera() {
        const offset = new THREE.Vector3(0, 3, 8).applyQuaternion(this.drone.quaternion);
        const targetPos = this.drone.position.clone().add(offset);
        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.drone.position);
    }

    updateHUD() {
        document.getElementById('hud-alt').textContent = this.drone.position.y.toFixed(1);
        const speedKmh = (this.physics.velocity.length() * 3.6).toFixed(1);
        document.getElementById('hud-speed').textContent = speedKmh;
        
        const battery = Math.max(0, 98 - (performance.now() / 10000)).toFixed(0);
        document.getElementById('hud-battery').textContent = battery + '%';
    }

    crash() {
        this.physics.isCrashed = true;
        document.getElementById('crashScreen').style.display = 'block';
    }

    reset() {
        this.drone.position.set(0, 1, 0);
        this.drone.rotation.set(0, 0, 0);
        this.physics.velocity.set(0, 0, 0);
        this.physics.isCrashed = false;
        document.getElementById('crashScreen').style.display = 'none';
    }

    start(mode) {
        this.mode = mode;
        this.isActive = true;
        this.reset();
        document.getElementById('modeSelectScreen').style.display = 'none';
        document.getElementById('simHud').style.display = 'flex';
    }

    stop() {
        this.isActive = false;
        document.getElementById('simOverlay').classList.remove('active');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const dt = 0.016; // 60fps
        this.updatePhysics(dt);

        // Spin rotors
        if (this.isActive && !this.physics.isCrashed) {
            this.rotors.forEach(r => r.rotation.y += 0.5);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const sim = new DroneSimulator();
    
    const launchBtn = document.getElementById('launchSimBtn');
    const overlay = document.getElementById('simOverlay');
    const closeBtn = document.getElementById('closeSimBtn');
    const resetBtn = document.getElementById('resetSimBtn');
    const restartBtn = document.getElementById('restartAfterCrash');

    launchBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        document.getElementById('modeSelectScreen').style.display = 'block';
        document.getElementById('simHud').style.display = 'none';
    });

    closeBtn.addEventListener('click', () => sim.stop());
    resetBtn.addEventListener('click', () => sim.reset());
    restartBtn.addEventListener('click', () => sim.reset());

    document.querySelectorAll('.btn-start-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.closest('.mode-card').dataset.mode;
            sim.start(mode);
        });
    });

    // Simple Hero Animation for the Promo Section
    initSimHero();
});

function initSimHero() {
    const container = document.getElementById('sim-hero-canvas');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xff6b00, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Simple Drone Placeholder
    const drone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshPhongMaterial({color: 0x222222}));
    drone.add(body);
    scene.add(drone);

    function animate() {
        requestAnimationFrame(animate);
        drone.rotation.y += 0.01;
        drone.position.y = Math.sin(Date.now() * 0.002) * 0.2;
        renderer.render(scene, camera);
    }
    animate();
}
