import { useState } from "react";

const nodes = [
  { x: 18, y: 35, z: 1, value: "0.18" },
  { x: 32, y: 64, z: 2, value: "0.42" },
  { x: 48, y: 24, z: 3, value: "0.70" },
  { x: 67, y: 52, z: 2, value: "0.55" },
  { x: 78, y: 28, z: 1, value: "0.31" },
  { x: 84, y: 72, z: 3, value: "0.83" },
];

export default function ObservatoryField({ compact = false }: { compact?: boolean }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  return (
    <div
      className={`observatory-field ${compact ? "is-compact" : ""}`}
      style={{ "--pointer-x": `${pointer.x}deg`, "--pointer-y": `${pointer.y}deg` } as React.CSSProperties}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({ x: ((event.clientX - rect.left) / rect.width - 0.5) * 10, y: ((event.clientY - rect.top) / rect.height - 0.5) * -8 });
      }}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
      aria-label="Interactive probability field"
      role="img"
    >
      <div className="observatory-scanline" />
      <div className="observatory-corner corner-tl">FIELD / 01</div>
      <div className="observatory-corner corner-br">x 04.21 · y 08.70</div>
      <div className="field-depth-plane plane-back" />
      <div className="field-depth-plane plane-front" />
      <div className="field-orbit orbit-one" />
      <div className="field-orbit orbit-two" />
      <div className="field-orbit orbit-three" />
      <div className="field-core"><span>?</span></div>
      <div className="field-core-glow" />
      <svg className="field-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M18 35 C31 45 30 63 48 24 C63 34 67 52 78 28 C75 58 84 72 67 52 C54 73 32 64 18 35" />
        <path d="M48 24 C48 47 55 60 67 52" />
      </svg>
      {nodes.map((node, index) => <div key={node.value} className={`field-node node-${index + 1}`} style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: node.z }}><span className="node-dot" /><span className="node-value">{node.value}</span></div>)}
      <div className="field-readout readout-top"><span>probability field</span><strong>LIVE SIMULATION</strong></div>
      <div className="field-readout readout-bottom"><span>uncertainty</span><strong>σ 0.24</strong></div>
    </div>
  );
}
