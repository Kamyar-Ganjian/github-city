'use client';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { environmentPlan, Prop } from '@/lib/environment';
import { UrbanPlan } from '@/lib/urban-layout';
interface Instance extends Prop {
    y: number;
    color?: string;
}
const noPick = () => { };
function PropsBatch({ items, color, shape = 'box', emissive = false }: {
    items: Instance[];
    color: string;
    shape?: 'box' | 'tree';
    emissive?: boolean;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!mesh.current)
            return;
        const object = new THREE.Object3D();
        items.forEach((p, i) => { object.position.set(p.x, p.y, p.z); object.rotation.set(0, p.rotation ?? 0, 0); object.scale.set(p.width, p.height, p.depth); object.updateMatrix(); mesh.current!.setMatrixAt(i, object.matrix); });
        mesh.current.instanceMatrix.needsUpdate = true;
        mesh.current.computeBoundingSphere();
    }, [items]);
    return <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} raycast={noPick} receiveShadow>{shape === 'tree' ? <icosahedronGeometry args={[.5, 1]}/> : <boxGeometry />}<meshStandardMaterial color={color} roughness={.9} emissive={emissive ? color : '#000000'} emissiveIntensity={emissive ? .65 : 0}/></instancedMesh>;
}
function CitySign({ title, x, z }: {
    title: string;
    x: number;
    z: number;
}) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 160;
        const context = canvas.getContext('2d');
        if (context) {
            context.fillStyle = '#d3d9d4';
            context.fillRect(0, 0, 512, 160);
            context.fillStyle = '#687974';
            context.font = '18px monospace';
            context.fillText('GITHUB CITY / ENVIRONMENT', 20, 42);
            context.fillStyle = '#314447';
            context.font = '24px sans-serif';
            context.fillText(title.length > 38 ? title.slice(0, 37) + '…' : title, 20, 100);
        }
        const value = new THREE.CanvasTexture(canvas);
        value.colorSpace = THREE.SRGBColorSpace;
        return value;
    }, [title]);
    useEffect(() => () => texture.dispose(), [texture]);
    return <Billboard follow lockX lockZ position={[x, 1.8, z]}><mesh raycast={noPick}><boxGeometry args={[4.4, 1.4, .08]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>{[-1.5, 1.5].map(offset => <mesh key={offset} position={[offset, -1.3, 0]} raycast={noPick}><boxGeometry args={[.07, 1.2, .07]}/><meshStandardMaterial color="#64736e"/></mesh>)}</Billboard>;
}
export default function Environment({ plan, dark, near, background, title, selected, focus }: {
    plan: UrbanPlan;
    dark: boolean;
    near: boolean;
    background: boolean;
    title: string;
    selected: boolean;
    focus?: {
        x: number;
        z: number;
    };
}) {
    const props = useMemo(() => environmentPlan(plan), [plan]);
    const visible = useMemo(() => { const clear = (p: Prop) => !focus || Math.hypot(p.x - focus.x, p.z - focus.z) > 3 + Math.max(p.width, p.depth) / 2; return { ...props, trees: props.trees.filter(clear), lamps: props.lamps.filter(clear), benches: props.benches.filter(clear), background: props.background.filter(clear) }; }, [props, focus]);
    const surfaces = useMemo(() => {
        const roads: Instance[] = [], walks: Instance[] = [], markings: Instance[] = [];
        for (const road of plan.roads) {
            const dx = road.bx - road.ax, dz = road.bz - road.az, length = Math.hypot(dx, dz), rotation = Math.atan2(dx, dz);
            roads.push({ id: road.id, x: (road.ax + road.bx) / 2, z: (road.az + road.bz) / 2, width: road.width, depth: length, height: .075, y: .0125, rotation });
            for (const side of [-1, 1])
                walks.push({ id: road.id + side, x: (road.ax + road.bx) / 2 - dz / length * (road.width / 2 + .14) * side, z: (road.az + road.bz) / 2 + dx / length * (road.width / 2 + .14) * side, width: .28, depth: length, height: .125, y: .0375, rotation });
            // Keep markings sparse and leave the ends clear for intersections.
            if (length > 5)
                markings.push({ id: road.id + ':mark', x: (road.ax + road.bx) / 2, z: (road.az + road.bz) / 2, width: .028, depth: Math.min(2, length - 4), height: .008, y: .057, rotation });
            if (length > 6 && markings.length < 192)
                for (let stripe = 0; stripe < 4; stripe++) {
                    const distance = 1.2 + stripe * .2;
                    markings.push({ id: road.id + ':cross' + stripe, x: road.ax + dx / length * distance, z: road.az + dz / length * distance, width: road.width * .82, depth: .085, height: .008, y: .058, rotation });
                }
        }
        return { roads, walks, markings };
    }, [plan]);
    const parks = useMemo(() => props.parks.map(p => ({ ...p, y: p.height / 2 })), [props]);
    const plazas = useMemo(() => props.plazas.map(p => ({ ...p, y: p.height / 2 })), [props]);
    const trunks = useMemo(() => visible.trees.map(p => ({ ...p, y: .45, width: .07, depth: .07, height: .7 })), [visible]);
    const crowns = useMemo(() => visible.trees.map(p => ({ ...p, y: .75 + p.height / 2 })), [visible]);
    const poles = useMemo(() => visible.lamps.map(p => ({ ...p, y: p.height / 2 + .1, width: .045, depth: .045 })), [visible]);
    const bulbs = useMemo(() => visible.lamps.map(p => ({ ...p, y: p.height + .1, width: .2, depth: .14, height: .07 })), [visible]);
    const benches = useMemo(() => visible.benches.map(p => ({ ...p, y: .22 })), [visible]);
    const backdrops = useMemo(() => visible.background.map(p => ({ ...p, y: p.height / 2 + .1 })), [visible]);
    return <group>
  <PropsBatch items={surfaces.roads} color={dark ? '#252e38' : '#59616a'}/>
  <PropsBatch items={surfaces.walks} color={dark ? '#626a6d' : '#bbc0bc'}/>
  <PropsBatch items={surfaces.markings} color="#c6c4ac"/>
  <PropsBatch items={parks} color={dark ? '#435d4e' : '#9aaf91'}/>
  <PropsBatch items={plazas} color={dark ? '#626363' : '#c2bcae'}/>
  <group visible={near}><PropsBatch items={trunks} color="#6d6150"/><PropsBatch items={crowns} color={dark ? '#496756' : '#729472'} shape="tree"/>
   <PropsBatch items={poles} color="#59636a"/><PropsBatch items={bulbs} color="#e9d7a3" emissive={dark}/><PropsBatch items={benches} color="#8a7d66"/>
   {background && <PropsBatch items={backdrops} color={dark ? '#3d464d' : '#9ba3a5'}/>}
  </group>
  {near && !selected && <CitySign title={title} x={-plan.bounds.width / 2 + 2} z={plan.bounds.depth / 2 + 1}/>}
 </group>;
}
