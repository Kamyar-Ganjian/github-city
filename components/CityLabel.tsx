'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
    position: [number, number, number];
    text: string;
    onClick?: () => void;
    distanceFactor?: number;
}

// A DOM annotation, not a second React root. Drei Html's nested root cleanup
// can synchronously unmount ReactDOM while the R3F reconciler is committing.
export default function CityLabel({ position, text, onClick, distanceFactor }: Props) {
    const { gl, invalidate } = useThree();
    const element = useRef<HTMLElement | null>(null);
    const point = useRef(new THREE.Vector3());
    const world = useRef(new THREE.Vector3());
    useEffect(() => {
        const node = document.createElement(onClick ? 'button' : 'div');
        if (node instanceof HTMLButtonElement) node.type = 'button';
        node.className = onClick ? 'map-label' : 'map-tooltip';
        node.textContent = text;
        node.title = text;
        node.onclick = onClick ?? null;
        Object.assign(node.style, {
            position: 'absolute', top: '0', left: '0',
            visibility: 'hidden', pointerEvents: onClick ? 'auto' : 'none',
            zIndex: onClick ? '2' : '30', transformOrigin: 'center',
        });
        gl.domElement.parentElement?.appendChild(node);
        element.current = node;
        invalidate();
        return () => { element.current = null; node.remove(); };
    }, [gl, text, onClick, invalidate]);

    useFrame(({ camera, size }) => {
        const node = element.current;
        if (!node) return;
        world.current.set(...position);
        point.current.copy(world.current).project(camera);
        const projected = point.current;
        const visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 1.2 && Math.abs(projected.y) < 1.2;
        node.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;
        const scale = distanceFactor ? Math.min(2, distanceFactor / Math.max(.1, camera.position.distanceTo(world.current))) : 1;
        node.style.transform = `translate(${(projected.x + 1) * size.width / 2}px, ${(1 - projected.y) * size.height / 2}px) translate(-50%, -50%) scale(${scale})`;
    });
    return null;
}
