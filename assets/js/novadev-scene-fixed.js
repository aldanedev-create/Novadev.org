const threeSources = [
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "https://unpkg.com/three@0.160.0/build/three.module.js",
];
const colors = ["#2563eb", "#0f9f9a", "#f05d5e", "#f4b544", "#33a36f"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

async function loadThree() {
  let lastError;
  for (const source of threeSources) {
    let timer;
    try {
      return await Promise.race([
        import(source),
        new Promise((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error(`Timed out loading ${source}`)),
            2500
          );
        }),
      ]);
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastError || new Error("Three.js is unavailable.");
}

function prepareScene(canvas) {
  const wrapper = document.createElement("div");
  wrapper.className = "nova-scene-wrap";
  canvas.parentNode.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  let alreadyPlayed = false;
  try {
    alreadyPlayed = sessionStorage.getItem("nova-loader-played") === "yes";
  } catch (error) {
    // The animation can run without browser storage.
  }

  if (alreadyPlayed || reducedMotion.matches) {
    wrapper.classList.add("is-revealed");
    return () => {};
  }

  const loader = document.createElement("div");
  loader.className = "nova-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-label", "NovaDev is loading");
  loader.innerHTML = `
    <div class="nova-loader__terminal">
      <span>$ nova build ./universe.nova</span>
      <span>resolving runtime nodes</span>
      <span>linking project graph</span>
      <strong>build ready</strong>
    </div>
    <div class="nova-loader__nodes" aria-hidden="true">
      ${colors.map((color, index) =>
        `<span style="--dot-color:${color};--dot-delay:${index * 90}ms"></span>`
      ).join("")}
    </div>
    <div class="nova-loader__track" aria-hidden="true"><span></span></div>
  `;
  document.body.appendChild(loader);
  const started = performance.now();
  let complete = false;

  return () => {
    if (complete) return;
    complete = true;
    const wait = Math.max(0, 1400 - (performance.now() - started));
    window.setTimeout(() => {
      wrapper.classList.add("is-revealed");
      loader.classList.add("is-done");
      try {
        sessionStorage.setItem("nova-loader-played", "yes");
      } catch (error) {
        // Ignore disabled browser storage.
      }
      window.setTimeout(() => loader.remove(), 450);
    }, wait);
  };
}

function runThreeScene(canvas, THREE) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const group = new THREE.Group();
  scene.add(group);
  const points = [
    [-4.2, 0.4, -1.2],
    [-2.4, 1.25, -0.2],
    [-0.8, -0.25, 0.2],
    [1.2, 0.95, -0.4],
    [3.2, 0.05, -1.1],
    [4.3, 1.05, 0.2],
  ];
  const nodeGeometry = new THREE.IcosahedronGeometry(0.28, 1);
  const materials = [0x2563eb, 0x0f9f9a, 0xf05d5e, 0xf4b544, 0x33a36f]
    .map((color) => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.18,
    }));
  const nodes = points.map((point, index) => {
    const node = new THREE.Mesh(nodeGeometry, materials[index % materials.length]);
    node.position.set(...point);
    node.userData.baseY = point[1];
    node.userData.offset = index * 0.7;
    group.add(node);
    return node;
  });

  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point))),
    new THREE.LineBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.38 })
  ));

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.85, 0.16, 120, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.28 })
  );
  knot.position.set(2.65, -1.25, -0.7);
  group.add(knot);

  const particlePositions = new Float32Array(180 * 3);
  for (let index = 0; index < 180; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.5) * 10;
    particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 5;
    particlePositions[index * 3 + 2] = -2 - Math.random() * 4;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0x2563eb, size: 0.04, transparent: true, opacity: 0.42 })
  );
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 4, 5);
  scene.add(keyLight);
  camera.position.set(0, 0, 7.4);

  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let frame = 0;
  let visible = true;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const draw = (time = 0) => {
    const seconds = time * 0.001;
    smoothX += (pointerX - smoothX) * 0.045;
    smoothY += (pointerY - smoothY) * 0.045;
    group.rotation.y = Math.sin(seconds * 0.22) * 0.18 + smoothX;
    group.rotation.x = Math.sin(seconds * 0.18) * 0.08 + smoothY;
    particles.rotation.y = seconds * 0.035;
    knot.rotation.set(seconds * 0.42, seconds * 0.32, 0);
    nodes.forEach((node) => {
      node.position.y = node.userData.baseY + Math.sin(seconds + node.userData.offset) * 0.12;
      node.rotation.set(seconds * 0.42 + node.userData.offset, seconds * 0.58, 0);
    });
    renderer.render(scene, camera);
    if (visible && !document.hidden && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
    }
  };

  const start = () => {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) draw(0);
    else if (visible && !document.hidden) frame = requestAnimationFrame(draw);
  };

  window.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.35;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.25;
  }, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener?.("change", start);
  resize();
  start();
}

function runCanvasFallback(originalCanvas) {
  let canvas = originalCanvas;
  let context = canvas.getContext("2d");
  if (!context) {
    canvas = originalCanvas.cloneNode(false);
    originalCanvas.replaceWith(canvas);
    context = canvas.getContext("2d");
  }
  if (!context) return;

  const particles = Array.from({ length: 38 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    size: index % 7 === 0 ? 5 : 1.5 + Math.random() * 2,
    offset: Math.random() * Math.PI * 2,
    color: colors[index % colors.length],
  }));
  let width = 1;
  let height = 1;
  let frame = 0;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle, index) => {
      const x = particle.x * width;
      const y = particle.y * height + Math.sin(time * 0.00006 + particle.offset) * 15;
      particles.slice(index + 1).forEach((other) => {
        const ox = other.x * width;
        const oy = other.y * height + Math.sin(time * 0.00006 + other.offset) * 15;
        const distance = Math.hypot(x - ox, y - oy);
        if (distance < 145) {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(ox, oy);
          context.strokeStyle = `rgba(37,99,235,${0.15 * (1 - distance / 145)})`;
          context.stroke();
        }
      });
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.globalAlpha = particle.size > 4 ? 0.5 : 0.22;
      context.fill();
      context.globalAlpha = 1;
    });
    if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(draw);
  };

  const start = () => {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) draw(0);
    else if (!document.hidden) frame = requestAnimationFrame(draw);
  };
  new ResizeObserver(() => {
    resize();
    if (reducedMotion.matches) draw(0);
  }).observe(canvas);
  document.addEventListener("visibilitychange", start);
  resize();
  start();
}

async function initializeNovaScene() {
  const canvas = document.querySelector("#nova-scene");
  if (!canvas) return;
  const reveal = prepareScene(canvas);
  try {
    runThreeScene(canvas, await loadThree());
  } catch (error) {
    console.warn("Using the NovaDev canvas fallback.", error);
    runCanvasFallback(canvas);
  } finally {
    reveal();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNovaScene, { once: true });
} else {
  initializeNovaScene();
}
