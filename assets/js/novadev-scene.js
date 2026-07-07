import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#nova-scene");

if (canvas) {
  // ---------- Loading overlay: "Nova compiler" boot sequence ----------
  const palette = ["#2563eb", "#0f9f9a", "#f05d5e", "#f4b544", "#33a36f"];

  const wrapper = document.createElement("div");
  wrapper.className = "nova-loader-wrap";
  canvas.parentNode.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  const style = document.createElement("style");
  style.textContent = `
    .nova-loader-wrap { position: relative; }
    .nova-loader-wrap canvas {
      opacity: 0;
      transform: scale(0.97);
      transition: opacity 0.7s ease, transform 0.9s cubic-bezier(0.22,1,0.36,1);
    }
    .nova-loader-wrap.is-revealed canvas { opacity: 1; transform: scale(1); }

    .nova-loader {
      position: absolute; inset: 0; z-index: 20;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 22px;
      background: radial-gradient(ellipse at 50% 40%, #0d1730 0%, #060a16 70%);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.6,0,1,0.4);
    }
    .nova-loader.is-done { opacity: 0; transform: scale(1.04); pointer-events: none; }

    .nova-loader__flash {
      position: absolute; inset: 0; background: #eaf2ff; opacity: 0;
      pointer-events: none;
    }
    .nova-loader.is-done .nova-loader__flash {
      animation: nova-flash 0.5s ease-out forwards;
    }
    @keyframes nova-flash {
      0% { opacity: 0; }
      15% { opacity: 0.55; }
      100% { opacity: 0; }
    }

    .nova-loader__term {
      width: min(360px, 82%);
      display: flex; flex-direction: column; gap: 7px;
      font-size: 13px; line-height: 1.5; color: #7fa1d6;
    }
    .nova-loader__line {
      opacity: 0; transform: translateY(6px);
      animation: nova-line-in 0.45s ease forwards;
      animation-delay: var(--d);
      white-space: nowrap; overflow: hidden;
    }
    @keyframes nova-line-in {
      to { opacity: 1; transform: translateY(0); }
    }
    .nova-loader__line--ok { color: #33a36f; }
    .tok-fn { color: #f4b544; }
    .tok-type { color: #2563eb; }
    .tok-kw { color: #f05d5e; }
    .cursor {
      display: inline-block; color: #cfe0ff;
      animation: nova-blink 0.9s steps(1) infinite;
    }
    @keyframes nova-blink { 50% { opacity: 0; } }

    .nova-loader__nodes {
      display: flex; align-items: center; gap: 10px;
    }
    .nova-loader__nodes span {
      width: 9px; height: 9px; border-radius: 50%;
      background: #1c2740;
      box-shadow: 0 0 0 rgba(0,0,0,0);
      animation: nova-node-on 0.4s ease forwards;
      animation-delay: var(--d);
    }
    @keyframes nova-node-on {
      to {
        background: var(--c);
        box-shadow: 0 0 12px 2px var(--c);
      }
    }

    .nova-loader__bar {
      width: min(280px, 70%); height: 3px; border-radius: 2px;
      background: rgba(255,255,255,0.08); overflow: hidden;
    }
    .nova-loader__bar-fill {
      height: 100%; width: 0%; border-radius: 2px;
      background: linear-gradient(90deg, #2563eb, #0f9f9a, #f4b544, #f05d5e);
      animation: nova-fill 1.7s cubic-bezier(0.65,0,0.35,1) forwards;
      animation-delay: 0.15s;
    }
    @keyframes nova-fill { to { width: 100%; } }
  `;
  document.head.appendChild(style);

  const nodeDots = [0, 1, 2, 3, 4, 5]
    .map((i) => `<span style="--c:${palette[i % palette.length]}; --d:${0.15 + i * 0.14}s"></span>`)
    .join("");

  const loader = document.createElement("div");
  loader.className = "nova-loader";
  loader.innerHTML = `
    <div class="nova-loader__flash"></div>
    <div class="nova-loader__term">
      <div class="nova-loader__line" style="--d:0s">$ nova build ./universe.nova --release</div>
      <div class="nova-loader__line" style="--d:.32s">→ resolving <span class="tok-fn">runtime</span> nodes</div>
      <div class="nova-loader__line" style="--d:.62s">→ linking <span class="tok-type">Scene</span>::graph</div>
      <div class="nova-loader__line" style="--d:.92s">→ optimizing <span class="tok-kw">const</span> particles[160]</div>
      <div class="nova-loader__line nova-loader__line--ok" style="--d:1.55s">✓ build ready <span class="cursor">▍</span></div>
    </div>
    <div class="nova-loader__nodes">${nodeDots}</div>
    <div class="nova-loader__bar"><div class="nova-loader__bar-fill"></div></div>
  `;
  wrapper.appendChild(loader);

  window.setTimeout(() => {
    loader.classList.add("is-done");
    wrapper.classList.add("is-revealed");
    window.setTimeout(() => loader.remove(), 650);
  }, 2050);
  // ---------- end loading overlay ----------

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const colors = [0x2563eb, 0x0f9f9a, 0xf05d5e, 0xf4b544, 0x33a36f];
  const materialCache = colors.map((color) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.18,
  }));

  const nodeGeometry = new THREE.IcosahedronGeometry(0.28, 1);
  const nodes = [];
  const nodePositions = [
    [-4.2, 0.4, -1.2],
    [-2.4, 1.25, -0.2],
    [-0.8, -0.25, 0.2],
    [1.2, 0.95, -0.4],
    [3.2, 0.05, -1.1],
    [4.3, 1.05, 0.2],
  ];

  nodePositions.forEach((position, index) => {
    const mesh = new THREE.Mesh(nodeGeometry, materialCache[index % materialCache.length]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.userData.floatOffset = index * 0.7;
    group.add(mesh);
    nodes.push(mesh);
  });

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.35 });
  const points = nodePositions.map((position) => new THREE.Vector3(position[0], position[1], position[2]));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
  group.add(line);

  const torus = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.85, 0.16, 120, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.28 })
  );
  torus.position.set(2.65, -1.25, -0.7);
  group.add(torus);

  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
    positions[i * 3 + 2] = -2 - Math.random() * 4;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0x2563eb, size: 0.035, transparent: true, opacity: 0.38 })
  );
  scene.add(particles);

  const ambient = new THREE.AmbientLight(0xffffff, 1.25);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x0f9f9a, 2.1, 9);
  rimLight.position.set(-3, -1, 2);
  scene.add(rimLight);

  camera.position.set(0, 0, 7.4);

  let pointerX = 0;
  let pointerY = 0;
  window.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.35;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.25;
  });

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  function animate(time) {
    const seconds = time * 0.001;
    group.rotation.y = Math.sin(seconds * 0.22) * 0.18 + pointerX;
    group.rotation.x = Math.sin(seconds * 0.18) * 0.08 + pointerY;
    particles.rotation.y = seconds * 0.035;
    torus.rotation.x = seconds * 0.42;
    torus.rotation.y = seconds * 0.32;

    nodes.forEach((node) => {
      node.position.y += Math.sin(seconds + node.userData.floatOffset) * 0.0009;
      node.rotation.x += 0.008;
      node.rotation.y += 0.011;
    });

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
}