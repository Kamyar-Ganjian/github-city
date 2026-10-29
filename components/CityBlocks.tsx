'use client';
import {useEffect,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import {ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {CityBlock} from '@/lib/whole-city';
import {palette} from '@/lib/model';
import {useCity} from '@/lib/store';

/** Explicit aggregates, initialized once. No per-frame buffer uploads. */
export default function CityBlocks({blocks}:{blocks:CityBlock[]}){
 const mesh=useRef<THREE.InstancedMesh>(null);
 const [hover,setHover]=useState<number|null>(null);
 const navigate=useCity(s=>s.navigate);
 useEffect(()=>{
  if(!mesh.current)return;
  const object=new THREE.Object3D(),color=new THREE.Color();
  blocks.forEach((block,i)=>{
   object.position.set(block.x,block.height/2+.25,block.z);
   object.scale.set(block.width,block.height,block.depth);
   object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);
   mesh.current!.setColorAt(i,color.set(palette[block.language]));
  });
  mesh.current.instanceMatrix.needsUpdate=true;
  if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  mesh.current.computeBoundingSphere();
 },[blocks]);
 const open=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(event.instanceId!==undefined)navigate(blocks[event.instanceId].directory)};
 const block=hover===null?null:blocks[hover];
 return <><instancedMesh ref={mesh} args={[undefined,undefined,blocks.length]} onClick={open} onPointerMove={event=>{if(event.instanceId!==undefined)setHover(event.instanceId)}} onPointerOut={()=>setHover(null)}>
 <boxGeometry/><meshStandardMaterial roughness={.8} metalness={.1}/>
 </instancedMesh>{block&&<Html center position={[block.x,block.height+2,block.z]}><div className="tooltip">AGGREGATE · {block.count.toLocaleString()} files<br/>Dominant language: {block.language}<br/>Click to explore {block.directory}</div></Html>}</>;
}
