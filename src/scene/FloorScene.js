import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AgentAvatar } from './AgentAvatar.js';

export class FloorScene {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05080d);
        
        // Camera - PerspectiveCamera fov=35
        this.camera = new THREE.PerspectiveCamera(
            35, // FOV as specified
            this.width / this.height,
            0.1,
            200
        );
        
        // Camera position (20, 25, 20), target (0, 0, 0) as specified
        this.cameraPosition = new THREE.Vector3(20, 25, 20);
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.camera.position.copy(this.cameraPosition);
        this.camera.lookAt(this.cameraTarget);
        
        // OrbitControls with enableDamping
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 60;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        
        // Camera follow settings
        this.followEnabled = true;
        this.followLerp = 0.05;
        this.followOffset = new THREE.Vector3(0, 2, 0); // Look slightly above avatar
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);
        
        // Workstations
        this.workstations = [];
        this.workstationData = [
            { id: 'command-desk', name: 'Command Desk', position: new THREE.Vector3(0, 0, 0), color: 0x64b4ff, type: 'hub' },
            { id: 'planning-desk', name: 'Planning Desk', position: new THREE.Vector3(-6, 0, -4), color: 0xfbbf24, type: 'planning' },
            { id: 'nemotron-station', name: 'Nemotron Station', position: new THREE.Vector3(6, 0, -4), color: 0x64b4ff, type: 'model' },
            { id: 'mimo-station', name: 'MiMo Station', position: new THREE.Vector3(-6, 0, 4), color: 0x22d39a, type: 'model' },
            { id: 'openrouter-station', name: 'OpenRouter Station', position: new THREE.Vector3(6, 0, 4), color: 0xa855f7, type: 'model' },
            { id: 'browser-station', name: 'Browser Station', position: new THREE.Vector3(-9, 0, -8), color: 0x22d3ee, type: 'tool' },
            { id: 'terminal-station', name: 'Terminal Station', position: new THREE.Vector3(9, 0, -8), color: 0xfb923c, type: 'tool' },
            { id: 'coding-station', name: 'Coding Station', position: new THREE.Vector3(-9, 0, 8), color: 0xa855f7, type: 'tool' },
            { id: 'files-station', name: 'Files Station', position: new THREE.Vector3(0, 0, 8), color: 0x64b4ff, type: 'tool' },
            { id: 'memory-station', name: 'Memory Station', position: new THREE.Vector3(9, 0, 8), color: 0x22d3ee, type: 'tool' },
            { id: 'testing-station', name: 'Testing Station', position: new THREE.Vector3(0, 0, -8), color: 0xf87171, type: 'tool' },
        ];
        
        // Avatar
        this.avatar = new AgentAvatar();
        this.scene.add(this.avatar.getMesh());
        
        // Grid and floor
        this.gridHelper = null;
        this.floorMesh = null;
        
        // Lights
        this.lights = [];
        
        // Animation
        this.time = 0;
        this.clock = new THREE.Clock();
        
        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredStation = null;
        
        // Station label sprites (HTML overlay approach)
        this.stationLabels = new Map();
        
        this.init();
    }
    
    init() {
        this.createFloor();
        this.createGrid();
        this.createWorkstations();
        this.createLights();
        this.createStationLabels();
        this.setupEventListeners();
        this.frameScene();
    }
    
    createFloor() {
        // Main floor plane
        const floorGeometry = new THREE.PlaneGeometry(40, 40);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0f1a,
            metalness: 0.1,
            roughness: 0.9,
            side: THREE.DoubleSide,
        });
        this.floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.receiveShadow = true;
        this.scene.add(this.floorMesh);
        
        // Subtle glow at center
        const glowGeometry = new THREE.PlaneGeometry(8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x64b4ff,
            transparent: true,
            opacity: 0.03,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.01;
        this.scene.add(glow);
        this.centerGlow = glow;
    }
    
    createGrid() {
        // Main grid
        const gridSize = 40;
        const gridDivisions = 40;
        this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x64b4ff, 0x111827);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.15;
        this.gridHelper.position.y = 0.02;
        this.scene.add(this.gridHelper);
        
        // Accent grid lines (every 5 units)
        const accentGrid = new THREE.GridHelper(40, 8, 0x64b4ff, 0x64b4ff);
        accentGrid.material.transparent = true;
        accentGrid.material.opacity = 0.08;
        accentGrid.position.y = 0.03;
        this.scene.add(accentGrid);
        this.accentGrid = accentGrid;
    }
    
    createWorkstations() {
        this.workstationData.forEach(data => {
            const station = this.createWorkstation(data);
            this.workstations.push(station);
            this.scene.add(station.group);
        });
    }
    
    createWorkstation(data) {
        const group = new THREE.Group();
        group.name = data.id;
        group.position.copy(data.position);
        group.userData = { ...data };
        
        const isHub = data.type === 'hub';
        const isModel = data.type === 'model';
        const isTool = data.type === 'tool';
        
        const baseColor = new THREE.Color(data.color);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: baseColor,
            metalness: isHub ? 0.7 : 0.5,
            roughness: isHub ? 0.2 : 0.4,
            emissive: baseColor.clone().multiplyScalar(0.15),
            emissiveIntensity: isHub ? 0.5 : 0.3,
        });
        
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0f1a,
            metalness: 0.3,
            roughness: 0.7,
        });
        
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            metalness: 0,
            roughness: 0.1,
            transmission: 0.8,
            thickness: 0.5,
            transparent: true,
            opacity: 0.6,
        });
        
        // Base platform
        const baseSize = isHub ? 2.5 : isModel ? 2 : 1.5;
        const baseGeometry = new THREE.CylinderGeometry(baseSize, baseSize, 0.15, 16);
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.075;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Center pillar (varies by type)
        if (isHub) {
            // Command Desk - central tower with hologram
            const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.6, 2.5, 16);
            const pillar = new THREE.Mesh(pillarGeometry, baseMaterial);
            pillar.position.y = 1.325;
            pillar.castShadow = true;
            group.add(pillar);
            
            // Hologram projector
            const projectorGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
            const projector = new THREE.Mesh(projectorGeometry, glassMaterial);
            projector.position.y = 2.6;
            group.add(projector);
            
            // Hologram beam
            const beamGeometry = new THREE.CylinderGeometry(0.25, 0.15, 3, 16);
            const beamMaterial = new THREE.MeshBasicMaterial({
                color: 0x64b4ff,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.y = 4.3;
            group.add(beam);
            this.hologramBeam = beam;
            
            // Orb at top
            const orbGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            const orb = new THREE.Mesh(orbGeometry, glassMaterial);
            orb.position.y = 5.8;
            group.add(orb);
            this.commandOrb = orb;
            
        } else if (isModel) {
            // Model stations - server rack style
            const rackGeometry = new THREE.BoxGeometry(1.6, 2.8, 1.2);
            const rack = new THREE.Mesh(rackGeometry, darkMaterial);
            rack.position.y = 1.5;
            rack.castShadow = true;
            group.add(rack);
            
            // LED strips
            for (let i = 0; i < 5; i++) {
                const ledGeometry = new THREE.BoxGeometry(1.4, 0.08, 0.08);
                const ledMaterial = new THREE.MeshBasicMaterial({
                    color: baseColor,
                    transparent: true,
                    opacity: 0.8,
                });
                const led = new THREE.Mesh(ledGeometry, ledMaterial);
                led.position.set(0, 0.3 + i * 0.5, 0.64);
                rack.add(led);
            }
            
            // Top display
            const displayGeometry = new THREE.BoxGeometry(1.4, 0.8, 0.1);
            const display = new THREE.Mesh(displayGeometry, glassMaterial);
            display.position.y = 3.05;
            group.add(display);
            
        } else {
            // Tool stations - workbench style
            const benchGeometry = new THREE.BoxGeometry(1.8, 0.3, 1.4);
            const bench = new THREE.Mesh(benchGeometry, darkMaterial);
            bench.position.y = 0.15;
            bench.castShadow = true;
            group.add(bench);
            
            // Legs
            for (let x of [-0.7, 0.7]) {
                for (let z of [-0.5, 0.5]) {
                    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
                    const leg = new THREE.Mesh(legGeometry, baseMaterial);
                    leg.position.set(x, 0.65, z);
                    leg.castShadow = true;
                    group.add(leg);
                }
            }
            
            // Monitor
            const monitorGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.08);
            const monitor = new THREE.Mesh(monitorGeometry, glassMaterial);
            monitor.position.set(0, 1.1, -0.4);
            group.add(monitor);
            
            // Stand
            const standGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
            const stand = new THREE.Mesh(standGeometry, baseMaterial);
            stand.position.set(0, 0.65, -0.4);
            group.add(stand);
        }
        
        // Connection line to center (for non-hub stations)
        if (!isHub) {
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array([
                0, 0.1, 0,
                -data.position.x * 0.8, 0.1, -data.position.z * 0.8
            ]);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                color: baseColor,
                transparent: true,
                opacity: 0.2,
                linewidth: 1,
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
        }
        
        // Status indicator
        const indicatorGeometry = new THREE.RingGeometry(0.3, 0.45, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = isHub ? 0.2 : 0.15;
        group.add(indicator);
        group.userData.indicator = indicator;
        
        // Active pulse ring
        const pulseGeometry = new THREE.RingGeometry(baseSize * 0.6, baseSize * 0.8, 32);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulseRing.rotation.x = -Math.PI / 2;
        pulseRing.position.y = 0.12;
        group.add(pulseRing);
        group.userData.pulseRing = pulseRing;
        
        return { group, ...data };
    }
    
    createLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(ambient);
        this.lights.push(ambient);
        
        // Main directional light (simulating sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(15, 25, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.bias = -0.001;
        dirLight.shadow.normalBias = 0.02;
        this.scene.add(dirLight);
        this.lights.push(dirLight);
        this.dirLight = dirLight;
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x64b4ff, 0.3);
        fillLight.position.set(-10, 10, -15);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xa855f7, 0.2);
        rimLight.position.set(0, 5, -20);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
        
        // Point lights at each model station
        this.workstationData
            .filter(w => w.type === 'model')
            .forEach(data => {
                const pointLight = new THREE.PointLight(data.color, 0.5, 8, 2);
                pointLight.position.copy(data.position);
                pointLight.position.y = 3;
                pointLight.castShadow = true;
                pointLight.shadow.mapSize.width = 512;
                pointLight.shadow.mapSize.height = 512;
                this.scene.add(pointLight);
                this.lights.push(pointLight);
            });
        
        // Center point light
        const centerLight = new THREE.PointLight(0x64b4ff, 0.8, 15, 2);
        centerLight.position.set(0, 4, 0);
        centerLight.castShadow = true;
        this.scene.add(centerLight);
        this.lights.push(centerLight);
        this.centerLight = centerLight;
    }
    
    createStationLabels() {
        // Create HTML labels for each station
        this.workstationData.forEach(data => {
            const label = document.createElement('div');
            label.className = 'station-label';
            label.textContent = data.name;
            label.style.cssText = `
                position: absolute;
                pointer-events: none;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 11px;
                font-weight: 500;
                color: #64b4ff;
                text-shadow: 0 0 8px #64b4ff, 0 0 16px #64b4ff;
                white-space: nowrap;
                transform: translate(-50%, -100%);
                transition: opacity 0.2s, transform 0.2s;
                opacity: 0.8;
                z-index: 10;
                padding: 2px 8px;
                border-radius: 4px;
                background: rgba(10, 15, 26, 0.8);
                border: 1px solid rgba(100, 180, 255, 0.3);
                backdrop-filter: blur(8px);
            `;
            label.dataset.stationId = data.id;
            this.container.appendChild(label);
            this.stationLabels.set(data.id, label);
        });
    }
    
    updateLabels() {
        this.stationLabels.forEach((label, id) => {
            const station = this.workstations.find(w => w.id === id);
            if (!station) return;
            
            // Project 3D position to 2D screen
            const vector = new THREE.Vector3();
            vector.copy(station.position);
            vector.y += 3.5; // Above station
            vector.project(this.camera);
            
            const x = (vector.x * 0.5 + 0.5) * this.width;
            const y = (-vector.y * 0.5 + 0.5) * this.height;
            
            // Check if behind camera
            if (vector.z > 1) {
                label.style.opacity = '0';
                label.style.pointerEvents = 'none';
            } else {
                label.style.opacity = '0.8';
                label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
            }
            
            // Highlight active station
            if (station.id === this.avatar.currentStation || station.id === this.avatar.targetStation) {
                label.style.borderColor = station.color;
                label.style.boxShadow = `0 0 12px ${station.color}`;
                label.style.fontWeight = '600';
            } else {
                label.style.borderColor = 'rgba(100, 180, 255, 0.3)';
                label.style.boxShadow = 'none';
                label.style.fontWeight = '500';
            }
        });
    }
    
    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => this.onResize());
        
        // Mouse move for hover
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Click for station info
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    }
    
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.height) * 2 + 1;
    }
    
    onClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const stationMeshes = this.workstations.flatMap(w => {
            const meshes = [];
            w.group.traverse(child => {
                if (child.isMesh) meshes.push(child);
            });
            return meshes;
        });
        
        const intersects = this.raycaster.intersectObjects(stationMeshes);
        if (intersects.length > 0) {
            let station = intersects[0].object;
            while (station.parent && station.parent !== this.scene) {
                station = station.parent;
            }
            if (station.userData && station.userData.id) {
                this.showStationInfo(station.userData);
            }
        }
    }
    
    showStationInfo(data) {
        // Dispatch custom event for UI to handle
        const event = new CustomEvent('station-clicked', { detail: data });
        window.dispatchEvent(event);
    }
    
    onResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Update OrbitControls target
        if (this.controls) {
            this.controls.target.copy(this.cameraTarget);
        }
        
        this.frameScene();
    }
    
    frameScene() {
        // Calculate bounds of all workstations
        const positions = this.workstationData.map(w => w.position);
        
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
        });
        
        // Add padding
        const padding = 4;
        minX -= padding; maxX += padding;
        minZ -= padding; maxZ += padding;
        
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const extentX = (maxX - minX) / 2;
        const extentZ = (maxZ - minZ) / 2;
        const maxExtent = Math.max(extentX, extentZ);
        
        // Calculate ideal camera distance for PerspectiveCamera
        // We want the scene to fill ~70% of the viewport
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        const viewHeight = 2 * Math.tan(fov / 2) * maxExtent;
        const viewWidth = viewHeight * aspect;
        
        // Distance needed to fit the scene
        const distance = maxExtent / Math.tan(fov / 2) / 0.7; // 70% fill
        
        // Isometric angle: 45 degrees around Y, ~35 degrees elevation
        const angle = Math.PI / 4; // 45 degrees
        const elevation = Math.PI / 5; // 36 degrees
        
        this.cameraTarget.set(centerX, 0, centerZ);
        this.cameraPosition.set(
            this.cameraTarget.x + distance * Math.sin(angle) * Math.cos(elevation),
            this.cameraTarget.y + distance * Math.sin(elevation),
            this.cameraTarget.z + distance * Math.cos(angle) * Math.cos(elevation)
        );
        
        // Smooth transition to new position
        this.targetCameraPosition = this.cameraPosition.clone();
        this.targetCameraTarget = this.cameraTarget.clone();
    }
    
    updateCameraFollow(delta) {
        if (!this.followEnabled) return;
        
        const avatarPos = this.avatar.group.position;
        const targetPos = avatarPos.clone().add(this.followOffset);
        
        // Smoothly interpolate camera target
        this.cameraTarget.lerp(targetPos, this.followLerp);
        
        // Maintain camera offset from target
        const offset = this.cameraPosition.clone().sub(this.targetCameraTarget || this.cameraTarget);
        this.cameraPosition.lerp(this.cameraTarget.clone().add(offset), this.followLerp * 0.5);
        
        this.camera.position.copy(this.cameraPosition);
        this.camera.lookAt(this.cameraTarget);
    }
    
    update(delta) {
        this.time += delta;
        
        // Update OrbitControls
        if (this.controls) {
            this.controls.update();
        }
        
        // Update avatar
        this.avatar.update(delta, this.time);
        
        // Update camera follow
        this.updateCameraFollow(delta);
        
        // Animate workstations
        this.workstations.forEach(station => {
            const time = this.time;
            const id = station.id;
            
            // Pulse ring animation
            if (station.group.userData.pulseRing) {
                const pulse = station.group.userData.pulseRing;
                const isActive = id === this.avatar.currentStation || id === this.avatar.targetStation;
                
                if (isActive) {
                    pulse.material.opacity = 0.3 + Math.sin(time * 4) * 0.2;
                    pulse.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
                    pulse.rotation.z += delta * 0.5;
                } else {
                    pulse.material.opacity *= 0.95;
                    pulse.scale.setScalar(1);
                }
            }
            
            // Indicator rotation
            if (station.group.userData.indicator) {
                station.group.userData.indicator.rotation.z += delta * (id === this.avatar.currentStation ? 2 : 0.5);
            }
            
            // Station-specific animations
            if (id === 'command-desk') {
                if (this.hologramBeam) {
                    this.hologramBeam.rotation.z += delta * 0.3;
                    this.hologramBeam.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;
                }
                if (this.commandOrb) {
                    this.commandOrb.position.y = 5.8 + Math.sin(time * 1.5) * 0.1;
                    this.commandOrb.rotation.y += delta * 0.2;
                }
            } else if (station.type === 'model') {
                // Model station LED pulse
                station.group.traverse(child => {
                    if (child.isMesh && child.material.color && child.material.color.equals(new THREE.Color(station.color))) {
                        child.material.opacity = 0.6 + Math.sin(time * 3 + station.position.x) * 0.3;
                    }
                });
            }
        });
        
        // Center glow pulse
        if (this.centerGlow) {
            this.centerGlow.material.opacity = 0.02 + Math.sin(this.time * 1.5) * 0.01;
            this.centerGlow.rotation.z += delta * 0.05;
        }
        
        // Grid animation
        if (this.gridHelper) {
            this.gridHelper.material.opacity = 0.1 + Math.sin(this.time * 0.5) * 0.05;
        }
        
        // Update labels
        this.updateLabels();
        
        // Update avatar status from agent state
        if (this.commandCenter && this.commandCenter.agentState) {
            const state = this.commandCenter.agentState.getState();
            this.avatar.setStatus(state.status);
            
            // Move avatar based on agent state
            if (state.targetPosition && state.targetPosition !== this.avatar.currentStation) {
                this.avatar.moveToStation(state.targetPosition);
            }
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    setCommandCenter(commandCenter) {
        this.commandCenter = commandCenter;
    }
    
    setFollowEnabled(enabled) {
        this.followEnabled = enabled;
    }
    
    dispose() {
        // Remove labels
        this.stationLabels.forEach(label => label.remove());
        this.stationLabels.clear();
        
        // Dispose Three.js resources
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        this.renderer.domElement.remove();
        
        window.removeEventListener('resize', () => this.onResize());
    }
}