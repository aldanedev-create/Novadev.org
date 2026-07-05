import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#nova-scene");

if (canvas) {
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
