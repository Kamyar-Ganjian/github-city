'use client';
import {Canvas,useFrame,useThree,ThreeEvent} from '@react-three/fiber';
import {OrbitControls,Html} from '@react-three/drei';
import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls as Controls} from 'three-stdlib';
import {City as CityData,Building,District} from '@/lib/layout';
import {landmark,palette} from '@/lib/model';
import {cityView,districtCounts} from '@/lib/view';
import {useCity} from '@/lib/store';

export interface SceneProps {city:CityData;labels:boolean;reset:number;skip:boolean;capture:number;page:number;tour:boolean;onFailure:()=>void}
const object=new THREE.Object3D();
function Buildings({buildings,skip}:{buildings:Building[];skip:boolean}){
 const body=useRef<THREE.InstancedMesh>(null);const roof=useRef<THREE.InstancedMesh>(null);
 const selected=useCity(s=>s.selected);const select=useCity(s=>s.select);const [hover,setHover]=useState<number|null>(null);
 const elapsed=useRef(0);const finished=useRef(false);const reduced=useMemo(()=>matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const material=useMemo(()=>{const m=new THREE.MeshStandardMaterial({roughness:.7,metalness:.12});m.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 vCityPosition; varying vec3 vCityNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPosition=(modelMatrix * instanceMatrix * vec4(position,1.0)).xyz; vCityNormal=normal;');
 shader.fragmentShader='varying vec3 vCityPosition; varying vec3 vCityNormal;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat side=1.0-step(0.5,abs(vCityNormal.y)); float horizontal=abs(vCityNormal.x)>0.5?vCityPosition.z:vCityPosition.x; float windowMask=step(0.28,fract(horizontal*2.4))*step(0.26,fract(vCityPosition.y*0.95))*step(fract(vCityPosition.y*0.95),0.70)*side; diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*0.33+vec3(0.07,0.09,0.10),windowMask*0.75);');
 };return m},[]);
 useEffect(()=>()=>material.dispose(),[material]);
 useEffect(()=>{elapsed.current=0;finished.current=false;if(!body.current||!roof.current)return;const color=new THREE.Color();buildings.forEach((b,i)=>{color.set(palette[b.file.language]);body.current!.setColorAt(i,color);roof.current!.setColorAt(i,new THREE.Color(landmark(b.file)?'#e9d3a3':'#293b4c'))});if(body.current.instanceColor)body.current.instanceColor.needsUpdate=true;if(roof.current.instanceColor)roof.current.instanceColor.needsUpdate=true},[buildings]);
 useFrame((_,dt)=>{if(finished.current||!body.current||!roof.current)return;elapsed.current+=dt;const progress=reduced||skip?1:Math.min(1,elapsed.current/1.35);
 buildings.forEach((b,i)=>{const p=Math.max(.01,Math.min(1,progress*1.25-i/Math.max(1,buildings.length)*.25));const h=b.height*(1-(1-p)**3);object.position.set(b.x,h/2+.25,b.z);object.scale.set(1.55,h,1.55);object.updateMatrix();body.current!.setMatrixAt(i,object.matrix);
 object.position.y=h+.3;object.scale.set(landmark(b.file)?1.7:1.4,.16,landmark(b.file)?1.7:1.4);object.updateMatrix();roof.current!.setMatrixAt(i,object.matrix)});
 body.current.instanceMatrix.needsUpdate=true;roof.current.instanceMatrix.needsUpdate=true;body.current.computeBoundingSphere();roof.current.computeBoundingSphere();finished.current=progress===1;
 });
 const pick=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(event.instanceId!==undefined)select(buildings[event.instanceId].file,true)};
 const highlighted=buildings.find(b=>b.file.id===selected?.id)??(hover!==null?buildings[hover]:null);
 return <><instancedMesh ref={body} args={[undefined,undefined,buildings.length]} material={material} onClick={pick} onPointerMove={event=>{if(event.instanceId!==undefined)setHover(event.instanceId)}} onPointerOut={()=>setHover(null)}><boxGeometry/></instancedMesh>
 <instancedMesh ref={roof} args={[undefined,undefined,buildings.length]} onClick={pick}><boxGeometry/><meshStandardMaterial roughness={.5} metalness={.25}/></instancedMesh>
 {highlighted&&<group position={[highlighted.x,0,highlighted.z]}><mesh rotation={[-Math.PI/2,0,0]} position={[0,.24,0]}><ringGeometry args={[1.25,1.48,40]}/><meshBasicMaterial color="#f1d6a0" side={THREE.DoubleSide}/></mesh><Html center position={[0,highlighted.height+1.6,0]}><div className="tooltip">{highlighted.file.name}</div></Html></group>}</>;
}
function Foundations({districts,aggregate,counts,labels}:{districts:District[];aggregate:boolean;counts:Map<string,number>;labels:boolean}){
 const mesh=useRef<THREE.InstancedMesh>(null);const navigate=useCity(s=>s.navigate);
 useEffect(()=>{if(!mesh.current)return;const color=new THREE.Color();districts.forEach((d,i)=>{const h=aggregate?Math.min(12,1+Math.log2((counts.get(d.path)??0)+1)):.12;object.position.set(d.x,h/2+.02,d.z);object.scale.set(aggregate?d.width*.82:d.width-.5,h,aggregate?d.depth*.82:d.depth-.5);object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);color.set(i%2?'#273743':'#20313e');mesh.current!.setColorAt(i,color)});mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere()},[districts,aggregate,counts]);
 return <><instancedMesh ref={mesh} args={[undefined,undefined,districts.length]} onClick={e=>{e.stopPropagation();if(e.instanceId!==undefined)navigate(districts[e.instanceId].path)}}><boxGeometry/><meshStandardMaterial roughness={.95}/></instancedMesh>
 {labels&&districts.slice(0,40).map(d=><Html key={d.path} center position={[d.x,aggregate?Math.min(12,1+Math.log2((counts.get(d.path)??0)+1))+1:.3,d.z+d.depth/2-1]} distanceFactor={Math.max(40,Math.min(d.width,d.depth)*2)} zIndexRange={[3,0]}><button className="district-label" onClick={()=>navigate(d.path)}>{d.path.split('/').pop()} <span>↗</span>{aggregate&&<small>AGGREGATE · {(counts.get(d.path)??0).toLocaleString()} FILES</small>}</button></Html>)}</>;
}
function World({city,labels,reset,skip,capture,page,tour,onFailure}:SceneProps){
 const controls=useRef<Controls>(null);const {gl,scene,camera,size}=useThree();const district=useCity(s=>s.district);const focus=useCity(s=>s.focus);const revision=useCity(s=>s.revision);
 const view=useMemo(()=>cityView(city,district,page),[city,district,page]);const counts=useMemo(()=>districtCounts(city),[city]);const visibleDistricts=useMemo(()=>view.children.slice(0,512),[view.children]);
 const reduced=useMemo(()=>matchMedia('(prefers-reduced-motion: reduce)').matches,[]);const destination=useRef(new THREE.Vector3());const target=useRef(new THREE.Vector3());const moving=useRef(true);
 const span=Math.max(city.width,city.depth);const tourAge=useRef(0);
 useEffect(()=>{const element=gl.domElement;const lost=(event:Event)=>{event.preventDefault();onFailure()};element.addEventListener('webglcontextlost',lost);return()=>element.removeEventListener('webglcontextlost',lost)},[gl,onFailure]);
 useEffect(()=>{
 const building=focus?city.buildings.find(b=>b.file.id===focus):null;const d=view.district;
 const x=building?.x??d.x,z=building?.z??d.z;const h=building?.height??0;
 const fov=THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);const aspect=size.width/size.height;
 const radius=building?Math.max(10,h*.9):Math.hypot(d.width,d.depth)/2;
 const distance=radius/Math.sin(Math.min(fov,2*Math.atan(Math.tan(fov/2)*aspect))/2)*1.18;
 target.current.set(x,h*.35,z);destination.current.set(x+distance*.57,h*.35+distance*.65,z+distance*.57);moving.current=true;tourAge.current=0;
 },[city,focus,revision,reset,view.district,camera,size]);
 useEffect(()=>{if(tour&&controls.current){destination.current.copy(camera.position);target.current.copy(controls.current.target);tourAge.current=0;moving.current=false}},[tour,camera]);
 useFrame((_,dt)=>{if(!controls.current)return;const alpha=reduced?1:1-Math.exp(-4.5*Math.min(dt,.1));
 if(moving.current){camera.position.lerp(destination.current,alpha);controls.current.target.lerp(target.current,alpha);controls.current.update();if(camera.position.distanceTo(destination.current)<.05&&controls.current.target.distanceTo(target.current)<.05)moving.current=false}
 else if(tour&&!reduced){tourAge.current+=Math.min(dt,.1);const angle=tourAge.current*.12;const offset=destination.current.clone().sub(target.current);const x=offset.x*Math.cos(angle)+offset.z*Math.sin(angle);const z=offset.z*Math.cos(angle)-offset.x*Math.sin(angle);camera.position.set(target.current.x+x,destination.current.y,target.current.z+z);controls.current.target.copy(target.current);controls.current.update()}
 });
 useEffect(()=>{if(!capture)return;gl.render(scene,camera);const output=document.createElement('canvas');output.width=1920;output.height=1080;const ctx=output.getContext('2d');if(!ctx)return;const canvas=gl.domElement;ctx.fillStyle='#0c151e';ctx.fillRect(0,0,1920,1080);const scale=Math.min(1920/canvas.width,1080/canvas.height);ctx.drawImage(canvas,(1920-canvas.width*scale)/2,(1080-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);ctx.fillStyle='#d9d4c4';ctx.font='18px monospace';ctx.fillText('GITHUB CITY  /  ARCHITECTURE OF CODE',40,1010);ctx.font='13px monospace';ctx.fillText(view.aggregate?'DISTRICT AGGREGATES / '+view.descendantCount.toLocaleString()+' FILES / '+district:'INDIVIDUAL FILE BUILDINGS / '+district,40,1040);output.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='github-city.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')},[capture,gl,scene,camera,view.aggregate,view.descendantCount,district]);
 return <><color attach="background" args={['#0c151e']}/><fog attach="fog" args={['#0c151e',span*2.5,span*6]}/>
 <ambientLight intensity={.65}/><hemisphereLight args={['#d2e5ed','#35404a',1.9]}/><directionalLight position={[40,80,35]} intensity={3} color="#ffdfaf"/><directionalLight position={[-50,30,-40]} intensity={1.8} color="#9bb6d1"/>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]}><planeGeometry args={[span*10,span*10]}/><meshStandardMaterial color="#101d27" roughness={1}/></mesh>
 <gridHelper args={[span*4,100,'#253743','#182934']} position={[0,-.09,0]}/>
 <mesh position={[view.district.x,-.04,view.district.z]}><boxGeometry args={[view.district.width,.13,view.district.depth]}/><meshStandardMaterial color="#182a36"/></mesh>
 <Foundations districts={visibleDistricts} aggregate={view.aggregate} counts={counts} labels={labels}/>
 <Buildings key={district+':'+page+':'+view.buildings.length} buildings={view.buildings} skip={skip}/>
 <OrbitControls ref={controls} enabled={!tour||reduced} makeDefault enableDamping dampingFactor={.08} rotateSpeed={.65} zoomSpeed={.8} panSpeed={.75} screenSpacePanning={false} minDistance={5} maxDistance={span*4} minPolarAngle={.12} maxPolarAngle={Math.PI/2.35} onStart={()=>{moving.current=false}}/>
 </>;
}
export default function City(props:SceneProps){return <Canvas dpr={[1,1.5]} camera={{position:[100,100,100],fov:40,near:.2,far:Math.max(props.city.width,props.city.depth)*15+100}} gl={{antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}}><World {...props}/></Canvas>}
