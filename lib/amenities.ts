import { seed } from './building-style';
import { groundOccupancy, overlaps, type GroundBox } from './landscape';
import { roadIntersects, type UrbanPlan, type Road } from './urban-layout';
import type { Prop } from './environment';

export const vehicleKinds = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck', 'bus', 'taxi'] as const;
export type VehicleKind = typeof vehicleKinds[number];
export const vehicleSizes: Record<VehicleKind, [number, number, number]> = {
    sedan: [.31, .27, .78], suv: [.34, .35, .85], hatchback: [.3, .29, .65],
    pickup: [.35, .32, .94], van: [.36, .43, 1], truck: [.4, .52, 1.35],
    bus: [.42, .49, 1.8], taxi: [.31, .3, .78],
};
export interface Vehicle extends Prop { kind: VehicleKind; roadId: string; color: string }
export type FacilityKind = 'stop' | 'terminal' | 'subway' | 'rail';
export interface Facility extends Prop { kind: FacilityKind; roadId: string }
export interface WaterFeature extends Prop { kind: 'fountain' | 'pond' | 'lake'; variant: number }
export interface Amenities { vehicles: Vehicle[]; facilities: Facility[]; water: WaterFeature[]; waterfrontBenches: Prop[]; squares: Prop[]; accessPaths: Prop[] }
export function footprint(p: Prop): GroundBox {
    const c = Math.abs(Math.cos(p.rotation ?? 0)), s = Math.abs(Math.sin(p.rotation ?? 0));
    return { x: p.x, z: p.z, width: p.width * c + p.depth * s, depth: p.depth * c + p.width * s };
}
const colors = ['#c5c5bc', '#7c8b91', '#8e5c50', '#555e65', '#77876a', '#e0d9c9', '#536c7d'];
const lengthOf = (r: Road) => Math.hypot(r.bx - r.ax, r.bz - r.az);

/** Static municipal scenery. These are never repository objects or activity data. */
export function amenitiesPlan(plan: UrbanPlan, landscape: { parks: Prop[]; plazas: Prop[]; paths: Prop[] }): Amenities {
    const result: Amenities = { vehicles: [], facilities: [], water: [], waterfrontBenches: [], squares: [], accessPaths: [] };
    const count = plan.buildings.length + plan.aggregates.reduce((n, b) => n + b.count, 0);
    if (!count) return result;
    const ground = groundOccupancy(plan), repositoryGround = groundOccupancy({ ...plan, roads: [] }), used: GroundBox[] = [];
    const within = (b: GroundBox) => Math.abs(b.x - plan.bounds.x) + b.width / 2 <= plan.bounds.width / 2 && Math.abs(b.z - plan.bounds.z) + b.depth / 2 <= plan.bounds.depth / 2;
    const clear = (b: GroundBox) => within(b) && ground.clear(b) && !used.some(other => overlaps(b, other)) && !landscape.paths.some(path => overlaps(b, path));
    function reserve(p: Prop) { const b = footprint(p); used.push({ ...b, width: b.width + .3, depth: b.depth + .3 }); }
    const roads = [...plan.roads].filter(r => r.width >= 1.2 && lengthOf(r) > 7).sort((a, b) => seed(a.id) - seed(b.id) || a.id.localeCompare(b.id));
    function atRoad(r: Road, distance: number, side: number, offset: number) {
        const length = lengthOf(r), dx = (r.bx - r.ax) / length, dz = (r.bz - r.az) / length;
        return { x: r.ax + dx * distance + dz * offset * side, z: r.az + dz * distance - dx * offset * side, rotation: Math.atan2(dx, dz) + (side < 0 ? Math.PI : 0) };
    }
    // Prefer major connected streets. At most a few facilities are placed, and
    // each gets its entire approach/platform reserved before trees are planted.
    const desires: { kind: FacilityKind; width: number; depth: number; height: number; limit: number }[] = [
        { kind: 'rail', width: 3, depth: 16, height: 1.1, limit: count >= 8000 ? 1 : 0 },
        { kind: 'terminal', width: 1.8, depth: 4.5, height: 1, limit: count >= 2500 ? Math.min(2, Math.floor(Math.log10(count) - 2)) : 0 },
        { kind: 'subway', width: .95, depth: 1.8, height: .85, limit: count >= 4000 ? Math.min(6, Math.floor(Math.log2(count / 1000))) : 0 },
        { kind: 'stop', width: .65, depth: 1.8, height: .85, limit: Math.min(16, Math.max(1, Math.round(Math.sqrt(count) / 16))) },
    ];
    for (const desire of desires) {
        let placed = 0;
        for (const road of roads) {
            if (placed >= desire.limit) break;
            if (desire.kind !== 'stop' && !road.major || lengthOf(road) < desire.depth + 6) continue;
            for (const fraction of [.32, .68, .5]) {
                if (placed >= desire.limit) break;
                for (const side of [1, -1]) {
                    const p: Facility = { id: road.id + ':' + desire.kind + ':' + placed, ...atRoad(road, lengthOf(road) * fraction, side, road.width / 2 + .65 + desire.width / 2), ...desire, roadId: road.id };
                    const box = footprint(p);
                    if (!clear(box)) continue;
                    const access: Prop = { id: p.id + ':access', ...atRoad(road, lengthOf(road) * fraction, side, road.width / 2 + .45), width: .45, depth: .6, height: .065 };
                    if (!repositoryGround.clear(footprint(access))) continue;
                    result.facilities.push(p); result.accessPaths.push(access); reserve(p); reserve(access); placed++; break;
                }
            }
        }
    }
    // Lakes live in one bank of a large park; the central park walk stays open.
    for (const park of landscape.parks) {
        if (result.water.filter(w => w.kind !== 'fountain').length >= 4) break;
        const short = Math.min(park.width, park.depth), area = park.width * park.depth;
        if (short < 7 || area < 90) continue;
        const lake = area > 800 && short > 16;
        const width = Math.min(park.width * .32, lake ? 13 : 4), depth = Math.min(park.depth * .32, lake ? 10 : 3.5);
        for (const side of [-1, 1]) {
            const p: WaterFeature = { id: park.id + ':water', x: park.x + (park.width >= park.depth ? 0 : side * park.width * .25), z: park.z + (park.width >= park.depth ? side * park.depth * .25 : 0), width, depth, height: .09, kind: lake ? 'lake' : 'pond', variant: seed(park.id) % 3 };
            const box = { ...p, width: p.width + .8, depth: p.depth + .8 };
            if (!clear(box)) continue;
            result.water.push(p); used.push(box);
            const bench = { id: p.id + ':bench', x: p.x + width / 2 + .2, z: p.z, width: .25, depth: .7, height: .24 };
            if (ground.clear(bench) && within(bench)) result.waterfrontBenches.push(bench);
            break;
        }
    }
    for (const plaza of landscape.plazas) {
        if (result.water.filter(w => w.kind === 'fountain').length >= 6 || Math.min(plaza.width, plaza.depth) < 1.8) continue;
        const p: WaterFeature = { ...plaza, id: plaza.id + ':fountain', width: 1.1, depth: 1.1, height: .5, kind: 'fountain', variant: 0 };
        if (clear(p)) { result.water.push(p); reserve(p); }
    }
    // Convert a few suitably broad street-side green pockets to small public
    // squares when the original reserved forecourts cannot accommodate a basin.
    for (const park of landscape.parks) {
        if (result.water.filter(w => w.kind === 'fountain').length >= 3) break;
        if (Math.min(park.width, park.depth) < 1.8) continue;
        const square = { id: park.id + ':square', x: park.x, z: park.z, width: 1.7, depth: 1.7, height: .055 };
        if (!clear(square) || !plan.roads.some(r => roadIntersects(r, { ...square, width: 5, depth: 5 }))) continue;
        result.squares.push(square); reserve(square);
        result.water.push({ ...square, id: square.id + ':fountain', width: .9, depth: .9, height: .5, kind: 'fountain', variant: 0 });
    }
    // Curbside parallel bays leave the center of each street clear. Crossroads,
    // crosswalks, terminal approaches, and overlapping road endpoints stay empty.
    const vehicleLimit = Math.min(320, Math.max(2, Math.round(count * .75)), Math.round(10 + Math.sqrt(count) * 3));
    for (const road of roads) {
        if (result.vehicles.length >= vehicleLimit) break;
        const length = lengthOf(road), horizontal = Math.abs(road.bx - road.ax) > .01;
        const slots = Math.min(8, Math.floor((length - 5) / 2.2));
        for (let slot = 0; slot < slots && result.vehicles.length < vehicleLimit; slot++) {
            const h = seed(road.id + ':bay:' + slot);
            const available: VehicleKind[] = road.major && road.width >= 1.4 ? [...vehicleKinds] : ['sedan', 'suv', 'hatchback', 'pickup'];
            let kind = available[h % available.length];
            if (kind === 'taxi' && h % 3 !== 0) kind = 'sedan';
            const [width, height, depth] = vehicleSizes[kind], distance = 2.7 + (length - 5.4) * (slot + .5) / Math.max(1, slots);
            const p: Vehicle = { id: road.id + ':vehicle:' + slot, ...atRoad(road, distance, h % 2 ? 1 : -1, road.width / 2 - width / 2 - .04), width, height, depth, kind, roadId: road.id, color: kind === 'taxi' ? '#c7a34a' : kind === 'bus' ? '#7c9a97' : colors[(h >>> 8) % colors.length] };
            const box = footprint(p);
            if (!within(box) || !repositoryGround.clear(box) || used.some(other => overlaps(box, other))) continue;
            // Ignore collinear duplicate road segments; reject real junctions.
            if (plan.roads.some(other => (Math.abs(other.bx - other.ax) > .01) !== horizontal && roadIntersects(other, box, 1))) continue;
            // Facilities have pedestrian approaches perpendicular to the curb.
            if (result.facilities.some(f => f.roadId === road.id && Math.hypot(f.x - p.x, f.z - p.z) < f.depth / 2 + 1.4)) continue;
            result.vehicles.push(p); reserve(p);
        }
    }
    return result;
}
