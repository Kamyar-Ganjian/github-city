import type { Building, District } from './layout';
import type { CityBlock } from './whole-city';
import { comparePaths } from './explorer';
export interface Road {
    id: string;
    ax: number;
    az: number;
    bx: number;
    bz: number;
    width: number;
    major: boolean;
    kind: 'avenue' | 'street' | 'lane';
}
export interface Plot {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    kind: 'park' | 'plaza';
}
export interface UrbanPlan {
    buildings: Building[];
    aggregates: CityBlock[];
    districts: District[];
    roads: Road[];
    plots: Plot[];
    bounds: {
        x: number;
        z: number;
        width: number;
        depth: number;
    };
    density: number;
}
interface Group {
    path: string;
    files: Building[];
    aggregates: CityBlock[];
    columns: number;
    rows: number;
    slots: number;
    pitch: number;
    margin: number;
    width: number;
    depth: number;
    x: number;
    z: number;
}
export function roadIntersects(road: Road, box: {
    x: number;
    z: number;
    width: number;
    depth: number;
}, padding = 0) {
    return Math.min(road.ax, road.bx) - (road.width + padding) / 2 < box.x + box.width / 2 && Math.max(road.ax, road.bx) + (road.width + padding) / 2 > box.x - box.width / 2 && Math.min(road.az, road.bz) - (road.width + padding) / 2 < box.z + box.depth / 2 && Math.max(road.az, road.bz) + (road.width + padding) / 2 > box.z - box.depth / 2;
}
/** Plan every data unit; environmental budgets never change the represented data. */
export function urbanLayout(files: Building[], aggregates: CityBlock[], fileCount: number): UrbanPlan {
    const byPath = new Map<string, Group>();
    function group(path: string) { let g = byPath.get(path); if (!g) {
        g = { path, files: [], aggregates: [], columns: 0, rows: 0, slots: 0, pitch: 0, margin: 0, width: 0, depth: 0, x: 0, z: 0 };
        byPath.set(path, g);
    } return g; }
    for (const f of files)
        group(f.file.directory).files.push(f);
    for (const a of aggregates)
        group(a.directory).aggregates.push(a);
    const groups = [...byPath.values()].sort((a, b) => comparePaths(a.path, b.path));
    const density = Math.min(1, Math.log10(1 + fileCount) / 6);
    for (const g of groups) {
        g.files.sort((a, b) => comparePaths(a.file.path, b.file.path));
        g.aggregates.sort((a, b) => comparePaths(a.id, b.id));
        const count = g.files.length + g.aggregates.length;
        g.slots = count + Math.floor((count - 1) / 32);
        g.columns = Math.ceil(Math.sqrt(g.slots));
        g.rows = Math.ceil(g.slots / g.columns);
        g.pitch = g.aggregates.length ? 10 : 3.2;
        g.margin = g.aggregates.length ? 7 : 3;
        g.width = g.margin * 2 + 4 + (g.columns - 1) * g.pitch + Math.floor((g.columns - 1) / 4) * 2.4;
        g.depth = g.margin * 2 + (g.rows - 1) * g.pitch + Math.floor((g.rows - 1) / 4) * 2.4;
    }
    const area = groups.reduce((sum, g) => sum + (g.width + 6) * (g.depth + 6), 0);
    const target = groups.reduce((max, g) => Math.max(max, g.width), Math.sqrt(area) * 1.15);
    let x = 0, z = 0, rowDepth = 0, width = 0;
    const rows: {
        z: number;
        right: number;
    }[] = [];
    for (const g of groups) {
        if (x > 0 && x + g.width > target) {
            rows.push({ z, right: width });
            z += rowDepth + 6;
            x = 0;
            rowDepth = 0;
        }
        g.x = x;
        g.z = z;
        x += g.width + 6;
        rowDepth = Math.max(rowDepth, g.depth);
        width = Math.max(width, x - 6);
    }
    if (groups.length)
        rows.push({ z, right: width });
    const depth = z + rowDepth;
    const roads: Road[] = [], seen = new Set<string>(), plots: Plot[] = [], districts: District[] = [], placedFiles: Building[] = [], placedAggregates: CityBlock[] = [];
    const majorWidth = 1.2 + density * .6;
    const add = (ax: number, az: number, bx: number, bz: number, major = false, local = false) => {
        if (Math.hypot(bx - ax, bz - az) < .05)
            return;
        const id = [ax, az, bx, bz].map(v => v.toFixed(3)).join(':');
        if (seen.has(id))
            return;
        seen.add(id);
        roads.push({ id, ax, az, bx, bz, width: major ? majorWidth : local ? .9 + density * .1 : 1.1 + density * .2, major, kind: major ? 'avenue' : local ? 'lane' : 'street' });
    };
    if (groups.length) {
        add(-3, -3, width + 3, -3, true);
        add(width + 3, -3, width + 3, depth + 3, true);
        add(width + 3, depth + 3, -3, depth + 3, true);
        add(-3, depth + 3, -3, -3, true);
        for (const row of rows)
            add(-3, row.z + 1, row.right - 1, row.z + 1, true);
    }
    const detailStride = Math.max(1, Math.ceil(groups.length / 128));
    groups.forEach((g, groupIndex) => {
        const center = (column: number, row: number) => ({ x: g.x + g.margin + 4 + column * g.pitch + Math.floor(column / 4) * 2.4, z: g.z + g.margin + row * g.pitch + Math.floor(row / 4) * 2.4 });
        let i = 0;
        for (const f of g.files) {
            const slot = i + Math.floor(i / 32), p = center(slot % g.columns, Math.floor(slot / g.columns));
            placedFiles.push({ ...f, ...p });
            i++;
        }
        for (const a of g.aggregates) {
            const slot = i + Math.floor(i / 32), p = center(slot % g.columns, Math.floor(slot / g.columns));
            placedAggregates.push({ ...a, ...p });
            i++;
        }
        districts.push({ path: g.path, x: g.x + g.width / 2, z: g.z + g.depth / 2, width: g.width, depth: g.depth, level: 1 });
        if (groupIndex % detailStride !== 0)
            return;
        const left = g.x + 1, right = g.x + g.width - 1, top = g.z + 1, bottom = g.z + g.depth - 1;
        add(left, top, right, top, true);
        add(right, top, right, bottom);
        add(right, bottom, left, bottom);
        add(left, bottom, left, top);
        for (let col = 4; col < g.columns; col += 4) {
            const a = center(col - 1, 0), b = center(col, 0);
            const at = (a.x + b.x) / 2;
            add(at, top, at, bottom, false, true);
        }
        for (let row = 4; row < g.rows; row += 4) {
            const a = center(0, row - 1), b = center(0, row);
            const at = (a.z + b.z) / 2;
            add(left, at, right, at, false, true);
        }
        if (plots.length < 64)
            plots.push({ id: g.path + ':court', x: g.x + 4.3, z: g.z + g.depth / 2, width: 3, depth: Math.min(4, g.depth - 5), kind: groupIndex % 3 ? 'park' : 'plaza' });
        const parkStride = Math.max(1, Math.ceil(Math.floor(i / 32) / 32));
        for (let blank = 32; blank < g.slots && plots.length < 64; blank += 33 * parkStride) {
            const p = center(blank % g.columns, Math.floor(blank / g.columns));
            plots.push({ id: g.path + ':park' + blank, ...p, width: Math.min(g.pitch - 1, 4), depth: Math.min(g.pitch - 1, 4), kind: 'park' });
        }
        if (g.columns * g.rows > g.slots && plots.length < 64) {
            const p = center(g.slots % g.columns, Math.floor(g.slots / g.columns));
            plots.push({ id: g.path + ':empty', ...p, width: Math.min(g.pitch - 1, 4), depth: Math.min(g.pitch - 1, 4), kind: 'park' });
        }
    });
    const ox = width / 2, oz = depth / 2;
    for (const f of placedFiles) {
        f.x -= ox;
        f.z -= oz;
    }
    for (const a of placedAggregates) {
        a.x -= ox;
        a.z -= oz;
    }
    for (const d of districts) {
        d.x -= ox;
        d.z -= oz;
    }
    for (const p of plots) {
        p.x -= ox;
        p.z -= oz;
    }
    for (const r of roads) {
        r.ax -= ox;
        r.bx -= ox;
        r.az -= oz;
        r.bz -= oz;
    }
    return { buildings: placedFiles, aggregates: placedAggregates, districts, roads, plots, bounds: { x: 0, z: 0, width: Math.max(10, width + 8), depth: Math.max(10, depth + 8) }, density };
}
