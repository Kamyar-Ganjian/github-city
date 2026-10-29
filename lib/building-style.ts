import { FileNode, height } from './model';
export type BuildingKind = 'townhouse' | 'apartment' | 'midrise' | 'highrise' | 'landmark';
export const buildingKinds: BuildingKind[] = ['townhouse', 'apartment', 'midrise', 'highrise', 'landmark'];
export const buildingNames: Record<BuildingKind, string> = { townhouse: 'House / townhouse', apartment: 'Low-rise apartment', midrise: 'Mid-rise building', highrise: 'High-rise tower', landmark: 'Landmark skyscraper' };
export const buildingFootprints: Record<BuildingKind, {
    width: number;
    depth: number;
}> = {
    townhouse: { width: 1.4, depth: 1.35 }, apartment: { width: 1.55, depth: 1.4 }, midrise: { width: 1.5, depth: 1.5 }, highrise: { width: 1.35, depth: 1.35 }, landmark: { width: 1.55, depth: 1.55 }
};
export function seed(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++)
        hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return hash >>> 0;
}
export function architectureKind(encodedHeight: number, aggregate = false): BuildingKind {
    if (aggregate && encodedHeight >= 16.5)
        return 'landmark';
    if (encodedHeight >= 8.5)
        return 'highrise';
    if (encodedHeight >= 4.2)
        return 'midrise';
    if (encodedHeight >= 1.65)
        return 'apartment';
    return 'townhouse';
}
export function buildingKind(file: FileNode) { return architectureKind(height(file.size)); }
export function architectureVariant(id: string) { return seed(id) % 3; }
export interface FacadePixels {
    width: number;
    height: number;
    diffuse: Uint8Array;
    emissive: Uint8Array;
    roughness: Uint8Array;
}
export function facadePixels(kind: BuildingKind, variant = 0): FacadePixels {
    const width = 64, height = 256, diffuse = new Uint8Array(width * height * 4), emissive = new Uint8Array(diffuse.length), roughness = new Uint8Array(diffuse.length);
    const floors = { townhouse: 2, apartment: 4, midrise: 9, highrise: 20, landmark: 30 }[kind];
    const columns = kind === 'townhouse' ? 3 : kind === 'landmark' ? 6 + variant : kind === 'highrise' ? 5 + variant : variant === 1 ? 5 : 4;
    const glass = kind === 'highrise' || kind === 'landmark' || (kind === 'midrise' && variant === 2), brick = kind === 'townhouse' || (kind === 'apartment' && variant !== 2) || (kind === 'midrise' && variant === 0);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4, fx = x / width * columns, fy = y / height * floors;
            const window = x > 3 && x < width - 4 && y > 5 && y < height - 7 && fx % 1 > .2 && fx % 1 < .78 && fy % 1 > .2 && fy % 1 < .76;
            const mullion = fx % 1 < .08 || fy % 1 < .08;
            const mortar = brick && (y % 7 === 0 || (x + (Math.floor(y / 7) % 2) * 5) % 13 === 0);
            let wall = glass ? 175 : brick ? 165 : 192;
            if (mortar)
                wall -= 19;
            if (mullion)
                wall += glass ? 30 : 5;
            diffuse[i] = window ? (glass ? 54 : 70) : wall;
            diffuse[i + 1] = window ? (glass ? 76 : 80) : wall;
            diffuse[i + 2] = window ? (glass ? 91 : 86) : wall;
            diffuse[i + 3] = 255;
            const lit = window && ((Math.floor(fy) * 13 + Math.floor(fx) * 7 + variant * 3) % 11 < 5);
            emissive[i] = lit ? 255 : 0;
            emissive[i + 1] = lit ? 222 : 0;
            emissive[i + 2] = lit ? 165 : 0;
            emissive[i + 3] = 255;
            const r = window ? 70 : brick ? 230 : 170;
            roughness[i] = r;
            roughness[i + 1] = r;
            roughness[i + 2] = r;
            roughness[i + 3] = 255;
        }
    // A neutral, non-emissive roof texel shared by all horizontal faces.
    diffuse.set([150, 150, 150, 255], 0);
    emissive.set([0, 0, 0, 255], 0);
    roughness.set([210, 210, 210, 255], 0);
    return { width, height, diffuse, emissive, roughness };
}
