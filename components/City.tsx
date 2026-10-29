'use client';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CityLabel from './CityLabel';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as Controls } from 'three-stdlib';
import { MapView } from '@/lib/map-view';
import { ExplorerItem } from '@/lib/explorer';
import { palette } from '@/lib/model';
import { Navigation } from '@/lib/navigation';
import { PreparedRepository } from '@/lib/prepare';
import { buildingKinds, architectureKind, architectureVariant, buildingFootprints, buildingNames, BuildingKind } from '@/lib/building-style';
import Environment from './Environment';
import { buildingGeometry, buildingParts, facadeTextures } from './building-geometry';
import { CityBlock } from '@/lib/whole-city';
interface Props {
    environment: 'minimal' | 'detailed';
    backgroundBuildings: boolean;
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
    onUnavailable: () => void;
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
    kind: BuildingKind;
    variant: number;
    aggregate?: CityBlock;
    path?: string;
}
function Batch({ items, onPick, dark, near, kind, variant, selectedId }: {
    items: Marker[];
    onPick: (item: Marker) => void;
    dark: boolean;
    near: boolean;
    kind: BuildingKind;
    variant: number;
    selectedId?: string;
}) {
    const parts = useMemo(() => buildingParts(kind, variant), [kind, variant]);
    const textures = useMemo(() => facadeTextures(kind, variant), [kind, variant]);
    useEffect(() => () => { parts.body.dispose(); parts.details.dispose(); Object.values(textures).forEach(texture => texture.dispose()); }, [parts, textures]);
    const body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null), base = useRef<THREE.InstancedMesh>(null);
    const bases = useMemo(() => items.filter(item => item.aggregate), [items]);
    const [hover, setHover] = useState<string | null>(null);
    const lookup = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);
    useLayoutEffect(() => {
        if (!body.current || !roof.current)
            return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        items.forEach((item, i) => {
            const scale = item.aggregate ? .65 : 1;
            object.position.set(item.x, item.height / 2 + (item.aggregate ? .2 : .12), item.z);
            object.scale.set(item.width * scale, item.height, item.depth * scale);
            object.updateMatrix();
            body.current!.setMatrixAt(i, object.matrix);
            roof.current!.setMatrixAt(i, object.matrix);
            body.current!.setColorAt(i, color.set(item.color));
        });
        bases.forEach((item, i) => { object.position.set(item.x, .1, item.z); object.scale.set(item.width + .3, .2, item.depth + .3); object.updateMatrix(); base.current?.setMatrixAt(i, object.matrix); });
        for (const mesh of [body.current, roof.current, base.current])
            if (mesh) {
                mesh.instanceMatrix.needsUpdate = true;
                if (mesh.instanceColor)
                    mesh.instanceColor.needsUpdate = true;
                mesh.computeBoundingSphere();
            }
    }, [items, bases]);
    function pick(event: ThreeEvent<MouseEvent>, list = items) {
        event.stopPropagation();
        if (event.delta < 5 && event.instanceId !== undefined)
            onPick(list[event.instanceId]);
    }
    function track(event: ThreeEvent<PointerEvent>, list = items) {
        if (event.instanceId !== undefined)
            setHover(list[event.instanceId].id);
    }
    const item = hover === null || hover === selectedId ? null : lookup.get(hover);
    return <><instancedMesh ref={body} args={[undefined, undefined, items.length]} castShadow={near} receiveShadow onClick={event => pick(event)} onPointerMove={event => track(event)} onPointerOut={() => setHover(null)}>
  <primitive object={parts.body} attach="geometry"/><meshStandardMaterial map={textures.map} emissiveMap={textures.emissiveMap} roughnessMap={textures.roughnessMap} roughness={1} metalness={kind === 'highrise' || kind === 'landmark' ? .24 : .05} emissive="#fff0d0" emissiveIntensity={dark ? .55 : .1}/>
 </instancedMesh>
 <instancedMesh ref={roof} args={[undefined, undefined, items.length]} castShadow={near} receiveShadow onClick={event => pick(event)} onPointerMove={event => track(event)} onPointerOut={() => setHover(null)}><primitive object={parts.details} attach="geometry"/><meshStandardMaterial vertexColors color="#a9b1b5" roughness={.75} metalness={.18}/></instancedMesh>
 {bases.length > 0 && <instancedMesh ref={base} args={[undefined, undefined, bases.length]} onClick={event => pick(event, bases)} onPointerMove={event => track(event, bases)} onPointerOut={() => setHover(null)}><boxGeometry /><meshStandardMaterial color={dark ? '#bbc4c8' : '#48535c'} roughness={1}/></instancedMesh>}
 {item && <CityLabel position={[item.x, item.height + 1.5, item.z]} text={`${buildingNames[item.kind]}${item.aggregate ? ' · Aggregate' : ''} · ${item.label}`}/>}
 </>;
}
function SelectionOutline({ item, dark }: {
    item: Marker;
    dark: boolean;
}) {
    const geometry = useMemo(() => { const solid = buildingGeometry(item.kind, item.variant), edges = new THREE.EdgesGeometry(solid, 25); solid.dispose(); return edges; }, [item.kind, item.variant]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    const factor = item.aggregate ? .65 : 1;
    return <><lineSegments geometry={geometry} position={[item.x, item.height / 2 + (item.aggregate ? .2 : .12), item.z]} scale={[item.width * factor, item.height, item.depth * factor]} renderOrder={100} raycast={() => { }}><lineBasicMaterial color={dark ? '#f5f0df' : '#172933'} depthTest={false} transparent opacity={.9}/></lineSegments><CityLabel position={[item.x, item.height + 1.5, item.z]} text={item.label}/></>;
}
function FileFoundations({ items, dark }: {
    items: Marker[];
    dark: boolean;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => { if (!mesh.current)
        return; const object = new THREE.Object3D(); items.forEach((item, i) => { object.position.set(item.x, .06, item.z); object.scale.set(1.7, .12, 1.7); object.updateMatrix(); mesh.current!.setMatrixAt(i, object.matrix); }); mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }, [items]);
    return <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} receiveShadow raycast={() => { }}><boxGeometry /><meshStandardMaterial color={dark ? '#65717a' : '#a9b2b2'} roughness={1}/></instancedMesh>;
}
function Boundaries({ view, dark }: {
    view: MapView;
    dark: boolean;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!mesh.current)
            return;
        const object = new THREE.Object3D();
        view.urban.districts.forEach((d, i) => { object.position.set(d.x, -.01, d.z); object.scale.set(d.width - .25, .02, d.depth - .25); object.updateMatrix(); mesh.current!.setMatrixAt(i, object.matrix); });
        mesh.current.instanceMatrix.needsUpdate = true;
        mesh.current.computeBoundingSphere();
    }, [view.urban.districts]);
    return <instancedMesh ref={mesh} receiveShadow args={[undefined, undefined, view.urban.districts.length]}><boxGeometry /><meshStandardMaterial color={dark ? '#29343c' : '#cbd2cf'} roughness={1}/></instancedMesh>;
}
function World(props: Props) {
    const { environment, backgroundBuildings, prepared, view, navigation, theme, pan, labels, capture, title, onSelect, onGroup, onCapture, onUnavailable } = props;
    const { camera, gl, scene, size, invalidate } = useThree();
    const controls = useRef<Controls>(null), destination = useRef(new THREE.Vector3()), target = useRef(new THREE.Vector3()), moving = useRef(true), lastCapture = useRef(capture);
    useEffect(() => {
        const element = gl.domElement;
        const lost = (event: Event) => { event.preventDefault(); onUnavailable(); };
        element.addEventListener('webglcontextlost', lost);
        return () => element.removeEventListener('webglcontextlost', lost);
    }, [gl, onUnavailable]);
    const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
    const dark = theme === 'dark', span = Math.max(view.bounds.width, view.bounds.depth, view.maxHeight * 3);
    const [near, setNear] = useState(true), [low, setLow] = useState(false);
    const timing = useRef({ seconds: 0, frames: 0 });
    const sunlight = useRef<THREE.DirectionalLight>(null), sunTarget = useMemo(() => new THREE.Object3D(), []);
    const { setDpr } = useThree();
    useEffect(() => { Object.assign(camera, { near: .1, far: span * 30 + 100 }); (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); }, [camera, span]);
    const files: Marker[] = useMemo(() => view.buildings.map(b => { const kind = architectureKind(b.height); return { id: 'file:' + b.file.id, path: b.file.path, kind, variant: architectureVariant(b.file.path), x: b.x, z: b.z, height: b.height, ...buildingFootprints[kind], color: palette[b.file.language], label: b.file.path }; }), [view.buildings]);
    const aggregates: Marker[] = useMemo(() => view.aggregates.map(b => ({ ...b, id: 'aggregate:' + b.id, aggregate: b, kind: architectureKind(b.height, true), variant: architectureVariant(b.id + b.directory), color: palette[b.language] ?? palette.Other, label: b.count.toLocaleString() + ' files · ' + b.directory })), [view.aggregates]);
    const batches = useMemo(() => { const items = [...files, ...aggregates]; return buildingKinds.flatMap(kind => [0, 1, 2].map(variant => ({ kind, variant, items: items.filter(item => item.kind === kind && item.variant === variant) }))).filter(batch => batch.items.length); }, [files, aggregates]);
    function pick(item: Marker) {
        if (item.path)
            onSelect({ kind: 'file', path: item.path }, false);
        else if (item.aggregate) {
            const block = item.aggregate;
            if (block.id.startsWith('directory:'))
                onSelect({ kind: 'directory', path: block.directory }, true);
            else
                onGroup(block);
        }
    }
    useEffect(() => {
        const file = navigation.focus.kind === 'file' ? view.buildings.find(b => b.file.path === navigation.focus.path) ?? prepared.buildings.get(navigation.focus.path) : null;
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
    }, [prepared, navigation.focus, navigation.directory, navigation.cameraRevision, view.bounds, view.maxHeight, view.buildings, camera, size, invalidate]);
    useFrame((_, dt) => {
        if (!controls.current)
            return;
        const close = camera.position.distanceTo(controls.current.target) < 160;
        if (close !== near)
            setNear(close);
        if (sunlight.current) {
            sunTarget.position.copy(controls.current.target);
            sunlight.current.position.set(sunTarget.position.x + 35, 70, sunTarget.position.z + 30);
        }
        if (dt > .2) {
            timing.current = { seconds: 0, frames: 0 };
        }
        else {
            timing.current.seconds += dt;
            timing.current.frames++;
            if (timing.current.seconds > 2) {
                const fps = timing.current.frames / timing.current.seconds;
                timing.current = { seconds: 0, frames: 0 };
                if (fps < 28 && !low) {
                    setLow(true);
                    setDpr(1);
                }
                else if (fps > 55 && low) {
                    setLow(false);
                    setDpr(Math.min(window.devicePixelRatio, 1.5));
                }
            }
        }
        if (!moving.current)
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
            context.fillText(view.representedFiles.toLocaleString() + ' of ' + prepared.index.directories.get(navigation.directory)!.fileCount.toLocaleString() + ' files · Files: height = bytes · Aggregates: height = file count', 32, 1054);
            output.toBlob(blob => {
                if (!blob) {
                    onCapture('PNG export failed.');
                    return;
                }
                const url = URL.createObjectURL(blob), link = document.createElement('a');
                link.href = url;
                link.download = 'github-city.png';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                onCapture('PNG downloaded.');
            }, 'image/png');
        }
        catch {
            onCapture('The browser could not export this WebGL view.');
        }
    }, [capture, gl, scene, camera, dark, title, view.aggregates.length, view.representedFiles, prepared, navigation.directory, onCapture]);
    const selection = navigation.selection;
    const highlight = selection.kind === 'file' ? files.find(f => f.path === selection.path) : selection.kind === 'group' ? aggregates.find(a => a.aggregate?.id === selection.block.id) : null;
    return <><color attach="background" args={[dark ? '#111820' : '#e9edf0']}/><ambientLight intensity={.7}/><hemisphereLight args={['#dce9f5', '#39434b', .7]}/>
 <primitive object={sunTarget}/><directionalLight ref={sunlight} target={sunTarget} castShadow={near && !low} shadow-mapSize={[1024, 1024]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={200} shadow-bias={-.001} color="#fff1da" position={[35, 70, 30]} intensity={1.8}/>
 <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[view.bounds.x, -.025, view.bounds.z]} raycast={() => { }}><planeGeometry args={[view.bounds.width + 8, view.bounds.depth + 8]}/><meshStandardMaterial color={dark ? '#18222a' : '#d9dedc'} roughness={1}/></mesh>
 <Boundaries view={view} dark={dark}/><FileFoundations items={files} dark={dark}/>
 {environment === 'detailed' && <Environment plan={view.urban} dark={dark} near={near && !low} background={backgroundBuildings} title={title} selected={Boolean(highlight)} focus={highlight ? { x: highlight.x, z: highlight.z } : undefined}/>}
 {batches.map(batch => <Batch key={batch.kind + batch.variant} items={batch.items} kind={batch.kind} variant={batch.variant} dark={dark} near={near && !low} selectedId={highlight?.id} onPick={pick}/>)}

 {highlight && <SelectionOutline item={highlight} dark={dark}/>}
 {labels && view.boundaries.slice(0, 16).map(d => <CityLabel key={d.path} position={[d.x, .2, d.z + d.depth / 2 - 1]} distanceFactor={Math.max(40, Math.min(d.width, d.depth) * 1.8)} text={d.path} onClick={() => onSelect({ kind: 'directory', path: d.path }, true)}/>)}
 <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.12} rotateSpeed={.6} panSpeed={.8} zoomSpeed={.85} minDistance={4} maxDistance={span * 20} minPolarAngle={.1} maxPolarAngle={Math.PI / 2.15} screenSpacePanning={false} mouseButtons={{ LEFT: pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} onStart={() => { moving.current = false; }}/>
 </>;
}
export default function City(props: Props) {
    return <Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [100, 100, 100], fov: 42, near: .1, far: 10000 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={() => props.onReady()} fallback={<p>3D is unavailable. Use the file tree and inspector to explore every file.</p>}><World {...props}/></Canvas>;
}
