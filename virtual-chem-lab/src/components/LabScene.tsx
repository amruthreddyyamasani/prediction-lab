import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import type { ReactionVisual } from "../data/reactions";

type Props={visual:ReactionVisual; progress:number; onMix:()=>void};
function Bubble({x,z,delay}:{x:number;z:number;delay:number}){const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current){const t=(clock.elapsedTime+delay)%2;ref.current.position.y=-.25+t*.75;ref.current.scale.setScalar(.65+.25*Math.sin(t*5));}});return <mesh ref={ref} position={[x,-.2,z]}><sphereGeometry args={[.045,12,12]}/><meshStandardMaterial color="#a9e8ff" emissive="#246a89" emissiveIntensity={.6}/></mesh>}
function Vessel({visual,progress,onMix}:{visual:ReactionVisual;progress:number;onMix:()=>void}){const liquid=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(liquid.current) liquid.current.scale.y=1+.025*Math.sin(clock.elapsedTime*3)});const precip=visual==="precipitate";const flame=visual==="flame";const liquidColor=visual==="flame"?"#28d7a2":visual==="precipitate"?"#e9eee8":visual==="gas"?"#4f9bdf":"#37cfc2";return <group onClick={onMix}>
 <mesh position={[-1.25,.3,.1]}><cylinderGeometry args={[.58,.47,1.45,32]}/><meshPhysicalMaterial transparent opacity={.18} roughness={.08} transmission={.8} thickness={.12}/></mesh>
 <mesh ref={liquid} position={[-1.25,-.18,.1]}><cylinderGeometry args={[.49,.4,.5,32]}/><meshStandardMaterial color={liquidColor} emissive={liquidColor} emissiveIntensity={.3} transparent opacity={.76}/></mesh>
 {visual==="gas"&&[0,1,2,3,4].map((n)=><Bubble key={n} x={-1.4+n*.08} z={.12+(n%2)*.06} delay={n*.35}/>)}
 {precip&&<mesh position={[-1.25,-.39,.1]}><cylinderGeometry args={[.4,.36,.16,28]}/><meshStandardMaterial color="#f4f5e9" roughness={.9}/></mesh>}
 <mesh position={[.65,.63,.05]} rotation={[0,0,.12]}><cylinderGeometry args={[.3,.42,1.65,28]}/><meshPhysicalMaterial transparent opacity={.16} roughness={.05} transmission={.84} thickness={.1}/></mesh>
 <mesh position={[.62,.2,.05]} rotation={[0,0,.12]}><cylinderGeometry args={[.29,.34,.45,28]}/><meshStandardMaterial color={liquidColor} emissive={liquidColor} emissiveIntensity={.25} transparent opacity={.68}/></mesh>
 <mesh position={[.2,-.53,.05]}><cylinderGeometry args={[.27,.22,.35,20]}/><meshStandardMaterial color="#282d31" metalness={.7} roughness={.26}/></mesh>
 <mesh position={[.2,-.28,.05]}><coneGeometry args={[.18,.48,24]}/><meshStandardMaterial color={flame?"#c8a4ff":"#ff9f38"} emissive={flame?"#6f37bd":"#9a3d0d"} emissiveIntensity={1.6}/></mesh>
 <mesh position={[.2,-.03,.05]}><sphereGeometry args={[.06,12,12]}/><meshStandardMaterial color="#ffd37a" emissive="#ff7a1a" emissiveIntensity={2}/></mesh>
 <mesh position={[0,.98,.2]}><boxGeometry args={[.75,.035,.03]}/><meshStandardMaterial color="#d2a7ff" emissive="#643c9c" emissiveIntensity={.6}/></mesh>
 <mesh position={[0,.99,.2]}><boxGeometry args={[.04,.18,.04]}/><meshStandardMaterial color="#d2a7ff"/></mesh>
 <mesh position={[0,1.08,.2]}><boxGeometry args={[.04,.18,.04]}/><meshStandardMaterial color="#d2a7ff"/></mesh>
 <mesh position={[0,1.18,.2]}><boxGeometry args={[.04,.18,.04]}/><meshStandardMaterial color="#d2a7ff"/></mesh>
 <group position={[0,1.35,.2]}><mesh><cylinderGeometry args={[.08,.08,.16,14]}/><meshStandardMaterial color="#d2a7ff"/></mesh></group>
 </group>}
function Bench(){return <group><mesh position={[0,-.72,0]}><boxGeometry args={[6.2,.25,3.3]}/><meshStandardMaterial color="#202629" roughness={.4} metalness={.2}/></mesh><mesh position={[0,-1.05,0]}><boxGeometry args={[6.8,.14,3.7]}/><meshStandardMaterial color="#0c1012" roughness={.7}/></mesh></group>}
export function LabScene({visual,progress,onMix}:Props){return <div className="scene-wrap"><Canvas camera={{position:[4.7,3.1,5.5],fov:38}}><ambientLight intensity={1.1}/><directionalLight position={[3,5,4]} intensity={2.4}/><pointLight position={[-2,1.8,2]} intensity={18} color="#38d7c9" distance={8}/><pointLight position={[2,1,-2]} intensity={12} color="#7e6aff" distance={8}/><Environment preset="warehouse"/><Bench/><Vessel visual={visual} progress={progress} onMix={onMix}/><ContactShadows position={[0,-.9,0]} opacity={.42} scale={7} blur={2.5}/><OrbitControls enablePan={false} minDistance={4.8} maxDistance={8}/></Canvas><div className="scene-hud"><span><i/> LIVE SIMULATION</span><small>Drag to orbit · click glassware to mix · {progress}% complete</small></div></div>}
