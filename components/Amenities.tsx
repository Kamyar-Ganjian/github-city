'use client';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { vehicleKinds, type Amenities as AmenitiesPlan, type VehicleKind, type FacilityKind, type WaterFeature } from '@/lib/amenities';
import type { Prop } from '@/lib/environment';
import { vehicleGeometry, facilityGeometry, waterGeometry, parkingGeometry } from './amenity-geometry';

interface Instance extends Prop { color?: string }
const noPick = () => {};
function Batch({ items, geometry, y = .05, color = '#ffffff', water = false }: {
    items: Instance[]; geometry: THREE.BufferGeometry; y?: number; color?: string; water?: boolean;
}) {
    const ref = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!ref.current) return;
        const object = new THREE.Object3D(), tint = new THREE.Color();
        items.forEach((p, i) => {
            object.position.set(p.x, y, p.z); object.rotation.set(0, p.rotation ?? 0, 0); object.scale.set(p.width, p.height, p.depth); object.updateMatrix();
            ref.current!.setMatrixAt(i, object.matrix); ref.current!.setColorAt(i, tint.set(p.color ?? '#ffffff'));
        });
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
        ref.current.computeBoundingSphere();
    }, [items, y]);
    return <instancedMesh ref={ref} args={[geometry, undefined, items.length]} raycast={noPick} receiveShadow>
        {water ? <meshPhysicalMaterial color={color} roughness={.2} metalness={.15} clearcoat={.8} clearcoatRoughness={.15}/> : <meshStandardMaterial color={color} vertexColors={Boolean(geometry.attributes.color)} roughness={.65} metalness={.12}/>}
    </instancedMesh>;
}
function Vehicles({ kind, items }: { kind: VehicleKind; items: Instance[] }) {
    const geometry = useMemo(() => vehicleGeometry(kind), [kind]);
    useEffect(() => () => { geometry.paint.dispose(); geometry.trim.dispose(); }, [geometry]);
    const neutral = useMemo(() => items.map(p => ({ ...p, color: '#ffffff' })), [items]);
    return <><Batch items={items} geometry={geometry.paint}/><Batch items={neutral} geometry={geometry.trim}/></>;
}
function Facilities({ kind, items }: { kind: FacilityKind; items: Instance[] }) {
    const geometry = useMemo(() => facilityGeometry(kind), [kind]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return <Batch items={items} geometry={geometry}/>;
}
function Water({ kind, variant, items, dark }: { kind: WaterFeature['kind']; variant: number; items: Instance[]; dark: boolean }) {
    const geometry = useMemo(() => waterGeometry(kind, variant), [kind, variant]);
    const fountain = useMemo(() => {
        const pieces: THREE.BufferGeometry[] = [];
        const column = new THREE.CylinderGeometry(.055, .075, .28, 10); column.translate(0, .14, 0); pieces.push(column);
        const bowl = new THREE.CylinderGeometry(.16, .07, .07, 16); bowl.translate(0, .3, 0); pieces.push(bowl);
        const jet = new THREE.CylinderGeometry(.012, .025, .12, 6); jet.translate(0, .39, 0); pieces.push(jet);
        return pieces;
    }, []);
    useEffect(() => () => { Object.values(geometry).forEach(g => g.dispose()); fountain.forEach(g => g.dispose()); }, [geometry, fountain]);
    // Keep shoreline rings flush with the lawn; the water sits inside the rim.
    const flat = useMemo(() => items.map(p => ({ ...p, height: 1 })), [items]);
    return <>
        <Batch items={flat} geometry={geometry.walk} y={.045} color={dark ? '#7c8275' : '#c7c2ac'}/>
        <Batch items={flat} geometry={geometry.bank} y={.065} color={kind === 'fountain' ? '#a9b5b5' : '#87977b'}/>
        <Batch items={flat} geometry={geometry.water} y={.06} color={dark ? '#315d65' : '#668f96'} water/>
        {kind === 'fountain' && fountain.map((g, i) => <Batch key={i} items={flat} geometry={g} y={.065} color={i === 2 ? '#99bac1' : '#a9b5b5'}/>)}
    </>;
}
export default function Amenities({ plan, near, dark, focus }: { plan: AmenitiesPlan; near: boolean; dark: boolean; focus?: { x: number; z: number } }) {
    const bays = useMemo(() => parkingGeometry(), []);
    useEffect(() => () => bays.dispose(), [bays]);
    const visible = useMemo(() => {
        const clear = (p: Prop) => !focus || Math.hypot(p.x - focus.x, p.z - focus.z) > 3 + Math.max(p.width, p.depth) / 2;
        return { vehicles: plan.vehicles.filter(clear), facilities: plan.facilities.filter(clear) };
    }, [plan, focus]);
    const vehicles = useMemo(() => vehicleKinds.map(kind => ({ kind, items: visible.vehicles.filter(p => p.kind === kind) })).filter(b => b.items.length), [visible]);
    const parking = useMemo(() => visible.vehicles.map(p => ({ ...p, width: p.width + .04, depth: p.depth + .2, height: 1, color: '#ffffff' })), [visible]);
    const facilities = useMemo(() => (['stop', 'terminal', 'subway', 'rail'] as const).map(kind => ({ kind, items: visible.facilities.filter(p => p.kind === kind) })).filter(b => b.items.length), [visible]);
    const water = useMemo(() => (['fountain', 'pond', 'lake'] as const).flatMap(kind => [0, 1, 2].map(variant => ({ kind, variant, items: plan.water.filter(p => p.kind === kind && p.variant === variant) }))).filter(b => b.items.length), [plan.water]);
    return <group>
        {water.map(b => <Water key={b.kind + b.variant} {...b} dark={dark}/>)}
        {near && <Batch items={parking} geometry={bays} y={.055}/>}
        {near && vehicles.map(b => <Vehicles key={b.kind} {...b}/>)}
        {near && facilities.map(b => <Facilities key={b.kind} {...b}/>)}
    </group>;
}
