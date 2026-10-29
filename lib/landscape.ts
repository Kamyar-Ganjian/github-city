import type { UrbanPlan } from './urban-layout';

export interface GroundBox { x: number; z: number; width: number; depth: number }
export const overlaps = (a: GroundBox, b: GroundBox) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;

/** Broad-phase occupancy shared by land use and planting, including sidewalk clearance. */
export function groundOccupancy(plan: UrbanPlan) {
    const cells = new Map<string, GroundBox[]>(), pitch = Math.max(16, Math.max(plan.bounds.width, plan.bounds.depth) / 128);
    const range = (b: GroundBox) => [Math.floor((b.x - b.width / 2) / pitch), Math.floor((b.x + b.width / 2) / pitch), Math.floor((b.z - b.depth / 2) / pitch), Math.floor((b.z + b.depth / 2) / pitch)];
    function add(b: GroundBox) {
        const [x0, x1, z0, z1] = range(b);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
            const key = x + ':' + z, list = cells.get(key) ?? [];
            list.push(b); cells.set(key, list);
        }
    }
    for (const b of plan.buildings) add({ ...b, width: 2.1, depth: 2.1 });
    for (const b of plan.aggregates) add({ ...b, width: b.width + .9, depth: b.depth + .9 });
    for (const r of plan.roads) add({ x: (r.ax + r.bx) / 2, z: (r.az + r.bz) / 2, width: Math.abs(r.bx - r.ax) + r.width + 1.1, depth: Math.abs(r.bz - r.az) + r.width + 1.1 });
    function clear(b: GroundBox) {
        const [x0, x1, z0, z1] = range(b);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++)
            if (cells.get(x + ':' + z)?.some(other => overlaps(b, other))) return false;
        return true;
    }
    return { add, clear };
}

/** Conservative raster of vacant land, coalesced into non-overlapping lawns.
 * Work is bounded to 192² cells; cells touching protected ground stay unplanted.
 */
export function landscapeLots(plan: UrbanPlan, occupancy = groundOccupancy(plan)): GroundBox[] {
    if (!plan.buildings.length && !plan.aggregates.length) return [];
    const step = Math.max(.65, Math.max(plan.bounds.width, plan.bounds.depth) / 192);
    const columns = Math.floor(plan.bounds.width / step), rows = Math.floor(plan.bounds.depth / step);
    const left = plan.bounds.x - columns * step / 2, top = plan.bounds.z - rows * step / 2;
    const free = new Uint8Array(columns * rows), lots: GroundBox[] = [];
    for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++)
        free[z * columns + x] = Number(occupancy.clear({ x: left + (x + .5) * step, z: top + (z + .5) * step, width: step, depth: step }));
    for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++) {
        if (!free[z * columns + x]) continue;
        let width = 1, depth = 1;
        while (x + width < columns && free[z * columns + x + width]) width++;
        outer: while (z + depth < rows) {
            for (let dx = 0; dx < width; dx++) if (!free[(z + depth) * columns + x + dx]) break outer;
            depth++;
        }
        for (let dz = 0; dz < depth; dz++) free.fill(0, (z + dz) * columns + x, (z + dz) * columns + x + width);
        lots.push({ x: left + (x + width / 2) * step, z: top + (z + depth / 2) * step, width: width * step, depth: depth * step });
    }
    // Favor meaningful continuous green space under extreme fragmentation.
    return lots.sort((a, b) => b.width * b.depth - a.width * a.depth || a.z - b.z || a.x - b.x).slice(0, 3072);
}
