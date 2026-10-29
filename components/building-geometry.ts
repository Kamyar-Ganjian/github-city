import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BuildingKind, facadePixels } from '../lib/building-style';
function box(w: number, h: number, d: number, x: number, y: number, z: number) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    for (let i = 0; i < g.attributes.uv.count; i++) {
        if (i >= 8 && i < 16)
            g.attributes.uv.setXY(i, 0, 0);
        else
            g.attributes.uv.setY(i, y + .5 + (g.attributes.uv.getY(i) - .5) * h);
    }
    return g;
}
function neutral(g: THREE.BufferGeometry, tint: number) {
    const colors = new Float32Array(g.attributes.position.count * 3);
    colors.fill(tint);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
}
function merge(parts: THREE.BufferGeometry[]) {
    const result = mergeGeometries(parts, false);
    parts.forEach(p => p.dispose());
    if (!result)
        throw new Error('Architecture geometry failed.');
    result.computeBoundingBox();
    return result;
}
export function buildingParts(kind: BuildingKind, variant = 0) {
    const body: THREE.BufferGeometry[] = [], details: THREE.BufferGeometry[] = [];
    const width = .94 - variant * .035, depth = .94 - (2 - variant) * .025;
    const add = (w: number, h: number, d: number, y: number) => body.push(box(w, h, d, 0, y, 0));
    const detail = (w: number, h: number, d: number, x: number, y: number, z: number, tint = .7) => details.push(neutral(box(w, h, d, x, y, z), tint));
    if (kind === 'townhouse') {
        add(width, .78, depth, -.11);
        if (variant !== 2) {
            const roof = new THREE.ConeGeometry(Math.SQRT1_2, .22, 4, 1);
            roof.rotateY(Math.PI / 4);
            roof.scale(width, 1, depth);
            roof.translate(0, .39, 0);
            for (let i = 0; i < roof.attributes.uv.count; i++)
                roof.attributes.uv.setXY(i, 0, 0);
            details.push(neutral(roof, .55));
        }
        else
            detail(width, .22, depth, 0, .39, 0, .55);
    }
    else if (kind === 'apartment') {
        add(width, .90, depth, -.05);
        detail(width, .035, depth, 0, .418, 0, .9);
        detail(.24, .065, .24, .16, .466, -.13, .5);
        detail(.035, .012, .035, .16, .506, -.13, .5);
    }
    else if (kind === 'midrise') {
        add(width, .9, depth, -.05);
        for (const x of [-width / 2 + .018, width / 2 - .018])
            body.push(box(.032, .9, depth + .012, x, -.05, 0));
        detail(width, .04, depth, 0, .42, 0, .95);
        detail(.28, .06, .24, variant === 0 ? .16 : -.15, .47, .12, .55);
    }
    else if (kind === 'highrise') {
        add(width, .76, depth, -.12);
        add(width * .86, .16, depth * .86, .34);
        detail(width * .86, .025, depth * .86, 0, .433, 0, .85);
        detail(.22, .055, .22, .09, .473, -.08, .5);
        detail(.02, .012, .02, .09, .506, -.08, .55);
        for (const x of [-width / 2 + .02, width / 2 - .02])
            body.push(box(.026, .76, depth, x, -.12, 0));
    }
    else {
        add(width, .44, depth, -.28);
        add(width * .82, .25, depth * .82, .065);
        add(width * .64, .17, depth * .64, .275);
        add(width * .45, .09, depth * .45, .405);
        detail(width * .47, .02, depth * .47, 0, .46, 0, .95);
        detail(.18, .035, .18, 0, .487, 0, .65);
        detail(.016, .018, .016, 0, .513, 0, .7);
        for (const x of [-width / 2 + .02, width / 2 - .02])
            body.push(box(.026, .44, depth, x, -.28, 0));
    }
    // A recessed entrance and ground-floor cornice, shared by the whole archetype.
    detail(.18, .12, .025, 0, -.44, depth / 2 - .005, .28);
    detail(width, .018, depth, 0, -.35, 0, .8);
    // Normalize the complete silhouette so the encoded height includes roof details.
    const shell = merge(body), roof = merge(details);
    shell.computeBoundingBox();
    roof.computeBoundingBox();
    const min = Math.min(shell.boundingBox!.min.y, roof.boundingBox!.min.y), max = Math.max(shell.boundingBox!.max.y, roof.boundingBox!.max.y), range = max - min;
    for (const geometry of [shell, roof]) {
        geometry.translate(0, -min, 0);
        geometry.scale(1, 1 / range, 1);
        geometry.translate(0, -.5, 0);
        geometry.computeBoundingBox();
    }
    return { body: shell, details: roof };
}
/** Combined geometry is useful for bounds tests and offline previews. */
export function buildingGeometry(kind: BuildingKind, variant = 0) {
    const parts = buildingParts(kind, variant);
    parts.details.deleteAttribute('color');
    return merge([parts.body, parts.details]);
}
export function facadeTextures(kind: BuildingKind, variant = 0) {
    const pixels = facadePixels(kind, variant);
    const create = (data: Uint8Array, srgb: boolean) => {
        const texture = new THREE.DataTexture(data, pixels.width, pixels.height, THREE.RGBAFormat);
        if (srgb)
            texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        return texture;
    };
    return { map: create(pixels.diffuse, true), emissiveMap: create(pixels.emissive, true), roughnessMap: create(pixels.roughness, false) };
}
