/**
 * きみ夏宵あそび – Three.js Fireworks & Atmosphere System
 */
class FireworksScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.W / this.H, 0.1, 500);
    this.camera.position.set(0, 0, 30);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(this.W, this.H);
    this.renderer.setClearColor(0x000000, 0);

    // Palette (logo gradient colors)
    this.palette = [
      new THREE.Color(0x9B72CF),
      new THREE.Color(0xC864A0),
      new THREE.Color(0xE07898),
      new THREE.Color(0xE8765A),
      new THREE.Color(0xF0BE50),
      new THREE.Color(0xFFFFFF),
      new THREE.Color(0xA0D8F0),
    ];

    this.shells  = [];
    this.bursts  = [];
    this.clock   = new THREE.Clock();

    this._buildStars();
    this._buildFireflies();
    this._startAutoLaunch();
    this._addInteraction();
    this._resize();
    this._animate();
  }

  // ──────────────────────────────────────────────
  //  Stars
  // ──────────────────────────────────────────────
  _buildStars() {
    const N = 400;
    const pos  = new Float32Array(N * 3);
    const size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 120;
      pos[i*3+1] = (Math.random() - 0.5) * 80;
      pos[i*3+2] = (Math.random() - 0.5) * 10 - 5;
      size[i] = Math.random() * 1.8 + 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(size, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vAlpha = 0.3 + 0.7 * abs(sin(uTime * 1.2 + position.x * 3.7 + position.y * 2.3));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float s = 1.0 - d * 2.0;
          gl_FragColor = vec4(1.0, 0.97, 0.92, s * vAlpha);
        }`,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.starsMat = mat;
    this.scene.add(new THREE.Points(geo, mat));
  }

  // ──────────────────────────────────────────────
  //  Fireflies
  // ──────────────────────────────────────────────
  _buildFireflies() {
    const N = 60;
    this._ffPos = [];
    this._ffVel = [];
    this._ffPhase = [];
    const pos   = new Float32Array(N * 3);
    const col   = new Float32Array(N * 3);
    const c1 = new THREE.Color(0xFFFF80);
    const c2 = new THREE.Color(0x80FFB0);

    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 5;
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      this._ffPos.push({x,y,z});
      this._ffVel.push({ x:(Math.random()-0.5)*0.04, y:Math.random()*0.025+0.005 });
      this._ffPhase.push(Math.random() * Math.PI * 2);
      const c = Math.random() > 0.4 ? c1 : c2;
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this._ffGeo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.22, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this._ffMat = mat;
    this.scene.add(new THREE.Points(geo, mat));
    this._ffN = N;
  }

  _updateFireflies(t) {
    const pos = this._ffGeo.attributes.position.array;
    for (let i = 0; i < this._ffN; i++) {
      const p = this._ffPos[i];
      const v = this._ffVel[i];
      p.x += v.x + Math.sin(t * 0.7 + this._ffPhase[i]) * 0.015;
      p.y += v.y;
      if (p.y > 28) { p.y = -28; p.x = (Math.random()-0.5)*80; }
      if (p.x >  45) p.x = -45;
      if (p.x < -45) p.x =  45;
      pos[i*3]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
    }
    this._ffGeo.attributes.position.needsUpdate = true;
    this._ffMat.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.3));
  }

  // ──────────────────────────────────────────────
  //  Launch a shell
  // ──────────────────────────────────────────────
  launch(wx, wy) {
    const color = this.palette[Math.floor(Math.random() * this.palette.length)];
    const color2 = this.palette[Math.floor(Math.random() * this.palette.length)];
    this.shells.push({
      x: wx ?? (Math.random() - 0.5) * 30,
      y: -18,
      vy: 12 + Math.random() * 6,
      targetY: (wy ?? 0) + (Math.random() - 0.5) * 5,
      color, color2,
      trail: [], trailMesh: null,
    });
  }

  // ──────────────────────────────────────────────
  //  Explosion
  // ──────────────────────────────────────────────
  _explode(shell) {
    const N = 180 + Math.floor(Math.random() * 80);
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const vel  = [];
    const type = Math.random(); // 0: sphere, 0.4: ring, 0.7: willow

    for (let i = 0; i < N; i++) {
      pos[i*3]   = shell.x;
      pos[i*3+1] = shell.y;
      pos[i*3+2] = 0;

      let vx, vy, vz;
      if (type < 0.4) {
        // Sphere burst
        const θ = Math.random() * Math.PI * 2;
        const φ = Math.acos(2 * Math.random() - 1);
        const spd = 1.5 + Math.random() * 3.5;
        vx = Math.sin(φ) * Math.cos(θ) * spd;
        vy = Math.sin(φ) * Math.sin(θ) * spd * 0.55;
        vz = Math.cos(φ) * spd * 0.2;
      } else if (type < 0.7) {
        // Ring (chrysanthemum)
        const θ = (i / N) * Math.PI * 2;
        const spd = 2.5 + Math.random() * 1.5;
        vx = Math.cos(θ) * spd;
        vy = Math.sin(θ) * spd * 0.6;
        vz = (Math.random() - 0.5) * 0.5;
      } else {
        // Willow (drooping)
        const θ = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 3;
        vx = Math.cos(θ) * spd;
        vy = Math.abs(Math.sin(θ)) * spd * 0.4 + 1;
        vz = (Math.random() - 0.5) * 0.3;
      }
      vel.push({ x: vx, y: vy, z: vz });

      // Color: mix primary and secondary
      const t = Math.random();
      const r = shell.color.r * (1-t) + shell.color2.r * t;
      const g = shell.color.g * (1-t) + shell.color2.g * t;
      const b = shell.color.b * (1-t) + shell.color2.b * t;
      col[i*3]=r; col[i*3+1]=g; col[i*3+2]=b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25, vertexColors: true, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthTest: false,
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);
    this.bursts.push({ mesh, geo, mat, vel, life: 1.0, N });

    // Add inner flash
    const flashGeo = new THREE.BufferGeometry();
    flashGeo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([shell.x, shell.y, 0.1]), 3));
    const flashMat = new THREE.PointsMaterial({
      size: 3.0, color: 0xFFFFFF, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    const flash = new THREE.Points(flashGeo, flashMat);
    this.scene.add(flash);
    this.bursts.push({ mesh: flash, geo: flashGeo, mat: flashMat, vel: [], life: 0.25, N: 0, flash: true });
  }

  // ──────────────────────────────────────────────
  //  Update bursts
  // ──────────────────────────────────────────────
  _updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt * (b.flash ? 4 : 0.45);
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.geo.dispose(); b.mat.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      b.mat.opacity = b.flash ? b.life * b.life : b.life * b.life;

      if (!b.flash) {
        const pos = b.geo.attributes.position.array;
        const gravity = -2.5;
        for (let j = 0; j < b.N; j++) {
          b.vel[j].y += gravity * dt;
          pos[j*3]   += b.vel[j].x * dt;
          pos[j*3+1] += b.vel[j].y * dt;
          pos[j*3+2] += b.vel[j].z * dt;
          // Damping
          b.vel[j].x *= 0.985;
          b.vel[j].z *= 0.985;
        }
        b.geo.attributes.position.needsUpdate = true;
      }
    }
  }

  // ──────────────────────────────────────────────
  //  Update shells (rising)
  // ──────────────────────────────────────────────
  _updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.vy -= 18 * dt;
      s.y  += s.vy * dt;
      if (s.vy <= 0.5 || s.y >= s.targetY) {
        this._explode(s);
        this.shells.splice(i, 1);
      }
    }
  }

  // ──────────────────────────────────────────────
  //  Auto launch
  // ──────────────────────────────────────────────
  _startAutoLaunch() {
    const scheduleNext = () => {
      const delay = 1500 + Math.random() * 2500;
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') this.launch();
        scheduleNext();
      }, delay);
    };
    setTimeout(() => { this.launch(); scheduleNext(); }, 800);
  }

  // ──────────────────────────────────────────────
  //  Click interaction
  // ──────────────────────────────────────────────
  _addInteraction() {
    const handler = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const wx = (clientX / this.W - 0.5) * 55;
      const wy = -(clientY / this.H - 0.5) * 35;
      this.launch(wx, wy + 6);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler, { passive: true });
  }

  // ──────────────────────────────────────────────
  //  Resize
  // ──────────────────────────────────────────────
  _resize() {
    window.addEventListener('resize', () => {
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H);
    });
  }

  // ──────────────────────────────────────────────
  //  Animate loop
  // ──────────────────────────────────────────────
  _animate() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t  = this.clock.elapsedTime;

      this.starsMat.uniforms.uTime.value = t;
      this._updateFireflies(t);
      this._updateShells(dt);
      this._updateBursts(dt);

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}
