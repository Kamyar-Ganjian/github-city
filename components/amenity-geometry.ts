import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehicleSizes, type VehicleKind, type FacilityKind } from '../lib/amenities';

function colored(g: THREE.BufferGeometry, color: string) {
    const c = new THREE.Color(color), values = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = c.r; values[i + 1] = c.g; values[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return g;
}
function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return colored(g, color);
}
function merge(parts: THREE.BufferGeometry[]) {
    const g = mergeGeometries(parts, false);
    parts.forEach(p => p.dispose());
    if (!g) throw new Error('Could not merge amenity geometry');
    g.computeBoundingBox(); return g;
}
function cabin(w: number, bottom: number, top: number, front: number, back: number, rake: number, color: string) {
    const points = [
        -w / 2, bottom, back, w / 2, bottom, back, -w / 2, bottom, front, w / 2, bottom, front,
        -w * .43, top, back + rake, w * .43, top, back + rake, -w * .43, top, front - rake, w * .43, top, front - rake,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.setIndex([0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3, 4, 6, 7, 4, 7, 5, 0, 1, 3, 0, 3, 2]);
    const flat = g.toNonIndexed(); g.dispose(); flat.computeVertexNormals();
    flat.setIndex(Array.from({ length: flat.attributes.position.count }, (_, i) => i));
    // Match the standard primitive attributes before merging.
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
    return colored(flat, color);
}

/** Normalized silhouettes: local +Z is the front, Y is measured from the road. */
export function vehicleGeometry(kind: VehicleKind, dimensions = vehicleSizes[kind]) {
    const paint: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [];
    const glass = '#334d59', rubber = '#283035', chrome = '#a9b4b4';
    const add = (target: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, color: string) => target.push(box(w, h, d, x, y, z, color));
    add(paint, .88, .3, .92, 0, .36, 0, '#ffffff');
    const long = kind === 'bus' || kind === 'van' || kind === 'truck';
    if (kind === 'truck') {
        add(paint, .86, .62, .59, 0, .63, -.17, '#ffffff');
        trim.push(cabin(.84, .46, .88, .44, .15, .025, glass));
        add(paint, .79, .04, .22, 0, .9, .3, '#ffffff');
        for (const x of [-.26, 0, .26]) add(trim, .015, .5, .01, x, .64, -.47, chrome);
    } else if (kind === 'bus' || kind === 'van') {
        add(paint, .88, .47, .9, 0, .69, 0, '#ffffff');
        for (const side of [-1, 1]) {
            const windows = kind === 'bus' ? 7 : 2;
            for (let i = 0; i < windows; i++) add(trim, .012, .25, kind === 'bus' ? .09 : .14, side * .447, .71, .32 - i * (kind === 'bus' ? .105 : .2), glass);
        }
        add(trim, .74, .27, .012, 0, .72, .458, glass);
        add(paint, .72, .04, .78, 0, .95, 0, '#ffffff');
        if (kind === 'bus') { add(trim, .22, .48, .012, .22, .5, .465, glass); add(trim, .5, .05, .014, 0, .89, .465, '#c4ba87'); }
    } else {
        const pickup = kind === 'pickup', tall = kind === 'suv' || kind === 'hatchback';
        const top = tall ? .94 : .84, back = pickup ? -.02 : tall ? -.36 : -.25;
        trim.push(cabin(.79, .5, top, .26, back, tall ? .045 : .1, glass));
        add(paint, .68, .045, pickup ? .16 : tall ? .42 : .24, 0, top + .02, pickup ? .11 : -.04, '#ffffff');
        for (const side of [-1, 1]) add(paint, .03, top - .51, .025, side * .38, (top + .51) / 2, -.01, '#ffffff');
        if (pickup) {
            add(trim, .66, .012, .37, 0, .515, -.26, '#454e50');
            for (const side of [-1, 1]) add(paint, .07, .13, .4, side * .4, .57, -.25, '#ffffff');
            add(paint, .82, .13, .04, 0, .57, -.44, '#ffffff');
        }
        if (kind === 'taxi') add(trim, .27, .1, .12, 0, .94, 0, '#e6c869');
    }
    for (const side of [-1, 1]) {
        for (const z of long ? [-.32, .3] : [-.29, .28]) {
            // Compensate for the final nonuniform instance scale: wheel circles
            // must stay circular in world space rather than stretching lengthwise.
            const wheel = new THREE.CylinderGeometry(.17, .17, .12, 10); wheel.rotateZ(Math.PI / 2); wheel.scale(1, 1, dimensions[1] / dimensions[2]); wheel.translate(side * .44, .17, z); trim.push(colored(wheel, rubber));
            const hub = new THREE.CylinderGeometry(.085, .085, .125, 8); hub.rotateZ(Math.PI / 2); hub.scale(1, 1, dimensions[1] / dimensions[2]); hub.translate(side * .44, .17, z); trim.push(colored(hub, chrome));
        }
        add(trim, .16, .07, .015, side * .26, .4, .469, '#efe4bc');
        add(trim, .16, .065, .015, side * .26, .4, -.469, '#a45b4d');
    }
    add(trim, .8, .045, .04, 0, .24, .48, chrome);
    add(trim, .8, .045, .04, 0, .24, -.48, chrome);
    return { paint: merge(paint), trim: merge(trim) };
}

export function parkingGeometry() {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
        parts.push(box(.018, .005, .14, x * .49, 0, z * .42, '#aeb4aa'));
        parts.push(box(.18, .005, .012, x * .41, 0, z * .49, '#aeb4aa'));
    }
    return merge(parts);
}

/** Whole facilities are batched models: no React object per stair, wheel or rail. */
export function facilityGeometry(kind: FacilityKind) {
    const parts: THREE.BufferGeometry[] = [];
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, color = '#a9b2af') => parts.push(box(w, h, d, x, y, z, color));
    const metal = '#54676b', paving = '#b8b7a9', glass = '#729391';
    add(1, .06, 1, 0, .03, 0, paving);
    if (kind === 'rail') {
        // Continuous straight double rails, sleepers and buffer stops, beside a
        // raised passenger platform. Three coupled stationary carriages.
        add(.35, .12, .94, -.31, .12, 0);
        for (const x of [.065, .295]) add(.012, .025, .98, x, .08, 0, metal);
        for (let i = 0; i < 32; i++) add(.33, .022, .009, .18, .063, -.48 + i * .031, '#776e60');
        for (const z of [-.47, .47]) add(.32, .12, .015, .18, .13, z, '#6e5b52');
        for (const z of [-.25, 0, .25]) {
            const car = vehicleGeometry('bus', [.66, .44, 3.52]);
            car.paint.scale(.22, .4, .22); car.paint.translate(.18, .09, z); colored(car.paint, '#b4c2bc'); parts.push(car.paint);
            car.trim.scale(.22, .4, .22); car.trim.translate(.18, .09, z); parts.push(car.trim);
        }
        for (const z of [-.125, .125]) add(.04, .025, .035, .18, .22, z, metal);
        for (const z of [-.18, .18]) add(.015, .5, .01, -.31, .42, z, metal);
        add(.34, .04, .5, -.31, .69, 0, metal);
    } else if (kind === 'subway') {
        add(.78, .07, .75, 0, .1, -.03, '#34484c');
        for (let i = 0; i < 7; i++) add(.58, .055, .09, 0, .18 + i * .045, -.3 + i * .09, paving);
        for (const side of [-1, 1]) {
            for (const z of [-.35, 0, .35]) add(.025, .38, .018, side * .37, .43, z, metal);
            add(.025, .025, .75, side * .37, .63, 0, metal);
        }
        add(.025, .78, .025, -.42, .45, .37, metal);
        add(.4, .22, .035, -.2, .87, .37, '#447665');
        // Geometric M, readable without adding DOM roots or external fonts.
        for (const x of [-.32, -.08]) add(.025, .14, .04, x, .87, .37, '#e4e9d8');
        for (const x of [-.26, -.14]) { const g = box(.025, .09, .04, 0, 0, 0, '#e4e9d8'); g.rotateZ(x < -.2 ? .7 : -.7); g.translate(x, .89, .37); parts.push(g); }
    } else {
        const terminal = kind === 'terminal';
        const shelterX = terminal ? -.28 : 0, shelterW = terminal ? .35 : .86;
        add(shelterW, .035, .68, shelterX, .83, -.07, metal);
        for (const z of [-.37, .23]) for (const x of [shelterX - shelterW * .4, shelterX + shelterW * .4]) add(.025, .72, .02, x, .45, z, metal);
        add(.025, .48, .57, shelterX - shelterW * .44, .47, -.07, glass);
        add(shelterW * .65, .07, .09, shelterX, .29, -.07, '#8b7c62');
        for (const z of [-.3, .16]) add(.025, .21, .03, shelterX, .17, z, metal);
        add(.035, .85, .025, .42, .48, .4, metal);
        add(.15, .17, .035, .42, .89, .4, '#c6d6bf');
        // A bus pictogram: windscreen above two wheel marks.
        add(.09, .065, .04, .42, .9, .4, metal);
        for (const x of [.39, .45]) add(.02, .025, .04, x, .85, .4, metal);
        if (terminal) {
            for (const z of [-.24, .24]) {
                const bus = vehicleGeometry('bus', [.522, .53, 1.8]);
                bus.paint.scale(.29, .53, .4); bus.paint.translate(.15, .06, z); colored(bus.paint, '#82a09a'); parts.push(bus.paint);
                bus.trim.scale(.29, .53, .4); bus.trim.translate(.15, .06, z); parts.push(bus.trim);
                add(.4, .01, .006, .15, .065, z + .22, '#e0d9bf');
            }
        }
    }
    return merge(parts);
}

/** Shared seeded shoreline templates with a walking loop around ponds/lakes. */
export function waterGeometry(kind: 'fountain' | 'pond' | 'lake', variant: number) {
    const shape = (radius: number) => {
        const value = new THREE.Shape();
        for (let i = 0; i <= 48; i++) {
            const a = i / 48 * Math.PI * 2;
            const r = radius * (kind === 'fountain' ? 1 : .91 + .055 * Math.sin(a * 3 + variant) + .035 * Math.cos(a * 5 - variant));
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            if (!i) value.moveTo(x, y); else value.lineTo(x, y);
        }
        return value;
    };
    const ring = (outer: number, inner: number) => { const s = shape(outer); s.holes.push(new THREE.Path(shape(inner).getPoints().reverse())); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; };
    const water = new THREE.ShapeGeometry(shape(.37)); water.rotateX(-Math.PI / 2);
    const bank = ring(.43, .365), walk = ring(.49, .445);
    return { water, bank, walk };
}
