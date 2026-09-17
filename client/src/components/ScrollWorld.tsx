import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type SatelliteStat = { label: string; value: string; detail: string };

export const satelliteStats: SatelliteStat[] = [
  { label: "Active forecasts", value: "04", detail: "Questions currently moving through the lab." },
  { label: "Resolution horizon", value: "2030", detail: "The farthest active resolution date." },
  { label: "Evidence state", value: "OPEN", detail: "Research can change the current probability." },
  { label: "Calibration", value: "—", detail: "Appears after resolved forecasts accumulate." },
  { label: "Uncertainty", value: "σ 0.24", detail: "Current spread across the probability field." },
  { label: "World position", value: "02 / 06", detail: "Camera stage in the forecasting journey." },
  { label: "Private ledger", value: "ON", detail: "Saved forecasts stay attached to your account." },
  { label: "Forecast mode", value: "STRUCTURED", detail: "Variables, criteria, and outcomes stay explicit." },
  { label: "Signal strength", value: "RISING", detail: "A new question can become the next signal." },
  { label: "Field depth", value: "1.00", detail: "Drag your cursor across the world to explore." },
  { label: "Model state", value: "READY", detail: "The forecasting instrument is listening." },
];

export default function ScrollWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ stat: SatelliteStat; x: number; y: number } | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0e0e0c, 0.055);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const world = new THREE.Group(); scene.add(world);
    const accent = new THREE.MeshBasicMaterial({ color: 0xb7791f, transparent: true, opacity: .72, wireframe: true });
    const dimAccent = new THREE.MeshBasicMaterial({ color: 0x8a642f, transparent: true, opacity: .16, wireframe: true });
    const pointsMaterial = new THREE.PointsMaterial({ color: 0xd09a4a, size: .035, transparent: true, opacity: .55, sizeAttenuation: true });
    const rings: THREE.Mesh[] = [];
    [1.4, 2.15, 3.05].forEach((radius, index) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .006, 6, 96), index === 1 ? accent : dimAccent); ring.rotation.set(Math.PI / 2 + index * .32, index * .5, index * .23); ring.position.set(index * .18 - .25, index * .45 - .55, -index * 1.9); world.add(ring); rings.push(ring); });
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < 11; i += 1) { const object = new THREE.Mesh(new THREE.IcosahedronGeometry(.055 + (i % 3) * .025, 1), accent); object.position.set(Math.sin(i * 2.7) * (2.2 + (i % 3) * .7), Math.cos(i * 1.9) * (1.15 + (i % 4) * .3), -1.2 - (i % 5) * 1.25); object.userData.stat = satelliteStats[i]; world.add(object); satellites.push(object); }
    const starPositions = new Float32Array(420 * 3); for (let i = 0; i < starPositions.length; i += 3) { starPositions[i] = (Math.random() - .5) * 16; starPositions[i + 1] = (Math.random() - .5) * 10; starPositions[i + 2] = -Math.random() * 20 - 1; }
    const stars = new THREE.Points(new THREE.BufferGeometry(), pointsMaterial); stars.geometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3)); world.add(stars);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const raycaster = new THREE.Raycaster(); const pointerVector = new THREE.Vector2();
    const pickSatellite = (event: PointerEvent | MouseEvent) => { pointerVector.x = (event.clientX / window.innerWidth) * 2 - 1; pointerVector.y = -(event.clientY / window.innerHeight) * 2 + 1; raycaster.setFromCamera(pointerVector, camera); const hit = raycaster.intersectObjects(satellites)[0]; if (hit?.object.userData.stat) { const stat = hit.object.userData.stat as SatelliteStat; setSelected({ stat, x: event.clientX, y: event.clientY }); } else if ((event as MouseEvent).type === "click") setSelected(null); };
    const onPointer = (event: PointerEvent) => { pointer.tx = (event.clientX / window.innerWidth - .5) * 2; pointer.ty = (event.clientY / window.innerHeight - .5) * 2; pickSatellite(event); };
    const onClick = (event: MouseEvent) => pickSatellite(event);
    const resize = () => { const rect = mount.getBoundingClientRect(); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false); };
    let frame = 0;
    const animate = (time: number) => { pointer.x += (pointer.tx - pointer.x) * .035; pointer.y += (pointer.ty - pointer.y) * .035; const maxScroll = document.documentElement.scrollHeight - window.innerHeight; const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0; const eased = progress * progress * (3 - 2 * progress); camera.position.x += (pointer.x * .42 - camera.position.x) * .035; camera.position.y += (-pointer.y * .27 - camera.position.y) * .035; camera.position.z += (7.2 - eased * 5.8 - camera.position.z) * .035; camera.rotation.z = pointer.x * .035; world.position.y += (-eased * 1.45 - world.position.y) * .025; world.rotation.y += ((pointer.x * .12 + eased * 1.18) - world.rotation.y) * .025; world.rotation.x += ((pointer.y * .07 - eased * .2) - world.rotation.x) * .025; rings.forEach((ring, index) => { ring.rotation.z += .0008 * (index + 1); ring.rotation.x += .00035 * (index + 1); ring.position.z += ((-index * 1.9 + eased * index * 1.25) - ring.position.z) * .018; }); satellites.forEach((object, index) => { object.rotation.x += .003 + index * .0002; object.rotation.y += .002; object.position.z += ((-1.2 - (index % 5) * 1.25 + eased * (index % 4) * .8) - object.position.z) * .02; }); stars.rotation.y = time * .000018 + eased * .25; renderer.render(scene, camera); frame = window.requestAnimationFrame(animate); };
    resize(); frame = window.requestAnimationFrame(animate); window.addEventListener("resize", resize); window.addEventListener("pointermove", onPointer, { passive: true }); window.addEventListener("click", onClick);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onPointer); window.removeEventListener("click", onClick); renderer.dispose(); mount.removeChild(renderer.domElement); rings.forEach(ring => ring.geometry.dispose()); satellites.forEach(object => object.geometry.dispose()); stars.geometry.dispose(); accent.dispose(); dimAccent.dispose(); pointsMaterial.dispose(); };
  }, []);
  return <div ref={mountRef} className="scroll-world" aria-hidden="true"><div className="world-hint">Click a signal node to inspect the field</div>{selected && <div className="satellite-tooltip" style={{ left: Math.min(selected.x + 16, window.innerWidth - 250), top: Math.max(selected.y - 78, 82) }} role="status"><div className="tooltip-kicker">Signal node / interactive</div><strong>{selected.stat.value}</strong><span>{selected.stat.label}</span><p>{selected.stat.detail}</p></div>}</div>;
}
