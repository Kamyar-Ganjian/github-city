import { seed } from './building-style';
import { UrbanPlan, roadIntersects } from './urban-layout';
export interface Prop {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    rotation?: number;
}
export interface EnvironmentPlan {
    parks: Prop[];
    plazas: Prop[];
    trees: Prop[];
    lamps: Prop[];
    benches: Prop[];
    background: Prop[];
}
interface Box {
    x: number;
    z: number;
    width: number;
    depth: number;
}
const intersects = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
export function environmentPlan(plan: UrbanPlan): EnvironmentPlan {
    const result: EnvironmentPlan = { parks: [], plazas: [], trees: [], lamps: [], benches: [], background: [] };
    const occupied: Box[] = [...plan.buildings.map(b => ({ x: b.x, z: b.z, width: 1.75, depth: 1.75 })), ...plan.aggregates.map(b => ({ x: b.x, z: b.z, width: b.width + .4, depth: b.depth + .4 }))];
    const buckets = new Map<string, Box[]>(), cell = 16;
    for (const b of occupied)
        for (let x = Math.floor((b.x - b.width / 2) / cell); x <= Math.floor((b.x + b.width / 2) / cell); x++)
            for (let z = Math.floor((b.z - b.depth / 2) / cell); z <= Math.floor((b.z + b.depth / 2) / cell); z++) {
                const key = x + ':' + z, list = buckets.get(key) ?? [];
                list.push(b);
                buckets.set(key, list);
            }
    function clear(b: Box) {
        for (let x = Math.floor((b.x - b.width / 2) / cell); x <= Math.floor((b.x + b.width / 2) / cell); x++)
            for (let z = Math.floor((b.z - b.depth / 2) / cell); z <= Math.floor((b.z + b.depth / 2) / cell); z++)
                if ((buckets.get(x + ':' + z) ?? []).some(other => intersects(b, other)))
                    return false;
        return !plan.roads.some(road => roadIntersects(road, b, .5));
    }
    const used: Box[] = [];
    const place = (target: Prop[], prop: Prop) => {
        if (!clear(prop) || used.some(other => intersects(prop, other)))
            return;
        target.push(prop);
        used.push(prop);
    };
    for (const plot of plan.plots) {
        const patch = { ...plot, height: plot.kind === 'park' ? .14 : .1 };
        if (!clear(patch))
            continue;
        (plot.kind === 'park' ? result.parks : result.plazas).push(patch);
        const count = plot.kind === 'park' ? 3 : 1;
        for (let i = 0; i < count && result.trees.length < 128; i++) {
            const hash = seed(plot.id + ':' + i), x = plot.x + ((hash % 100) / 100 - .5) * Math.max(0, plot.width - .9), z = plot.z + (((hash >>> 8) % 100) / 100 - .5) * Math.max(0, plot.depth - .9);
            place(result.trees, { id: plot.id + ':tree' + i, x, z, width: .65, depth: .65, height: .9 + (hash % 4) * .12 });
        }
        if (result.benches.length < 48)
            place(result.benches, { id: plot.id + ':bench', x: plot.x + plot.width / 2 - .35, z: plot.z, width: .25, depth: .7, height: .24 });
        if (plot.width >= 2.8 && plot.depth >= 2.5 && result.background.length < 24)
            place(result.background, { id: plot.id + ':service', x: plot.x - plot.width / 2 + .65, z: plot.z + plot.depth / 2 - .65, width: 1, depth: 1, height: .65 + (seed(plot.id) % 3) * .2 });
    }
    for (const road of plan.roads) {
        if (result.lamps.length >= 96)
            break;
        const length = Math.hypot(road.bx - road.ax, road.bz - road.az);
        if (length < 4)
            continue;
        const dx = (road.bx - road.ax) / length, dz = (road.bz - road.az) / length, side = road.width / 2 + .35;
        place(result.lamps, { id: road.id + ':lamp', x: (road.ax + road.bx) / 2 - dz * side, z: (road.az + road.bz) / 2 + dx * side, width: .15, depth: .15, height: 1.5 });
    }
    return result;
}
