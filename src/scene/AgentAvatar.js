import * as THREE from 'three';

export class AgentAvatar {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'AgentAvatar';
        
        this.currentStation = 'command-desk';
        this.targetStation = 'command-desk';
        this.isMoving = false;
        this.moveProgress = 0;
        this.moveDuration = 1.5; // seconds
        this.moveStartTime = 0;
        
        // Station positions (matching FloorScene workstation layout)
        this.stationPositions = {
            'command-desk': new THREE.Vector3(0, 0, 0),
            'planning-desk': new THREE.Vector3(-6, 0, -4),
            'nemotron-station': new THREE.Vector3(6, 0, -4),
            'mimo-station': new THREE.Vector3(-6, 0, 4),
            'openrouter-station': new THREE.Vector3(6, 0, 4),
            'browser-station': new THREE.Vector3(-9, 0, -8),
            'terminal-station': new THREE.Vector3(9, 0, -8),
            'coding-station': new THREE.Vector3(-9, 0, 8),
            'files-station': new THREE.Vector3(0, 0, 8),
            'memory-station': new THREE.Vector3(9, 0, 8),
            'testing-station': new THREE.Vector3(0, 0, -8),
        };
        
        this.buildAvatar();
        this.setPosition(this.stationPositions[this.currentStation]);
    }
    
    buildAvatar() {
        // Materials
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2332,
            metalness: 0.8,
            roughness: 0.2,
        });
        
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x64b4ff,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x64b4ff,
            emissiveIntensity: 0.3,
        });
        
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x64b4ff,
            transparent: true,
            opacity: 0.6,
        });
        
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0x64b4ff,
            transparent: true,
            opacity: 1,
        });
        
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0f1a,
            metalness: 0.6,
            roughness: 0.4,
        });
        
        // --- TORSO ---
        const torsoGeometry = new THREE.CapsuleGeometry(0.45, 0.7, 8, 16);
        const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
        torso.position.y = 0.85;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.group.add(torso);
        
        // Torso accent strip
        const torsoAccentGeometry = new THREE.CapsuleGeometry(0.47, 0.2, 8, 8);
        const torsoAccent = new THREE.Mesh(torsoAccentGeometry, accentMaterial);
        torsoAccent.position.y = 1.1;
        this.group.add(torsoAccent);
        
        // Core glow (center of torso)
        const coreGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        this.coreGlow = new THREE.Mesh(coreGeometry, glowMaterial.clone());
        this.coreGlow.position.y = 1.0;
        this.coreGlow.scale.set(0.8, 0.8, 0.8);
        this.group.add(this.coreGlow);
        
        // --- HEAD ---
        const headGeometry = new THREE.CapsuleGeometry(0.28, 0.35, 8, 16);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.position.y = 1.65;
        this.head.castShadow = true;
        this.group.add(this.head);
        
        // Face plate
        const faceGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
        const facePlate = new THREE.Mesh(faceGeometry, darkMaterial);
        facePlate.position.y = 1.7;
        facePlate.rotation.x = -Math.PI / 2;
        this.group.add(facePlate);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.1, 1.72, 0.26);
        this.group.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.1, 1.72, 0.26);
        this.group.add(this.rightEye);
        
        // Antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const antenna = new THREE.Mesh(antennaGeometry, accentMaterial);
        antenna.position.y = 2.0;
        this.group.add(antenna);
        
        const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), accentMaterial);
        antennaTip.position.y = 2.22;
        this.group.add(antennaTip);
        
        // --- ARMS ---
        this.arms = [];
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            
            // Upper arm
            const upperArmGeometry = new THREE.CapsuleGeometry(0.12, 0.4, 6, 12);
            const upperArm = new THREE.Mesh(upperArmGeometry, bodyMaterial);
            upperArm.position.set(side * 0.55, 1.2, 0);
            upperArm.rotation.z = side * -0.3;
            upperArm.castShadow = true;
            this.group.add(upperArm);
            
            // Lower arm
            const lowerArmGeometry = new THREE.CapsuleGeometry(0.1, 0.35, 6, 12);
            const lowerArm = new THREE.Mesh(lowerArmGeometry, bodyMaterial);
            lowerArm.position.set(side * 0.85, 0.7, 0);
            lowerArm.rotation.z = side * 0.2;
            lowerArm.castShadow = true;
            this.group.add(lowerArm);
            
            // Hand
            const handGeometry = new THREE.SphereGeometry(0.12, 8, 8);
            const hand = new THREE.Mesh(handGeometry, bodyMaterial);
            hand.position.set(side * 0.95, 0.4, 0);
            hand.castShadow = true;
            this.group.add(hand);
            
            this.arms.push({ upperArm, lowerArm, hand, side });
        }
        
        // --- LEGS ---
        this.legs = [];
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            
            // Thigh
            const thighGeometry = new THREE.CapsuleGeometry(0.14, 0.5, 6, 12);
            const thigh = new THREE.Mesh(thighGeometry, bodyMaterial);
            thigh.position.set(side * 0.25, 0.25, 0);
            thigh.castShadow = true;
            this.group.add(thigh);
            
            // Calf
            const calfGeometry = new THREE.CapsuleGeometry(0.11, 0.45, 6, 12);
            const calf = new THREE.Mesh(calfGeometry, bodyMaterial);
            calf.position.set(side * 0.25, -0.3, 0);
            calf.castShadow = true;
            this.group.add(calf);
            
            // Foot
            const footGeometry = new THREE.BoxGeometry(0.22, 0.08, 0.35);
            const foot = new THREE.Mesh(footGeometry, darkMaterial);
            foot.position.set(side * 0.25, -0.6, 0.05);
            foot.castShadow = true;
            this.group.add(foot);
            
            this.legs.push({ thigh, calf, foot, side });
        }
        
        // --- SHOULDER PADS ---
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            const shoulderGeometry = new THREE.CapsuleGeometry(0.25, 0.15, 8, 8);
            const shoulder = new THREE.Mesh(shoulderGeometry, accentMaterial);
            shoulder.position.set(side * 0.55, 1.4, 0);
            shoulder.rotation.z = side * 0.2;
            this.group.add(shoulder);
        }
        
        // --- STATUS INDICATOR RING ---
        const ringGeometry = new THREE.RingGeometry(0.6, 0.72, 32);
        this.statusRing = new THREE.Mesh(ringGeometry, accentMaterial.clone());
        this.statusRing.rotation.x = -Math.PI / 2;
        this.statusRing.position.y = -0.55;
        this.statusRing.material.transparent = true;
        this.statusRing.material.opacity = 0.4;
        this.group.add(this.statusRing);
        
        // Particle system for "thinking" effect
        this.particles = this.createParticles();
        this.group.add(this.particles);
        
        // Animation state
        this.idleTime = 0;
        this.bobOffset = 0;
    }
    
    createParticles() {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const alphas = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 1] = Math.random() * 2 + 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
            sizes[i] = Math.random() * 0.05 + 0.02;
            alphas[i] = Math.random() * 0.5 + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0x64b4ff,
            size: 0.05,
            transparent: true,
            opacity: 0.6,
            vertexColors: false,
            sizeAttenuation: true,
        });
        
        const points = new THREE.Points(geometry, material);
        points.visible = false;
        return points;
    }
    
    setPosition(position) {
        this.group.position.copy(position);
    }
    
    moveToStation(stationName) {
        if (!this.stationPositions[stationName]) {
            console.warn(`Unknown station: ${stationName}`);
            return;
        }
        
        this.targetStation = stationName;
        this.isMoving = true;
        this.moveProgress = 0;
        this.moveStartTime = performance.now() / 1000;
        this.particles.visible = true;
    }
    
    update(delta, time) {
        this.idleTime += delta;
        this.bobOffset = Math.sin(this.idleTime * 2) * 0.02;
        
        // Handle movement
        if (this.isMoving) {
            const elapsed = (performance.now() / 1000) - this.moveStartTime;
            this.moveProgress = Math.min(elapsed / this.moveDuration, 1);
            
            // Eased interpolation
            const eased = this.easeInOutCubic(this.moveProgress);
            
            const startPos = this.stationPositions[this.currentStation];
            const endPos = this.stationPositions[this.targetStation];
            
            // Add arc to movement
            const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, eased);
            currentPos.y = Math.sin(eased * Math.PI) * 0.5; // Small hop
            this.group.position.copy(currentPos);
            
            // Face movement direction
            if (this.moveProgress > 0.01 && this.moveProgress < 0.99) {
                const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
                if (direction.length() > 0.01) {
                    const targetRotation = Math.atan2(direction.x, direction.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(
                        this.group.rotation.y,
                        targetRotation,
                        0.1
                    );
                }
            }
            
            // Walking animation
            const walkCycle = this.moveProgress * Math.PI * 4;
            this.animateWalk(walkCycle);
            
            if (this.moveProgress >= 1) {
                this.isMoving = false;
                this.currentStation = this.targetStation;
                this.group.position.copy(this.stationPositions[this.currentStation]);
                this.group.rotation.y = 0;
                this.resetLimbs();
                this.particles.visible = false;
            }
        } else {
            // Idle animation
            this.group.position.y = this.bobOffset;
            this.animateIdle(time);
        }
        
        // Core pulse
        if (this.coreGlow) {
            const pulse = 0.8 + Math.sin(time * 3) * 0.2;
            this.coreGlow.scale.setScalar(pulse);
            this.coreGlow.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
        }
        
        // Status ring rotation
        if (this.statusRing) {
            this.statusRing.rotation.z += delta * 0.5;
            this.statusRing.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
        }
        
        // Particle animation
        if (this.particles.visible) {
            this.animateParticles(delta);
        }
        
        // Eye blink
        if (Math.random() < 0.003) {
            this.blink();
        }
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    animateWalk(cycle) {
        // Legs
        this.legs.forEach((leg, i) => {
            const phase = i === 0 ? 0 : Math.PI;
            leg.thigh.rotation.x = Math.sin(cycle + phase) * 0.5;
            leg.calf.rotation.x = -Math.sin(cycle + phase) * 0.3;
            leg.foot.rotation.x = -Math.sin(cycle + phase) * 0.2;
        });
        
        // Arms (opposite to legs)
        this.arms.forEach((arm, i) => {
            const phase = i === 0 ? Math.PI : 0;
            arm.upperArm.rotation.x = Math.sin(cycle + phase) * 0.4;
            arm.lowerArm.rotation.x = -Math.sin(cycle + phase) * 0.2;
        });
        
        // Head bob
        this.head.position.y = 1.65 + Math.abs(Math.sin(cycle * 2)) * 0.03;
    }
    
    animateIdle(time) {
        // Subtle breathing
        const breathe = Math.sin(time * 1.5) * 0.015;
        this.head.position.y = 1.65 + breathe;
        
        // Subtle arm sway
        this.arms.forEach((arm, i) => {
            const sway = Math.sin(time * 0.8 + i * Math.PI) * 0.05;
            arm.upperArm.rotation.z = arm.side * -0.3 + sway;
        });
        
        // Reset legs
        this.legs.forEach(leg => {
            leg.thigh.rotation.x = 0;
            leg.calf.rotation.x = 0;
            leg.foot.rotation.x = 0;
        });
    }
    
    resetLimbs() {
        this.arms.forEach((arm, i) => {
            arm.upperArm.rotation.x = 0;
            arm.upperArm.rotation.z = arm.side * -0.3;
            arm.lowerArm.rotation.x = 0;
            arm.lowerArm.rotation.z = arm.side * 0.2;
            arm.hand.position.set(arm.side * 0.95, 0.4, 0);
        });
        
        this.legs.forEach(leg => {
            leg.thigh.rotation.x = 0;
            leg.calf.rotation.x = 0;
            leg.foot.rotation.x = 0;
        });
        
        this.head.position.y = 1.65;
    }
    
    animateParticles(delta) {
        const positions = this.particles.geometry.attributes.position.array;
        const alphas = this.particles.geometry.attributes.alpha.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 1] += delta * 0.5; // Rise up
            alphas[i] -= delta * 0.3; // Fade out
            
            if (positions[i * 3 + 1] > 2.5 || alphas[i] <= 0) {
                // Reset particle
                positions[i * 3] = (Math.random() - 0.5) * 1.5;
                positions[i * 3 + 1] = 0.5;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
                alphas[i] = Math.random() * 0.5 + 0.3;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.alpha.needsUpdate = true;
    }
    
    blink() {
        const blinkDuration = 0.1;
        const startTime = performance.now() / 1000;
        
        const doBlink = () => {
            const elapsed = (performance.now() / 1000) - startTime;
            if (elapsed < blinkDuration) {
                const scale = elapsed < blinkDuration / 2 
                    ? 1 - (elapsed / (blinkDuration / 2)) 
                    : (elapsed - blinkDuration / 2) / (blinkDuration / 2);
                this.leftEye.scale.y = scale;
                this.rightEye.scale.y = scale;
                requestAnimationFrame(doBlink);
            } else {
                this.leftEye.scale.y = 1;
                this.rightEye.scale.y = 1;
            }
        };
        doBlink();
    }
    
    setStatus(status) {
        // Update status ring color based on agent status
        const colors = {
            'idle': 0x586b8a,
            'online': 0x64b4ff,
            'thinking': 0xfbbf24,
            'working': 0x22d39a,
            'waiting': 0xfb923c,
            'error': 0xf87171,
        };
        
        const color = colors[status] || 0x64b4ff;
        this.statusRing.material.color.setHex(color);
        this.coreGlow.material.color.setHex(color);
        this.leftEye.material.color.setHex(color);
        this.rightEye.material.color.setHex(color);
    }
    
    getMesh() {
        return this.group;
    }
}