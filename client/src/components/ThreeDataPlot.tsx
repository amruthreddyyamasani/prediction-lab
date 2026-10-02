import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { PlotNode, PlotSpec, Vec3 } from "@/lib/visualizationData";

type PlotSelection = { node: PlotNode; left: number; top: number };
type Props = { spec: PlotSpec; compact?: boolean };

function disposeScene(scene: THREE.Scene) {
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose());
      else mesh.material.dispose();
    }
  });
}

function plotNodes(spec: PlotSpec) {
  return [...spec.nodes, ...spec.columns.map(column => column.node)];
}

function point2d(position: Vec3) {
  const [x, y, z] = position;
  return { x: 400 + x * 78 + z * 14, y: 337 - y * 57 - z * 7 };
}

function TwoDimensionalFallback({ spec }: { spec: PlotSpec }) {
  const nodes = plotNodes(spec);
  const byId = new Map(nodes.map(node => [node.id, node]));
  return <svg className="three-plot-svg" viewBox="0 0 800 370" role="img" aria-label={`${spec.title}, 2D view. ${spec.description}`}>
    <path d="M42 337H758M42 337V42" className="three-plot-svg-axis" />
    {[0, 1, 2, 3, 4].map(index => <line key={index} x1="42" x2="758" y1={337 - index * 70} y2={337 - index * 70} className="three-plot-svg-grid" />)}
    {spec.edges.map(edge => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return null;
      const start = point2d(from.position);
      const end = point2d(to.position);
      return <line key={edge.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={edge.color} strokeOpacity={edge.opacity ?? 0.55} strokeWidth="1.5" />;
    })}
    {spec.paths.map(path => <polyline key={path.id} points={path.points.map(point => { const projected = point2d(point); return `${projected.x},${projected.y}`; }).join(" ")} fill="none" stroke={path.color} strokeOpacity={path.opacity ?? 0.8} strokeWidth="2" strokeDasharray={path.dashed ? "5 5" : undefined} />)}
    {spec.columns.map(column => {
      const base = point2d(column.base);
      const top = point2d(column.node.position);
      return <rect key={column.node.id} x={base.x - 12} y={top.y} width="24" height={Math.max(0, base.y - top.y)} fill={column.node.color} fillOpacity=".45" stroke={column.node.color} strokeWidth="1" />;
    })}
    {nodes.map(node => {
      const point = point2d(node.position);
      return <circle key={node.id} cx={point.x} cy={point.y} r={Math.max(4, (node.radius ?? 0.15) * 22)} fill={node.color} stroke="var(--surface)" strokeWidth="2"><title>{node.label}: {node.detail}</title></circle>;
    })}
  </svg>;
}

export default function ThreeDataPlot({ spec, compact = false }: Props) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [unavailable, setUnavailable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<PlotSelection | null>(null);
  const nodes = useMemo(() => plotNodes(spec), [spec]);
  const selectedNode = nodes.find(node => node.id === selectedId) ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || view !== "3d") return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      setView("2d");
      return;
    }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "three-plot-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "none";
    host.replaceChildren(renderer.domElement);

    const dark = theme === "dark";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(10.5, 8.5, 11.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.1, 0);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 23;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.5;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight(dark ? 0xf5e6d8 : 0xffffff, dark ? 0x211812 : 0x75604f, dark ? 1.35 : 1.1));
    const keyLight = new THREE.DirectionalLight(dark ? 0xffad78 : 0xf1a06b, dark ? 1.8 : 1.5);
    keyLight.position.set(4, 9, 6);
    scene.add(keyLight);
    const gridColor = new THREE.Color(dark ? "#393431" : "#d4cbbf");
    const grid = new THREE.GridHelper(8, 8, gridColor, gridColor);
    grid.position.y = 0.015;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = dark ? 0.5 : 0.62;
    scene.add(grid);

    const axes = new THREE.Group();
    const axisMaterial = new THREE.LineBasicMaterial({ color: dark ? "#a79683" : "#9d8870", transparent: true, opacity: 0.75 });
    const addAxis = (points: THREE.Vector3[]) => axes.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), axisMaterial));
    addAxis([new THREE.Vector3(-4, 0.025, -3), new THREE.Vector3(4, 0.025, -3)]);
    addAxis([new THREE.Vector3(-4, 0.025, -3), new THREE.Vector3(-4, 5, -3)]);
    addAxis([new THREE.Vector3(-4, 0.025, -3), new THREE.Vector3(-4, 0.025, 3)]);
    scene.add(axes);

    const plotted = new THREE.Group();
    const pickables: THREE.Object3D[] = [];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const addSegment = (from: Vec3, to: Vec3, color: string, opacity = 0.62) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      plotted.add(new THREE.Line(geometry, material));
    };

    spec.edges.forEach(edge => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) return;
      addSegment(from.position, to.position, edge.color, edge.opacity);
      if (edge.arrow) {
        const start = new THREE.Vector3(...from.position);
        const end = new THREE.Vector3(...to.position);
        const direction = end.clone().sub(start);
        const length = direction.length();
        if (length > 0.2) {
          const arrowLength = Math.min(0.28, length * 0.23);
          const arrowGeometry = new THREE.ConeGeometry(0.075, arrowLength, 8);
          const arrowMaterial = new THREE.MeshStandardMaterial({ color: edge.color, emissive: edge.color, emissiveIntensity: 0.12, roughness: 0.48 });
          const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
          arrow.position.copy(end).addScaledVector(direction.normalize(), -arrowLength / 2);
          arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          plotted.add(arrow);
        }
      }
    });

    spec.paths.forEach(path => {
      if (path.points.length < 2) return;
      const geometry = new THREE.BufferGeometry().setFromPoints(path.points.map(point => new THREE.Vector3(...point)));
      const material = path.dashed
        ? new THREE.LineDashedMaterial({ color: path.color, transparent: true, opacity: path.opacity ?? 0.8, dashSize: 0.18, gapSize: 0.12 })
        : new THREE.LineBasicMaterial({ color: path.color, transparent: true, opacity: path.opacity ?? 0.8 });
      const line = new THREE.Line(geometry, material);
      if (path.dashed) line.computeLineDistances();
      plotted.add(line);
    });

    spec.columns.forEach(column => {
      if (column.height <= 0) return;
      const geometry = new THREE.BoxGeometry(column.width, column.height, column.depth);
      const material = new THREE.MeshStandardMaterial({ color: column.node.color, emissive: column.node.color, emissiveIntensity: 0.08, transparent: true, opacity: 0.72, roughness: 0.5, metalness: 0.08 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(column.base[0], column.base[1] + column.height / 2, column.base[2]);
      mesh.userData.plotNodeId = column.node.id;
      plotted.add(mesh);
      pickables.push(mesh);
    });

    nodes.forEach(node => {
      const geometry = node.shape === "box"
        ? new THREE.BoxGeometry(node.radius ?? 0.18, node.radius ?? 0.18, node.radius ?? 0.18)
        : new THREE.SphereGeometry(node.radius ?? 0.15, 16, 12);
      const material = new THREE.MeshStandardMaterial({ color: node.color, emissive: node.color, emissiveIntensity: 0.16, roughness: 0.35, metalness: 0.04 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.position);
      mesh.userData.plotNodeId = node.id;
      plotted.add(mesh);
      pickables.push(mesh);
    });
    scene.add(plotted);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let frame = 0;
    const draw = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        renderer.render(scene, camera);
      });
    };
    controls.addEventListener("change", draw);
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      draw();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const hitAt = (event: PointerEvent | MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -(((event.clientY - bounds.top) / bounds.height) * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(pickables, false)[0] ?? null;
    };
    const onPointerDown = (event: PointerEvent) => { downRef.current = { x: event.clientX, y: event.clientY }; };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const hit = hitAt(event);
      const nodeId = hit?.object.userData.plotNodeId as string | undefined;
      const node = nodeId ? nodeById.get(nodeId) : undefined;
      if (!node) {
        setHovered(null);
        renderer.domElement.style.cursor = "grab";
        return;
      }
      const rect = host.getBoundingClientRect();
      setHovered(previous => previous?.node.id === node.id ? previous : {
        node,
        left: Math.max(8, Math.min(rect.width - 260, event.clientX - rect.left + 12)),
        top: Math.max(8, Math.min(rect.height - 90, event.clientY - rect.top + 12)),
      });
      renderer.domElement.style.cursor = "pointer";
    };
    const onPointerLeave = () => { setHovered(null); renderer.domElement.style.cursor = "grab"; };
    const onClick = (event: MouseEvent) => {
      const down = downRef.current;
      downRef.current = null;
      if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
      const hit = hitAt(event);
      const nodeId = hit?.object.userData.plotNodeId as string | undefined;
      if (nodeId) setSelectedId(nodeId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("click", onClick);
    resetRef.current = () => controls.reset();
    renderer.render(scene, camera);

    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onClick);
      controls.removeEventListener("change", draw);
      controls.dispose();
      resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      disposeScene(scene);
      renderer.dispose();
      host.replaceChildren();
      resetRef.current = null;
    };
  }, [spec, nodes, theme, view]);

  useEffect(() => {
    setSelectedId(null);
    setHovered(null);
  }, [spec]);

  const visibleHover = hovered && nodes.find(node => node.id === hovered.node.id) ? hovered : null;
  const activeNode = visibleHover?.node ?? selectedNode;
  const empty = nodes.length === 0 && spec.columns.length === 0 && spec.paths.length === 0;

  return <section className={`three-plot ${compact ? "three-plot-compact" : ""}`} aria-label={spec.title}>
    <div className="three-plot-header">
      <div><span className="mono three-plot-kicker">3D DATA VIEW</span><h3>{spec.title}</h3><p>{spec.description}</p></div>
      <div className="three-plot-controls" role="group" aria-label={`${spec.title} view controls`}>
        <button type="button" className={view === "3d" && !unavailable ? "active" : ""} aria-pressed={view === "3d" && !unavailable} onClick={() => setView("3d")}>3D</button>
        <button type="button" className={view === "2d" || unavailable ? "active" : ""} aria-pressed={view === "2d" || unavailable} onClick={() => setView("2d")}>2D</button>
        <button type="button" className="three-plot-reset" onClick={() => resetRef.current?.()} aria-label="Reset 3D view"><RotateCcw size={13} /></button>
      </div>
    </div>
    {spec.notice && <p className="three-plot-notice">{spec.notice}</p>}
    {empty ? <div className="three-plot-empty" role="status">{spec.emptyMessage}</div> : <>
      <details className="three-plot-guide"><summary>How to explore this graph</summary><div><ul><li>Drag with a mouse or one finger to orbit the view.</li><li>Scroll or pinch to zoom. The reset button restores the starting camera.</li><li>Choose 2D for a simpler view, or use the keyboard-accessible data list below.</li></ul><p>The 3D canvas is a visual aid; the list provides the same records without requiring spatial interaction.</p></div></details>
      <div className="three-plot-stage">
        {view === "3d" && !unavailable ? <div ref={hostRef} className="three-plot-canvas-host" aria-hidden="true" /> : <TwoDimensionalFallback spec={spec} />}
        {visibleHover && <div className="three-plot-tooltip" style={{ left: visibleHover.left, top: visibleHover.top }} role="status"><span>{visibleHover.node.label}</span><p>{visibleHover.node.detail}</p></div>}
      </div>
      <div className="three-plot-axis-labels" aria-hidden="true"><span>X · {spec.xLabel}</span><span>Y · {spec.yLabel}</span><span>Z · {spec.zLabel}</span></div>
      {unavailable && <p className="three-plot-fallback-note" role="status">WebGL is unavailable in this browser; showing the 2D view instead.</p>}
      {activeNode && <div className="three-plot-selection" aria-live="polite"><span className="mono">SELECTED DATA</span><strong>{activeNode.label}</strong><p>{activeNode.detail}</p></div>}
      <details className="three-plot-data-list"><summary>Keyboard-accessible data list · {nodes.length} items</summary><div>{nodes.map(node => <button key={node.id} type="button" aria-pressed={selectedId === node.id} onClick={() => setSelectedId(node.id)}><i style={{ background: node.color }} /><span><strong>{node.label}</strong><small>{node.detail}</small></span></button>)}</div></details>
    </>}
  </section>;
}
