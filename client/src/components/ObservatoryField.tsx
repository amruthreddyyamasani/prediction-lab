import { useEffect, useRef } from "react";

type Point3 = { x: number; y: number; z: number; phase: number; value?: string };

const seed = (count: number): Point3[] => Array.from({ length: count }, (_, index) => {
  const theta = (index * 2.399963) % (Math.PI * 2);
  const y = 1 - (index / (count - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, phase: (index * 1.73) % (Math.PI * 2) };
});

const particles = seed(112);
const labels = ["0.18", "0.42", "0.70", "0.55", "0.31", "0.83"];

export default function ObservatoryField({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    if (!canvas || !field) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const rect = field.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = (point: Point3, rotation: number, tilt: number, scale: number) => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rx = point.x * cos - point.z * sin;
      const rz = point.x * sin + point.z * cos;
      const ry = point.y * Math.cos(tilt) - rz * Math.sin(tilt);
      const depth = rz * Math.cos(tilt) + point.y * Math.sin(tilt);
      const perspective = 1 / (1.55 - depth * 0.58);
      return { x: width * .51 + rx * scale * perspective, y: height * .5 + ry * scale * perspective, depth, perspective };
    };
    const draw = (time: number) => {
      const isDark = document.documentElement.classList.contains("dark");
      const accent = isDark ? "#E88950" : "#E07A3F";
      const navy = isDark ? "#F4F5F6" : "#17233C";
      const muted = isDark ? "#AEB7C4" : "#626B78";
      const line = isDark ? "rgba(174,183,196,.18)" : "rgba(23,35,60,.12)";
      const bg = isDark ? "#172033" : "#F7F7F4";
      const progress = Number(getComputedStyle(document.documentElement).getPropertyValue("--scroll-progress")) || 0;
      pointer.current.x += (pointer.current.targetX - pointer.current.x) * .06;
      pointer.current.y += (pointer.current.targetY - pointer.current.y) * .06;
      const rotation = (reducedMotion.matches ? .35 : time * .00016) + pointer.current.x * .35 + progress * .8;
      const tilt = pointer.current.y * .2 + Math.sin(time * .00035) * .06;
      const scale = Math.min(width, height) * (compact ? .34 : .42);
      context.clearRect(0, 0, width, height);
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = .4;
      context.strokeStyle = line;
      context.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const y = height * .72 + i * 18 + progress * 16;
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y - 18); context.stroke();
        const x = width * .5 + i * 32;
        context.beginPath(); context.moveTo(width * .5, height * .52); context.lineTo(x, height); context.stroke();
      }
      context.restore();

      const projected = particles.map((point, index) => ({ ...project(point, rotation + Math.sin(time * .0002 + point.phase) * .08, tilt, scale), index }));
      context.save();
      context.globalAlpha = .23;
      context.strokeStyle = accent;
      context.lineWidth = 1;
      for (let i = 0; i < projected.length; i += 1) {
        const point = projected[i];
        const nearby = projected.filter((candidate, j) => j > i && Math.hypot(candidate.x - point.x, candidate.y - point.y) < scale * .25).slice(0, 2);
        nearby.forEach(candidate => { context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(candidate.x, candidate.y); context.stroke(); });
      }
      context.restore();

      projected.sort((a, b) => a.depth - b.depth).forEach((point, index) => {
        const radius = Math.max(1.1, 3.2 * point.perspective);
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(224,122,63,${.2 + point.perspective * .25})`;
        context.fill();
        if (index % 17 === 0 && point.depth > .1) { context.beginPath(); context.arc(point.x, point.y, radius * 2.8, 0, Math.PI * 2); context.strokeStyle = `rgba(224,122,63,${.2 * point.perspective})`; context.stroke(); }
      });

      const coreX = width * .51;
      const coreY = height * .5;
      const glow = context.createRadialGradient(coreX, coreY, 3, coreX, coreY, scale * .3);
      glow.addColorStop(0, `${accent}66`); glow.addColorStop(1, `${accent}00`);
      context.fillStyle = glow; context.beginPath(); context.arc(coreX, coreY, scale * .3, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(coreX, coreY, compact ? 20 : 31, 0, Math.PI * 2); context.fillStyle = isDark ? "#1E293B" : "#F7F7F4"; context.fill(); context.strokeStyle = accent; context.lineWidth = 1.2; context.stroke();
      context.fillStyle = accent; context.font = `${compact ? 12 : 18}px IBM Plex Mono, monospace`; context.textAlign = "center"; context.fillText("?", coreX, coreY + (compact ? 4 : 6));

      const visibleLabels = compact ? labels.filter((_, index) => index % 2 === 0) : labels;
      visibleLabels.forEach((label, index) => {
        const anchor = projected[(index * 19 + 9) % projected.length];
        if (!anchor || anchor.depth < -.25) return;
        context.fillStyle = accent;
        context.strokeStyle = `${accent}99`;
        context.font = `${compact ? 8 : 10}px IBM Plex Mono, monospace`;
        context.strokeRect(anchor.x + 5, anchor.y - 9, compact ? 28 : 37, compact ? 14 : 17);
        context.fillText(label, anchor.x + (compact ? 19 : 24), anchor.y + 2);
      });
      context.fillStyle = muted; context.font = "9px IBM Plex Mono, monospace"; context.textAlign = "right"; context.fillText(`DEPTH ${(1 - progress).toFixed(2)}`, width - 20, height - 44);
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => { const rect = field.getBoundingClientRect(); pointer.current.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2; pointer.current.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2; };
    const resetPointer = () => { pointer.current.targetX = 0; pointer.current.targetY = 0; };
    resize(); draw(performance.now());
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    field.addEventListener("pointermove", onPointer); field.addEventListener("pointerleave", resetPointer);
    return () => { if (frame) window.cancelAnimationFrame(frame); observer.disconnect(); field.removeEventListener("pointermove", onPointer); field.removeEventListener("pointerleave", resetPointer); };
  }, [compact]);

  return <div ref={fieldRef} className={`observatory-field ${compact ? "is-compact" : ""}`} aria-label="Animated 3D probability field" role="img"><canvas ref={canvasRef} /><div className="observatory-corner corner-tl">FIELD / 01</div><div className="observatory-corner corner-br">x 04.21 · y 08.70</div><div className="field-readout readout-top"><span>probability field</span><strong>INTERACTIVE FIELD</strong></div><div className="field-readout readout-bottom"><span>uncertainty</span><strong>dynamic</strong></div></div>;
}
