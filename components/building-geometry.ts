import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BuildingKind, windowPixels } from '../lib/building-style';
function box(width: number, height: number, depth: number, y: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(0, y, 0);
    // Reserve a black texel for horizontal surfaces so roofs do not get windows.
    const uv = geometry.attributes.uv;
    for (let i = 8; i < 16; i++)
        uv.setXY(i, 0, 0);
    return geometry;
}
/** All archetypes occupy a unit envelope, including the roof. Height encoding stays exact. */
export function buildingGeometry(kind: BuildingKind) {
    let parts: THREE.BufferGeometry[];
    switch (kind) {
        case 'source':
            parts = [box(1, .78, 1, -.11), box(.78, .22, .78, .39)];
            break;
        case 'test':
            parts = [box(1, .82, 1, -.09), box(.64, .18, 1, .41)];
            break;
        case 'configuration':
            parts = [box(.88, .88, .88, -.06), box(1, .12, 1, .44)];
            break;
        case 'asset': {
            const roof = new THREE.ConeGeometry(Math.SQRT1_2, .18, 4, 1);
            roof.rotateY(Math.PI / 4);
            roof.translate(0, .41, 0);
            for (let i = 0; i < roof.attributes.uv.count; i++)
                roof.attributes.uv.setXY(i, 0, 0);
            parts = [box(1, .82, 1, -.09), roof];
            break;
        }
        default: parts = [box(1, 1, 1, 0)];
    }
    const geometry = mergeGeometries(parts, false);
    for (const part of parts)
        part.dispose();
    if (!geometry)
        throw new Error('Building geometry could not be prepared.');
    geometry.computeBoundingBox();
    return geometry;
}
export function windowTexture() {
    const { width, height, data } = windowPixels();
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}
