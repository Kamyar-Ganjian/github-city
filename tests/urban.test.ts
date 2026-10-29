import { describe, it, expect } from 'vitest';
import { normalize } from '../lib/model';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { initialNavigation, navigate } from '../lib/navigation';
import { urbanLayout, roadIntersects } from '../lib/urban-layout';
import { environmentPlan } from '../lib/environment';
function fixture(count: number) { return prepareRepository(normalize(Array.from({ length: count }, (_, i) => ({ path: 'src/d' + i % 12 + '/f' + i + '.ts', type: 'blob', size: 300 + i * 70 })))); }
function overlap(a: {
    x: number;
    z: number;
    width: number;
    depth: number;
}, b: {
    x: number;
    z: number;
    width: number;
    depth: number;
}) { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 - 1e-6; }
describe('urban planning', () => {
    it('reproduces the same city independent of input ordering', () => { const prepared = fixture(500), base = mapView(prepared, initialNavigation); const a = urbanLayout(base.buildings, base.aggregates, base.representedFiles), b = urbanLayout([...base.buildings].reverse(), [...base.aggregates].reverse(), base.representedFiles); expect(a).toEqual(b); expect(environmentPlan(a)).toEqual(environmentPlan(b)); });
    it('never places roads through repository footprints', () => { const prepared = fixture(500), view = mapView(prepared, initialNavigation); const boxes = [...view.buildings.map(b => ({ x: b.x, z: b.z, width: 1.55, depth: 1.55 })), ...view.aggregates]; for (const road of view.urban.roads)
        for (const box of boxes)
            expect(roadIntersects(road, box)).toBe(false); });
    it('keeps district units and environmental props separated', () => { const view = mapView(fixture(500), initialNavigation), env = environmentPlan(view.urban), boxes = [...view.buildings.map(b => ({ x: b.x, z: b.z, width: 1.55, depth: 1.55 })), ...view.aggregates]; const props = [...env.trees, ...env.background, ...env.benches, ...env.lamps]; expect(env.parks.length + env.plazas.length).toBeGreaterThan(0); for (const prop of props)
        for (const box of boxes)
            expect(overlap(prop, box)).toBe(false); expect(env.trees.length).toBeLessThanOrEqual(512); expect(env.background.length).toBeLessThanOrEqual(24); });
    it('preserves every file exactly once in a 100,000-file overview', () => { const prepared = fixture(100000), view = mapView(prepared, navigate(initialNavigation, { type: 'whole' })); expect(view.representedFiles).toBe(100000); expect(view.buildings.length + view.aggregates.reduce((n, a) => n + a.count, 0)).toBe(100000); expect(view.buildings.length + view.aggregates.length).toBeLessThanOrEqual(8000); expect(view.urban.plots.length).toBeLessThanOrEqual(64); expect(view.urban.roads.length).toBeLessThan(4000); });
    it('creates connected roads, including shelf connectors and local intersections', () => { const roads = mapView(fixture(300), initialNavigation).urban.roads; const connected = new Set<number>([0]), pending = [0]; function touches(a: typeof roads[number], b: typeof roads[number]) { return Math.max(Math.min(a.ax, a.bx), Math.min(b.ax, b.bx)) <= Math.min(Math.max(a.ax, a.bx), Math.max(b.ax, b.bx)) + 1e-6 && Math.max(Math.min(a.az, a.bz), Math.min(b.az, b.bz)) <= Math.min(Math.max(a.az, a.bz), Math.max(b.az, b.bz)) + 1e-6; } while (pending.length) {
        const i = pending.pop()!;
        roads.forEach((road, j) => { if (!connected.has(j) && touches(roads[i], road)) {
            connected.add(j);
            pending.push(j);
        } });
    } expect(connected.size).toBe(roads.length); });
    it('keeps original metadata unchanged when the city is projected', () => { const prepared = fixture(300), before = prepared.city.buildings.map(b => [b.file.path, b.x, b.z, b.height]); const view = mapView(prepared, initialNavigation); expect(prepared.city.buildings.map(b => [b.file.path, b.x, b.z, b.height])).toEqual(before); expect(new Set(view.buildings.map(b => b.file.path)).size).toBe(300); });
});
