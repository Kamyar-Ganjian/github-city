'use client';
import {Canvas,useFrame,useThree,ThreeEvent} from '@react-three/fiber';
import {OrbitControls,Html} from '@react-three/drei';
import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {City as CityData} from '@/lib/layout';
import {palette} from '@/lib/model';
import {useCity} from '@/lib/store';
function World({city,labels,reset,skip,capture}:{city:CityData;labels:boolean;reset:number;skip:boolean;capture:number}){
 const mesh=useRef<THREE.InstancedMesh>(null);const controls=useRef<OrbitControlsImpl>(null);const {gl,scene,camera}=useThree();const age=useRef(0);const reduced=useMemo(()=>matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);const color=useMemo(()=>new THREE.Color(),[]);const select=useCity(s=>s.select);const selected=useCity(s=>s.selected);const focus=useCity(s=>s.focus);const [hover,setHover]=useState<number|null>(null);
 const span=Math.max(city.width,city.depth);const destination=useRef(new THREE.Vector3(span*.72,span*.65,span*.82));const target=useRef(new THREE.Vector3());const moving=useRef(true);
 useEffect(()=>{age.current=0},[city]);
 useEffect(()=>{const b=city.buildings.find(b=>b.file.id===focus);target.current.set(b?.x??0,0,b?.z??0);destination.current.copy(b?new THREE.Vector3(b.x+18,b.height+23,b.z+25):new THREE.Vector3(span*.72,span*.65,span*.82));moving.current=true},[focus,reset,city,span]);
 useEffect(()=>{if(!capture)return;const output=document.createElement('canvas');output.width=1920;output.height=1080;const context=output.getContext('2d')!;gl.render(scene,camera);const canvas=gl.domElement;context.fillStyle='#090f1b';context.fillRect(0,0,1920,1080);const scale=Math.min(1920/canvas.width,1080/canvas.height);context.drawImage(canvas,(1920-canvas.width*scale)/2,(1080-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);context.fillStyle='#dbe5ed';context.font='22px sans-serif';context.fillText('GITHUB CITY / CODE, IN ANOTHER DIMENSION',50,1030);output.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='github-city.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')},[capture,gl,scene,camera]);
 useFrame((_,delta)=>{age.current+=delta;const progress=reduced||skip?1:Math.min(1,age.current/1.8);if(mesh.current){city.buildings.forEach((b,i)=>{const p=Math.max(.02,Math.min(1,progress*1.5-(i/city.buildings.length)*.45));const h=b.height*(1-Math.pow(1-p,3));dummy.position.set(b.x,h/2+.25,b.z);dummy.scale.set(1.55,h,1.55);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);color.set(b.file.id===selected?.id||i===hover?'#f5e9bf':palette[b.file.language]);mesh.current!.setColorAt(i,color)});mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true}
 if(moving.current&&controls.current){camera.position.lerp(destination.current,reduced?1:Math.min(1,delta*4));controls.current.target.lerp(target.current,reduced?1:Math.min(1,delta*4));controls.current.update();if(camera.position.distanceTo(destination.current)<.1)moving.current=false}});
 const pick=(e:ThreeEvent<MouseEvent>,focus=false)=>{e.stopPropagation();if(e.instanceId!==undefined)select(city.buildings[e.instanceId].file,focus)};
 return <><color attach="background" args={['#090f1b']}/><fog attach="fog" args={['#090f1b',span*2,span*5]}/><ambientLight intensity={.85}/><hemisphereLight args={['#bfd8ff','#222a38',1.5]}/><directionalLight position={[30,60,20]} intensity={2.5} color="#ffe7c7"/><directionalLight position={[-40,20,-30]} intensity={1.5} color="#7d9ee5"/>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.1,0]}><planeGeometry args={[span*8,span*8]}/><meshStandardMaterial color="#090f1b" roughness={1}/></mesh>
 <gridHelper args={[span*4,80,'#182536','#121c2b']} position={[0,-.05,0]}/>
 {city.districts.map(d=><group key={d.path}><mesh position={[d.x,.01+d.level*.025,d.z]}><boxGeometry args={[d.width,.08,d.depth]}/><meshStandardMaterial color={d.level%2?'#202e3d':'#172432'} roughness={.85}/></mesh>{labels&&d.level===1&&<Html position={[d.x,.4,d.z+d.depth/2-1]} center distanceFactor={100}><span className="district-label">{d.path}</span></Html>}</group>)}
 <instancedMesh ref={mesh} args={[undefined,undefined,city.buildings.length]} onClick={e=>pick(e)} onDoubleClick={e=>pick(e,true)} onPointerMove={e=>{if(e.instanceId!==undefined)setHover(e.instanceId)}} onPointerOut={()=>setHover(null)}><boxGeometry/><meshStandardMaterial roughness={.55} metalness={.15}/></instancedMesh>
 {hover!==null&&<Html position={[city.buildings[hover].x,city.buildings[hover].height+2,city.buildings[hover].z]} center><div className="tooltip">{city.buildings[hover].file.path}</div></Html>}
 <OrbitControls ref={controls} makeDefault enableDamping minDistance={5} maxDistance={span*3} maxPolarAngle={Math.PI/2.12} onStart={()=>{moving.current=false}}/>
 </>;
}
export default function City(props:Parameters<typeof World>[0]){return <Canvas dpr={[1,1.5]} camera={{position:[100,100,100],fov:42,near:.1,far:10000}} gl={{antialias:true,preserveDrawingBuffer:true}}><World {...props}/></Canvas>}
