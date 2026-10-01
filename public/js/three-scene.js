/**
 * Furina Music — Three.js 3D Hydro WebGL Scene & Audio-Reactive Pavilion
 * Provides true 3D ocean wave mesh displacement, floating crystal hydro gems,
 * interactive camera parallax, dynamic point lights, and audio frequency reactivity.
 */

(function () {
  'use strict';

  class FurinaThreeScene {
    constructor() {
      this.container = document.querySelector('.dynamic-mesh-layer') || document.body;
      let el = document.getElementById('three-hydro-canvas');
      if (!el) {
        el = document.createElement('canvas');
        el.id = 'three-hydro-canvas';
        document.body.insertBefore(el, document.body.firstChild);
      }
      this.canvas = el;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.oceanMesh = null;
      this.crystals = [];
      this.pointLightCyan = null;
      this.pointLightGold = null;
      this.clock = null;
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.audioData = new Uint8Array(64);
      this.isAudioConnected = false;

      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.log('[ThreeScene] Waiting for THREE.js runtime...');
        return;
      }

      this.clock = new THREE.Clock();

      // 1. Scene & Fog
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x060d1b, 0.015);

      // 2. Camera
      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
      this.camera.position.set(0, 18, 45);
      this.camera.lookAt(0, 0, 0);

      // 3. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Expose to window for Three.js devtools inspection
      window.__THREE_SCENE__ = this.scene;
      window.__THREE_RENDERER__ = this.renderer;
      window.__THREE_CAMERA__ = this.camera;

      // 4. Lights
      const ambientLight = new THREE.AmbientLight(0x0a1936, 1.2);
      this.scene.add(ambientLight);

      this.pointLightCyan = new THREE.PointLight(0x00f2fe, 3, 120);
      this.pointLightCyan.position.set(-20, 25, 10);
      this.scene.add(this.pointLightCyan);

      this.pointLightGold = new THREE.PointLight(0xffd166, 2.2, 100);
      this.pointLightGold.position.set(25, 20, -10);
      this.scene.add(this.pointLightGold);

      // 5. 3D Ocean Waves Geometry
      this.createOceanSurface();

      // 6. 3D Floating Crystal Hydro Gems
      this.createFloatingCrystals();

      // 7. Event Listeners
      window.addEventListener('resize', () => this.onWindowResize());
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));

      // 8. Start Render Loop
      this.animate();
      console.log('[ThreeScene] Fontaine 3D WebGL Ocean Stage active.');
    }

    createOceanSurface() {
      const planeGeo = new THREE.PlaneGeometry(160, 160, 48, 48);
      planeGeo.rotateX(-Math.PI / 2);

      // Store initial vertex positions for wave displacement
      const pos = planeGeo.attributes.position;
      planeGeo.userData.baseY = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        planeGeo.userData.baseY[i] = pos.getY(i);
      }

      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x05132e,
        roughness: 0.15,
        metalness: 0.85,
        wireframe: false,
        flatShading: true
      });

      this.oceanMesh = new THREE.Mesh(planeGeo, planeMat);
      this.oceanMesh.position.y = -8;
      this.scene.add(this.oceanMesh);

      // Add a delicate cyan wireframe overlay for high-tech Fontaine aesthetic
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        wireframe: true,
        transparent: true,
        opacity: 0.08
      });
      const wireMesh = new THREE.Mesh(planeGeo, wireMat);
      this.oceanMesh.add(wireMesh);
    }

    createFloatingCrystals() {
      const crystalGeo = new THREE.IcosahedronGeometry(1.8, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x005588,
        roughness: 0.1,
        metalness: 0.9,
        wireframe: false
      });

      const positions = [
        { x: -32, y: 12, z: -15, scale: 1.4 },
        { x: 30, y: 16, z: -10, scale: 1.6 },
        { x: -18, y: 22, z: -35, scale: 2.0 },
        { x: 22, y: 8, z: 12, scale: 1.2 },
        { x: -5, y: 15, z: -25, scale: 1.1 }
      ];

      positions.forEach((pos, idx) => {
        const mesh = new THREE.Mesh(crystalGeo, crystalMat);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.scale.setScalar(pos.scale);
        mesh.userData = {
          speedX: 0.008 * (idx % 2 === 0 ? 1 : -1),
          speedY: 0.012,
          baseY: pos.y,
          rotSpeed: 0.01 + idx * 0.004
        };
        this.scene.add(mesh);
        this.crystals.push(mesh);
      });
    }

    onMouseMove(e) {
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onWindowResize() {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const time = this.clock ? this.clock.getElapsedTime() : 0;

      // Smooth camera parallax
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      if (this.camera) {
        this.camera.position.x = this.mouse.x * 6;
        this.camera.position.y = 18 + this.mouse.y * 4;
        this.camera.lookAt(0, 0, 0);
      }

      // Audio Frequency Analysis for 3D Reactive Waves
      let audioAmp = 1.0;
      if (window.furinaAudio?.analyser) {
        try {
          window.furinaAudio.analyser.getByteFrequencyData(this.audioData);
          let sum = 0;
          for (let i = 0; i < 16; i++) sum += this.audioData[i];
          const bassAvg = sum / 16;
          audioAmp = 1.0 + (bassAvg / 255) * 1.8;
        } catch (_) {}
      }

      // 3D Wave Displacement
      if (this.oceanMesh) {
        const pos = this.oceanMesh.geometry.attributes.position;
        const baseY = this.oceanMesh.geometry.userData.baseY;

        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getZ(i);
          const wave1 = Math.sin(u * 0.08 + time * 1.4) * 2.2;
          const wave2 = Math.cos(v * 0.08 + time * 1.2) * 2.0;
          const wave3 = Math.sin((u + v) * 0.05 + time * 1.8) * 1.5;
          const y = (wave1 + wave2 + wave3) * audioAmp * 0.6;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      // Floating Crystals Motion
      this.crystals.forEach((c) => {
        c.rotation.x += c.userData.rotSpeed;
        c.rotation.y += c.userData.rotSpeed * 1.2;
        c.position.y = c.userData.baseY + Math.sin(time * 1.5 + c.position.x) * 1.8;
      });

      // Orbiting dynamic point lights
      if (this.pointLightCyan) {
        this.pointLightCyan.position.x = Math.sin(time * 0.5) * 35;
        this.pointLightCyan.position.z = Math.cos(time * 0.5) * 25;
      }
      if (this.pointLightGold) {
        this.pointLightGold.position.x = Math.cos(time * 0.4) * 30;
        this.pointLightGold.position.z = Math.sin(time * 0.4) * 30;
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  // Load Three.js if not already present
  function ensureThreeJsAndMount() {
    if (typeof THREE !== 'undefined') {
      window.furinaThreeScene = new FurinaThreeScene();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => {
      console.log('[ThreeScene] Three.js loaded successfully from CDN.');
      window.furinaThreeScene = new FurinaThreeScene();
    };
    script.onerror = () => {
      console.warn('[ThreeScene] CDN Three.js load notice, running canvas 2D fallback.');
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureThreeJsAndMount);
  } else {
    ensureThreeJsAndMount();
  }
})();
