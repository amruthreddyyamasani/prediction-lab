import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { ForecastRecord, ForecastVersion } from "@shared/types";

type HistoryTrace = {
  id: string;
  question: string;
  status: ForecastRecord["status"];
  versions: ForecastVersion[];
};
type PlottedVersion = {
  id: string;
  forecastId: string;
  question: string;
  versionNumber: number;
  timestamp: number;
  probability: number;
  x: number;
  y: number;
  z: number;
};
type HoverCard = { point: PlottedVersion; left: number; top: number };

const MAX_TRACES = 24;
const GRAPH_WIDTH = 10;
const GRAPH_HEIGHT = 5;
const GRAPH_DEPTH = 6;
const PALETTE = ["#ff8245", "#d8a052", "#c87549", "#e9aa72", "#bb6548", "#e18143"];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function removeGroupObjects(group: THREE.Group) {
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach(item => item.dispose());
      else material.dispose();
    }
  });
  group.clear();
}

function makeRibbon(points: PlottedVersion[], color: THREE.Color) {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point.x, point.y, point.z)), false, "centripetal");
  const segments = Math.max(16, (points.length - 1) * 12);
  const samples = curve.getPoints(segments);
  const vertices: number[] = [];
  const indices: number[] = [];
  samples.forEach(point => vertices.push(point.x, point.y, point.z, point.x, 0.035, point.z));
  for (let index = 0; index < samples.length - 1; index++) {
    const top = index * 2;
    const next = top + 2;
    indices.push(top, top + 1, next, top + 1, next + 1, next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.09, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false, roughness: 0.65 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return { curve, ribbon: mesh };
}

export default function ForecastHistory3D({ records, loading = false, theme }: { records: ForecastRecord[]; loading?: boolean; theme: "light" | "dark" }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);
  const markerMeshesRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const resetCameraRef = useRef<(() => void) | null>(null);
  const [timeProgress, setTimeProgress] = useState(100);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [, navigate] = useLocation();

  const traces = useMemo<HistoryTrace[]>(() => records
    .filter(record => record.versions?.length)
    .slice()
    .sort((a, b) => (b.versions.at(-1)?.created_at ?? b.updated_at).localeCompare(a.versions.at(-1)?.created_at ?? a.updated_at))
    .slice(0, MAX_TRACES)
    .map(record => ({ ...record, versions: record.versions.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)) })), [records]);

  const fullPointList = useMemo(() => traces.flatMap(trace => trace.versions.map(version => ({ trace, version, timestamp: new Date(version.created_at).getTime() })).filter(item => Number.isFinite(item.timestamp))), [traces]);
  const minTime = fullPointList.length ? Math.min(...fullPointList.map(point => point.timestamp)) : 0;
  const maxTime = fullPointList.length ? Math.max(...fullPointList.map(point => point.timestamp)) : 0;
  const timeSpan = maxTime - minTime;
  const scrubTime = minTime + timeSpan * (timeProgress / 100);
  const visibleTraces = useMemo(() => traces.map((trace, traceIndex) => {
    const laneZ = traces.length <= 1 ? 0 : ((traceIndex / (traces.length - 1)) - 0.5) * GRAPH_DEPTH;
    const versions = trace.versions.filter(version => {
      const timestamp = new Date(version.created_at).getTime();
      return timeProgress === 100 || timestamp <= scrubTime + 1;
    });
    return {
      ...trace,
      points: versions.map(version => {
        const timestamp = new Date(version.created_at).getTime();
        const x = timeSpan > 0 ? ((timestamp - minTime) / timeSpan) * GRAPH_WIDTH : GRAPH_WIDTH / 2;
        return {
          id: `${trace.id}:${version.id}`,
          forecastId: trace.id,
          question: trace.question,
          versionNumber: version.version_number,
          timestamp,
          probability: version.probability,
          x,
          y: THREE.MathUtils.clamp(version.probability, 0, 1) * GRAPH_HEIGHT,
          z: laneZ,
        } satisfies PlottedVersion;
      }),
    };
  }), [traces, timeProgress, scrubTime, timeSpan, minTime]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setWebglUnavailable(true);
      return;
    }
    setWebglUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "forecast-history-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const dark = theme === "dark";
    const gridColor = new THREE.Color(dark ? "#4a423c" : "#c9beaf");
    const axisColor = new THREE.Color(dark ? "#9b8572" : "#94745a");
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.set(13, 10, 13);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 9;
    controls.maxDistance = 25;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.48;
    controls.update();
    resetCameraRef.current = () => {
      camera.position.set(13, 10, 13);
      controls.target.set(GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2, 0);
      controls.update();
    };

    scene.add(new THREE.HemisphereLight(dark ? 0xf6e5d5 : 0xffffff, dark ? 0x201712 : 0x7d6250, dark ? 1.5 : 1.2));
    const keyLight = new THREE.DirectionalLight(dark ? 0xffb17e : 0xf4a16a, dark ? 2.1 : 1.6);
    keyLight.position.set(4, 10, 7);
    scene.add(keyLight);
    const grid = new THREE.GridHelper(GRAPH_WIDTH, 10, gridColor, gridColor);
    grid.position.set(GRAPH_WIDTH / 2, 0.012, 0);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = dark ? 0.45 : 0.58;
    scene.add(grid);

    const axisMaterial = new THREE.LineBasicMaterial({ color: axisColor, transparent: true, opacity: 0.9 });
    const addAxis = (points: THREE.Vector3[]) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), axisMaterial));
    addAxis([new THREE.Vector3(0, 0.025, -GRAPH_DEPTH / 2), new THREE.Vector3(GRAPH_WIDTH, 0.025, -GRAPH_DEPTH / 2)]);
    addAxis([new THREE.Vector3(0, 0.025, -GRAPH_DEPTH / 2), new THREE.Vector3(0, GRAPH_HEIGHT, -GRAPH_DEPTH / 2)]);
    addAxis([new THREE.Vector3(0, 0.025, -GRAPH_DEPTH / 2), new THREE.Vector3(0, 0.025, GRAPH_DEPTH / 2)]);
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);
    graphGroupRef.current = graphGroup;

    const resize = () => {
      if (!host || !host.clientWidth || !host.clientHeight) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    let pointerDown: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hit = raycasterRef.current.intersectObjects(markerMeshesRef.current, false)[0];
      if (!hit) {
        setHoverCard(null);
        renderer.domElement.style.cursor = "grab";
        return;
      }
      const point = hit.object.userData.historyPoint as PlottedVersion;
      const hostRect = host.getBoundingClientRect();
      const left = Math.max(8, Math.min(hostRect.width - 240, event.clientX - hostRect.left + 13));
      const top = Math.max(8, Math.min(hostRect.height - 90, event.clientY - hostRect.top - 15));
      renderer.domElement.style.cursor = "pointer";
      setHoverCard(previous => previous?.point.id === point.id ? previous : { point, left, top });
    };
    const onPointerLeave = () => { setHoverCard(null); renderer.domElement.style.cursor = "grab"; };
    const onClick = (event: MouseEvent) => {
      if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hit = raycasterRef.current.intersectObjects(markerMeshesRef.current, false)[0];
      if (hit) navigate(`/predictions/${(hit.object.userData.historyPoint as PlottedVersion).forecastId}`);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("click", onClick);

    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.dispose();
      removeGroupObjects(graphGroup);
      scene.traverse(object => {
        if (object instanceof THREE.GridHelper) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
        if (object instanceof THREE.Line && object.parent === scene) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
      axisMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      graphGroupRef.current = null;
      markerMeshesRef.current = [];
      resetCameraRef.current = null;
    };
  }, [navigate, theme]);

  useEffect(() => {
    const group = graphGroupRef.current;
    if (!group) return;
    removeGroupObjects(group);
    markerMeshesRef.current = [];
    const dark = theme === "dark";
    const cursorX = timeSpan ? (scrubTime - minTime) / timeSpan * GRAPH_WIDTH : GRAPH_WIDTH / 2;
    const cursorGeometry = new THREE.BoxGeometry(0.018, GRAPH_HEIGHT, 0.018);
    const cursorMaterial = new THREE.MeshBasicMaterial({ color: dark ? "#ff8245" : "#d2743f", transparent: true, opacity: 0.72 });
    const cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    cursor.position.set(cursorX, GRAPH_HEIGHT / 2, -GRAPH_DEPTH / 2 - 0.06);
    group.add(cursor);

    visibleTraces.forEach((trace, traceIndex) => {
      if (!trace.points.length) return;
      const color = new THREE.Color(PALETTE[traceIndex % PALETTE.length]);
      const ribbonData = makeRibbon(trace.points, color);
      if (ribbonData) {
        group.add(ribbonData.ribbon);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(ribbonData.curve, Math.max(16, (trace.points.length - 1) * 12), 0.025, 5, false), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.42, roughness: 0.34, metalness: 0.08 }));
        group.add(tube);
      }
      trace.points.forEach(point => {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.3 }));
        marker.position.set(point.x, point.y, point.z);
        marker.userData.historyPoint = point;
        group.add(marker);
        markerMeshesRef.current.push(marker);
      });
    });
    setHoverCard(null);
  }, [visibleTraces, timeSpan, scrubTime, minTime, theme]);

  const sliderEnabled = fullPointList.length > 1 && maxTime > minTime;
  const visibleVersionCount = visibleTraces.reduce((sum, trace) => sum + trace.points.length, 0);
  const visibleTraceCount = visibleTraces.filter(trace => trace.points.length > 0).length;
  const onResetView = () => {
    resetCameraRef.current?.();
    setTimeProgress(100);
  };

  return <section className="analysis-panel history-3d-panel">
    <div className="panel-title"><div><span className="panel-index">C</span><h2>Probability history · 3D</h2></div><span className="mono panel-note">saved forecast versions</span></div>
    <p className="history-3d-intro">Each ribbon follows the probability updates on one of your saved forecasts. Drag to orbit, scroll to zoom, and scrub through time.</p>
    <div className={`history-3d-stage ${webglUnavailable ? "is-unavailable" : ""}`}>
      <div className="history-3d-axis-y"><span>100%</span><span>50%</span><span>0%</span></div>
      <div className="history-3d-axis-x"><span>EARLIER</span><span>LATER</span></div>
      <div className="history-3d-depth-label mono">FORECAST DEPTH</div>
      <div ref={hostRef} className="history-3d-canvas-host" aria-label="Three-dimensional probability histories by saved forecast." />
      {hoverCard && <div className="history-3d-tooltip" style={{ left: hoverCard.left, top: hoverCard.top }}>
        <span className="mono">VERSION {String(hoverCard.point.versionNumber).padStart(2, "0")} · {formatDate(hoverCard.point.timestamp)}</span>
        <strong>{Math.round(hoverCard.point.probability * 100)}% probability</strong>
        <span>{hoverCard.point.question}</span>
        <small>Click marker to open forecast</small>
      </div>}
      {webglUnavailable && <div className="history-3d-fallback"><strong>3D rendering is unavailable in this browser.</strong><span>Your saved version timeline is still available below.</span></div>}
      {loading && <div className="history-3d-loading">Loading saved version history…</div>}
      {!loading && traces.length === 0 && <div className="history-3d-empty"><strong>Your forecast history will appear here.</strong><span>Create a forecast, then update its probability to form a timeline.</span><Link href="/">Start a forecast <ArrowUpRight size={14} /></Link></div>}
      <div className="history-3d-hint"><span>DRAG TO ORBIT</span><i /> <span>SCROLL TO ZOOM</span></div>
    </div>
    {traces.length > 0 && <>
      <div className="history-3d-scrubber"><div className="history-3d-scrubber-head"><label htmlFor="history-time-scrubber">TIME SCRUBBER</label><span>{sliderEnabled ? formatDate(scrubTime) : fullPointList[0] ? formatDate(fullPointList[0].timestamp) : "No versions"}</span></div><input id="history-time-scrubber" type="range" min="0" max="100" value={timeProgress} disabled={!sliderEnabled} onChange={event => setTimeProgress(Number(event.target.value))} aria-label="Scrub probability history over time" /><div className="history-3d-scrubber-foot"><span>{minTime ? formatDate(minTime) : "—"}</span><span>{visibleVersionCount} / {fullPointList.length} versions · {visibleTraceCount} forecasts</span><span>{maxTime ? formatDate(maxTime) : "—"}</span></div></div>
      <div className="history-3d-ledger" aria-label="Accessible list of plotted forecasts">{traces.slice(0, 8).map(trace => {
        const latest = trace.versions.at(-1);
        return <Link href={`/predictions/${trace.id}`} key={trace.id} className="history-3d-ledger-row"><span className="history-3d-swatch" style={{ background: PALETTE[traces.indexOf(trace) % PALETTE.length] }} /><strong>{trace.question}</strong><small>{trace.versions.length} {trace.versions.length === 1 ? "version" : "versions"}</small><b>{latest ? `${Math.round(latest.probability * 100)}%` : "—"}</b><ArrowUpRight size={13} /></Link>;
      })}{traces.length > 8 && <span className="history-3d-ledger-more">Showing the {traces.length} most recently updated forecasts; first 8 listed above.</span>}</div>
    </>}
    <button type="button" className="history-3d-reset" onClick={onResetView}><RotateCcw size={13} /> Show latest</button>
  </section>;
}
