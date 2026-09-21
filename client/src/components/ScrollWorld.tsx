import { useEffect, useRef } from "react";
import * as THREE from "three";

export const fieldStages = [
  { label: "Question", detail: "Define the event to forecast." },
  { label: "Variables", detail: "Identify conditions that could move the probability." },
  { label: "Evidence", detail: "Keep supporting sources with the forecast." },
  { label: "Probability", detail: "Express uncertainty as a calibrated probability." },
  { label: "Resolution", detail: "Record what happened against the criteria." },
];

export default function ScrollWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const world = new THREE.Group();
    scene.add(world);
    const accent = new THREE.MeshBasicMaterial({ color: 0xe07a3f, transparent: true, opacity: 0.68, wireframe: true });
    const navy = new THREE.MeshBasicMaterial({ color: 0x17233c, transparent: true, opacity: 0.13, wireframe: true });
    const rings: THREE.Mesh[] = [];
    [1.4, 2.15, 3.05].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 6, 96), index === 1 ? accent : navy);
      ring.rotation.set(Math.PI / 2 + index * 0.32, index * 0.5, index * 0.23);
      ring.position.set(index * 0.18 - 0.25, index * 0.45 - 0.55, -index * 1.9);
      world.add(ring); rings.push(ring);
    });
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < fieldStages.length; i += 1) {
      const object = new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 1), accent);
      object.position.set(Math.sin(i * 2.7) * (2.1 + (i % 2) * 0.6), Math.cos(i * 1.9) * (1.15 + (i % 3) * 0.25), -1.2 - i * 1.1);
      world.add(object); satellites.push(object);
    }
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 16;
      starPositions[i + 1] = (Math.random() - 0.5) * 10;
      starPositions[i + 2] = -Math.random() * 20 - 1;
    }
    const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xe07a3f, size: 0.03, transparent: true, opacity: 0.4 }));
    stars.geometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3)); world.add(stars);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => { const rect = mount.getBoundingClientRect(); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false); };
    let frame = 0;
    const animate = (time: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const eased = reducedMotion.matches ? 0 : progress * progress * (3 - 2 * progress);
      camera.position.x += (pointer.x * 0.42 - camera.position.x) * 0.035;
      camera.position.y += (-pointer.y * 0.27 - camera.position.y) * 0.035;
      camera.position.z += (7.2 - eased * 5.2 - camera.position.z) * 0.035;
      world.position.y += (-eased * 1.25 - world.position.y) * 0.025;
      world.rotation.y += ((pointer.x * 0.12 + eased * 1.05) - world.rotation.y) * 0.025;
      world.rotation.x += ((pointer.y * 0.07 - eased * 0.18) - world.rotation.x) * 0.025;
      rings.forEach((ring, index) => { ring.rotation.z += 0.0007 * (index + 1); ring.rotation.x += 0.0003 * (index + 1); });
      satellites.forEach((object, index) => { object.rotation.x += 0.0025; object.rotation.y += 0.0018; object.position.z += ((-1.2 - index * 1.1 + eased * (index % 3) * 0.7) - object.position.z) * 0.02; });
      stars.rotation.y = reducedMotion.matches ? 0 : time * 0.000018 + eased * 0.22;
      renderer.render(scene, camera);
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    };
    const onPointer = (event: PointerEvent) => { pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2; pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2; };
    resize(); animate(performance.now());
    window.addEventListener("resize", resize); window.addEventListener("pointermove", onPointer, { passive: true });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onPointer); renderer.dispose(); rings.forEach(ring => ring.geometry.dispose()); satellites.forEach(object => object.geometry.dispose()); stars.geometry.dispose(); (stars.material as THREE.Material).dispose(); accent.dispose(); navy.dispose(); mount.removeChild(renderer.domElement); };
  }, []);
  return <div ref={mountRef} className="scroll-world" aria-hidden="true"><div className="world-hint">Question → variables → evidence → probability → resolution</div></div>;
}
