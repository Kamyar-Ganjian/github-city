'use client';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as Controls } from 'three-stdlib';
import { MapView } from '@/lib/map-view';
import { ExplorerItem } from '@/lib/explorer';
import { palette } from '@/lib/model';
import { Navigation } from '@/lib/navigation';
import { PreparedRepository } from '@/lib/prepare';
import { CityBlock } from '@/lib/whole-city';
interface Props {
    prepared: PreparedRepository;
    view: MapView;
    navigation: Navigation;
    theme: 'light' | 'dark';
    pan: boolean;
    labels: boolean;
    capture: number;
    title: string;
    onSelect: (item: ExplorerItem, focus?: boolean) => void;
    onGroup: (block: CityBlock) => void;
    onReady: () => void;
    onCapture: (message: string) => void;
}
interface Marker {
    id: string;
    x: number;
    z: number;
    height: number;
    width: number;
    depth: number;
    color: string;
    label: string;
}
function Batch({ items, onClick, aggregate }: {
    items: Marker[];
    onClick: (index: number) => void;
    aggregate: boolean;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null), [hover, setHover] = useState<number | null>(null);
    useLayoutEffect(() => {
        if (!mesh.current)
            return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        items.forEach((item, i) => { object.position.set(item.x, item.height / 2 + .2, item.z); object.scale.set(item.width, item.height, item.depth); object.updateMatrix(); mesh.current!.setMatrixAt(i, object.matrix); mesh.current!.setColorAt(i, color.set(item.color)); });
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor)
            mesh.current.instanceColor.needsUpdate = true;
        mesh.current.computeBoundingSphere();
    }, [items]);
    function pick(event: ThreeEvent<MouseEvent>) { event.stopPropagation(); if (event.delta < 5 && event.instanceId !== undefined)
        onClick(event.instanceId); }
    const item = hover === null ? null : items[hover];
    return <><instancedMesh ref={mesh} args={[undefined, undefined, items.length]} onClick={pick} onPointerMove={event => { if (event.instanceId !== undefined)
        setHover(event.instanceId); }} onPointerOut={() => setHover(null)}><boxGeometry /><meshStandardMaterial roughness={1} metalness={0}/></instancedMesh>{item && <Html center position={[item.x, item.height + 1.5, item.z]} style={{ pointerEvents: 'none' }}><div className="map-tooltip">{aggregate && <strong>Aggregate · </strong>}{item.label}</div></Html>}</>;
}
function Boundaries({ view, dark }: {
    view: MapView;
    dark: boolean;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => { if (!mesh.current)
        return; const object = new THREE.Object3D(); view.boundaries.forEach((d, i) => { object.position.set(d.x, .01 + d.level * .008, d.z); object.scale.set(d.width - .25, .02, d.depth - .25); object.updateMatrix(); mesh.current!.setMatrixAt(i, object.matrix); }); mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }, [view.boundaries]);
    return <instancedMesh ref={mesh} args={[undefined, undefined, view.boundaries.length]}><boxGeometry /><meshBasicMaterial color={dark ? '#242424' : '#e5e5e5'}/></instancedMesh>;
}
function World(props: Props) {
    const { prepared, view, navigation, theme, pan, labels, capture, title, onSelect, onGroup, onCapture } = props;
    const { camera, gl, scene, size, invalidate } = useThree();
    const controls = useRef<Controls>(null), destination = useRef(new THREE.Vector3()), target = useRef(new THREE.Vector3()), moving = useRef(true), lastCapture = useRef(capture);
    const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
    const dark = theme === 'dark', span = Math.max(prepared.city.width, prepared.city.depth);
    const files = useMemo(() => view.buildings.map(b => ({ id: b.file.id, x: b.x, z: b.z, height: b.height, width: 1.55, depth: 1.55, color: palette[b.file.language], label: b.file.path })), [view.buildings]);
    const aggregates = useMemo(() => view.aggregates.map(b => ({ ...b, color: dark ? '#888888' : '#737373', label: b.count.toLocaleString() + ' files · ' + b.directory })), [view.aggregates, dark]);
    useEffect(() => {
        const file = navigation.focus.kind === 'file' ? prepared.buildings.get(navigation.focus.path) : null;
        const bounds = navigation.focus.kind === 'directory' && navigation.focus.path === navigation.directory ? view.bounds : prepared.districts.get(navigation.focus.path) ?? view.bounds;
        const x = file?.x ?? bounds.x, z = file?.z ?? bounds.z, h = file?.height ?? view.maxHeight;
        const radius = file ? Math.max(7, h * .65) : Math.hypot(bounds.width, bounds.depth, view.maxHeight) / 2;
        const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
        const angle = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * size.width / size.height));
        const distance = radius / Math.sin(angle / 2) * 1.14;
        target.current.set(x, h * .3, z);
        destination.current.set(x + distance * .58, h * .3 + distance * .66, z + distance * .58);
        moving.current = true;
        invalidate();
    }, [prepared, navigation.focus, navigation.directory, navigation.cameraRevision, view.bounds, view.maxHeight, camera, size, invalidate]);
    useFrame((_, dt) => {
        if (!moving.current || !controls.current)
            return;
        const alpha = reduced ? 1 : 1 - Math.exp(-6 * Math.min(dt, .1));
        camera.position.lerp(destination.current, alpha);
        controls.current.target.lerp(target.current, alpha);
        controls.current.update();
        if (camera.position.distanceTo(destination.current) < .04 && controls.current.target.distanceTo(target.current) < .04)
            moving.current = false;
        else
            invalidate();
    });
    useEffect(() => {
        if (!capture || capture === lastCapture.current)
            return;
        lastCapture.current = capture;
        try {
            gl.render(scene, camera);
            const output = document.createElement('canvas');
            output.width = 1920;
            output.height = 1080;
            const context = output.getContext('2d');
            if (!context)
                throw new Error('PNG canvas unavailable.');
            const source = gl.domElement, scale = Math.min(1920 / source.width, 1080 / source.height);
            context.fillStyle = dark ? '#111111' : '#fafafa';
            context.fillRect(0, 0, 1920, 1080);
            context.drawImage(source, (1920 - source.width * scale) / 2, (1080 - source.height * scale) / 2, source.width * scale, source.height * scale);
            context.fillStyle = dark ? '#ededed' : '#171717';
            context.font = '18px sans-serif';
            context.fillText('GitHub City · ' + title, 32, 1028);
            context.font = '14px sans-serif';
            context.fillText(view.aggregates.length ? 'Contains aggregates; height represents file count.' : 'Individual files; height represents file size.', 32, 1054);
            output.toBlob(blob => { if (!blob) {
                onCapture('PNG export failed.');
                return;
            } const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'github-city.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); onCapture('PNG downloaded.'); }, 'image/png');
        }
        catch {
            onCapture('The browser could not export this WebGL view.');
        }
    }, [capture, gl, scene, camera, dark, title, view.aggregates.length, onCapture]);
    const selection = navigation.selection;
    const highlight = selection.kind === 'file' ? files.find(f => f.id === selection.path) : selection.kind === 'group' ? aggregates.find(a => a.id === selection.block.id) : null;
    return <><color attach="background" args={[dark ? '#111111' : '#fafafa']}/><ambientLight intensity={1.4}/><directionalLight position={[30, 60, 30]} intensity={1.5}/>
 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[view.bounds.x, -.08, view.bounds.z]}><planeGeometry args={[view.bounds.width + 6, view.bounds.depth + 6]}/><meshBasicMaterial color={dark ? '#191919' : '#f0f0f0'}/></mesh>
 <Boundaries view={view} dark={dark}/>
 <Batch items={files} aggregate={false} onClick={i => onSelect({ kind: 'file', path: view.buildings[i].file.path }, false)}/>
 <Batch items={aggregates} aggregate onClick={i => { const block = view.aggregates[i]; if (block.id.startsWith('directory:'))
        onSelect({ kind: 'directory', path: block.directory }, true);
    else
        onGroup(block); }}/>
 {highlight && <mesh position={[highlight.x, highlight.height / 2 + .2, highlight.z]} raycast={() => { }}><boxGeometry args={[highlight.width + .12, highlight.height + .12, highlight.depth + .12]}/><meshBasicMaterial wireframe color={dark ? '#ffffff' : '#000000'}/></mesh>}
 {labels && view.boundaries.slice(0, 16).map(d => <Html key={d.path} center position={[d.x, .2, d.z + d.depth / 2 - 1]} distanceFactor={Math.max(40, Math.min(d.width, d.depth) * 1.8)} zIndexRange={[2, 0]}><button className="map-label" onClick={() => onSelect({ kind: 'directory', path: d.path }, true)}>{d.path}</button></Html>)}
 <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.12} rotateSpeed={.6} panSpeed={.8} zoomSpeed={.85} minDistance={4} maxDistance={span * 5} minPolarAngle={.1} maxPolarAngle={Math.PI / 2.15} screenSpacePanning={false} mouseButtons={{ LEFT: pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} onStart={() => { moving.current = false; }}/>
 </>;
}
export default function City(props: Props) {
    const span = Math.max(props.prepared.city.width, props.prepared.city.depth);
    return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [100, 100, 100], fov: 42, near: .1, far: span * 15 + 100 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={() => props.onReady()} fallback={<p>3D is unavailable. Use the file tree and inspector to explore every file.</p>}><World {...props}/></Canvas>;
}
