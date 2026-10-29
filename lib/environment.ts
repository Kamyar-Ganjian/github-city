import { seed } from './building-style';
import { UrbanPlan } from './urban-layout';
import { groundOccupancy, landscapeLots, overlaps } from './landscape';
import { amenitiesPlan, footprint, type Amenities } from './amenities';
export interface Prop {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    rotation?: number;
}
export interface EnvironmentPlan extends Amenities {
    parks: Prop[];
    plazas: Prop[];
    paths: Prop[];
    shrubs: Prop[];
    trees: Prop[];
    lamps: Prop[];
    benches: Prop[];
    background: Prop[];
}
export function environmentPlan(plan: UrbanPlan): EnvironmentPlan {
    const result: EnvironmentPlan = { parks: [], plazas: [], paths: [], shrubs: [], trees: [], lamps: [], benches: [], background: [], vehicles: [], facilities: [], water: [], waterfrontBenches: [], squares: [], accessPaths: [] };
    const ground = groundOccupancy(plan), planting = groundOccupancy(plan);
    const plots = [...plan.plots].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    for (const plot of plots) {
        if (plot.kind !== 'plaza' || !ground.clear(plot)) continue;
        result.plazas.push({ ...plot, height: .08 });
        ground.add(plot); planting.add(plot);
    }
    const lots = landscapeLots(plan, ground);
    result.parks = lots.map((lot, i) => ({ ...lot, id: 'green:' + i, height: .035 }));
    // A longitudinal walk through broad parks leaves two planting banks. Paths
    // terminate at the park edge and never cross protected roads or file lots.
    for (const park of result.parks) {
        if (Math.min(park.width, park.depth) < 4 || park.width * park.depth < 40 || result.paths.length >= 128) continue;
        const vertical = park.depth > park.width;
        const path = { ...park, id: park.id + ':walk', width: vertical ? .55 : park.width, depth: vertical ? park.depth : .55, height: .065 };
        result.paths.push(path);
        planting.add({ ...path, width: path.width + .25, depth: path.depth + .25 });
    }
    Object.assign(result, amenitiesPlan(plan, result));
    for (const prop of [...result.facilities, ...result.water, ...result.waterfrontBenches, ...result.squares, ...result.accessPaths]) {
        const box = footprint(prop);
        planting.add({ ...box, width: box.width + .4, depth: box.depth + .4 });
    }
    const place = (target: Prop[], prop: Prop) => {
        if (!planting.clear(prop)) return false;
        target.push(prop);
        planting.add({ ...prop, width: prop.width + .12, depth: prop.depth + .12 });
        return true;
    };
    const totalArea = lots.reduce((n, lot) => n + lot.width * lot.depth, 0);
    let attempts = 0;
    // Each park gets area-weighted clusters rather than an unrelated tree grid.
    // Seeded polar offsets make groves; narrow land becomes low shrub borders.
    for (const park of result.parks) {
        const area = park.width * park.depth;
        const clusters = Math.min(160, Math.max(1, Math.round(area / Math.max(8, totalArea / 500))));
        for (let cluster = 0; cluster < clusters && attempts < 8192; cluster++) {
            const hash = seed(park.id + ':grove:' + cluster);
            const cx = park.x + ((hash & 65535) / 65535 - .5) * park.width * .8;
            const cz = park.z + ((hash >>> 16) / 65535 - .5) * park.depth * .8;
            const radius = Math.min(Math.min(park.width, park.depth) * .28, 12);
            const plantingScale = Math.max(1, Math.min(2.3, Math.min(park.width, park.depth) / 8));
            for (let member = 0; member < 8 && attempts++ < 8192; member++) {
                const h = seed(hash + ':' + member), angle = (h & 65535) / 65535 * Math.PI * 2;
                const distance = Math.sqrt((h >>> 16) / 65535) * radius;
                const x = cx + Math.cos(angle) * distance, z = cz + Math.sin(angle) * distance;
                const tree = member < 4 && Math.min(park.width, park.depth) > 1.3 && result.trees.length < 512;
                const size = (tree ? .8 + (h % 100) / 100 * .85 : .3 + (h % 70) / 100) * plantingScale;
                const prop = { id: park.id + ':' + cluster + ':' + member, x, z, width: size, depth: size, height: tree ? (1.5 + (h % 100) / 100 * 1.5) * Math.sqrt(plantingScale) : .2 + (h % 40) / 100, rotation: angle };
                if (Math.abs(x - park.x) + prop.width / 2 > park.width / 2 || Math.abs(z - park.z) + prop.depth / 2 > park.depth / 2) continue;
                if (tree) place(result.trees, prop);
                else if (result.shrubs.length < 768) place(result.shrubs, prop);
            }
        }
        if (area > 12 && result.benches.length < 48) {
            // Benches sit beside the central walk, or at the lawn's edge.
            const vertical = park.depth > park.width;
            place(result.benches, { id: park.id + ':bench', x: park.x + (vertical ? .8 : 0), z: park.z + (vertical ? 0 : .8), width: vertical ? .3 : 1, depth: vertical ? 1 : .3, height: .24 });
        }
    }
    // Existing explicit service lots are optional and remain visually secondary.
    for (const plot of plots) {
        if (plot.width < 2.8 || plot.depth < 2.5 || result.background.length >= 24) continue;
        const prop = { id: plot.id + ':service', x: plot.x - plot.width / 2 + .65, z: plot.z + plot.depth / 2 - .65, width: 1, depth: 1, height: .65 + (seed(plot.id) % 3) * .2 };
        if (!result.paths.some(path => overlaps(path, prop))) place(result.background, prop);
    }
    for (const road of [...plan.roads].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
        if (result.lamps.length >= 96) break;
        const length = Math.hypot(road.bx - road.ax, road.bz - road.az);
        if (length < 4) continue;
        const dx = (road.bx - road.ax) / length, dz = (road.bz - road.az) / length, side = road.width / 2 + .7;
        place(result.lamps, { id: road.id + ':lamp', x: (road.ax + road.bx) / 2 - dz * side, z: (road.az + road.bz) / 2 + dx * side, width: .15, depth: .15, height: 1.5 });
    }
    return result;
}
