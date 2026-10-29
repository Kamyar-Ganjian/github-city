import { describe, expect, it } from 'vitest';
import { normalize } from '../lib/model';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { navigate, initialNavigation } from '../lib/navigation';
import { environmentPlan } from '../lib/environment';
import { amenitiesPlan, footprint, vehicleKinds } from '../lib/amenities';
import { groundOccupancy, overlaps } from '../lib/landscape';
import { roadIntersects } from '../lib/urban-layout';
import { vehicleGeometry, facilityGeometry, waterGeometry } from '../components/amenity-geometry';
import { vehicleSizes } from '../lib/amenities';
import { Color } from 'three';

function city(count: number) {
    return mapView(prepareRepository(normalize(Array.from({ length: count }, (_, i) => ({ path: `src/d${i % Math.min(100, Math.ceil(count / 10))}/f${i}.ts`, type: 'blob', size: 1000 + i })))), navigate(initialNavigation, { type: 'whole' })).urban;
}
describe('municipal placement', () => {
    it('parks within the curb and leaves junctions, foundations and other vehicles clear', () => {
        const plan = city(1500), env = environmentPlan(plan), ground = groundOccupancy({ ...plan, roads: [] });
        expect(env.vehicles.length).toBeGreaterThan(10);
        for (let i = 0; i < env.vehicles.length; i++) {
            const v = env.vehicles[i], box = footprint(v), road = plan.roads.find(r => r.id === v.roadId)!;
            const horizontal = Math.abs(road.bx - road.ax) > .01;
            expect(ground.clear(box)).toBe(true);
            expect(horizontal ? Math.abs(v.z - road.az) + box.depth / 2 : Math.abs(v.x - road.ax) + box.width / 2).toBeLessThan(road.width / 2);
            for (const other of plan.roads) if ((Math.abs(other.bx - other.ax) > .01) !== horizontal) expect(roadIntersects(other, box, 1)).toBe(false);
            for (const other of env.vehicles.slice(0, i)) expect(overlaps(box, footprint(other))).toBe(false);
        }
    });
    it('gives towns modest transport and supports a complete large-city transit family when land permits', () => {
        const small = environmentPlan(city(12)), large = environmentPlan(city(25000));
        expect(small.facilities.map(f => f.kind)).toEqual(['stop']);
        expect(small.vehicles.length).toBeLessThanOrEqual(9);
        expect(new Set(large.facilities.map(f => f.kind))).toEqual(new Set(['stop', 'terminal', 'subway', 'rail']));
        expect(new Set(large.vehicles.map(v => v.kind))).toEqual(new Set(vehicleKinds));
        expect(large.vehicles.length).toBeLessThanOrEqual(320);
        expect(large.facilities.length).toBeLessThanOrEqual(25);
    });
    it('reserves station approaches and shoreline space before planting', () => {
        const plan = city(25000), env = environmentPlan(plan), ground = groundOccupancy(plan);
        for (const f of [...env.facilities, ...env.water, ...env.squares]) {
            const box = footprint(f);
            expect(ground.clear(box)).toBe(true);
            expect(env.paths.some(p => overlaps(p, box))).toBe(false);
            for (const plant of [...env.trees, ...env.shrubs]) expect(overlaps(plant, box)).toBe(false);
        }
        expect(env.water.some(w => w.kind === 'lake')).toBe(true);
        expect(env.accessPaths.length).toBe(env.facilities.length);
        for (const access of env.accessPaths) {
            expect(groundOccupancy({ ...plan, roads: [] }).clear(footprint(access))).toBe(true);
            for (const road of plan.roads) expect(roadIntersects(road, footprint(access))).toBe(false);
        }
        for (const w of env.water.filter(w => w.kind !== 'fountain')) expect(env.parks.some(p => Math.abs(w.x - p.x) + w.width / 2 < p.width / 2 && Math.abs(w.z - p.z) + w.depth / 2 < p.depth / 2)).toBe(true);
        expect(env.water.filter(w => w.kind !== 'fountain').length).toBeLessThanOrEqual(4);
    });
    it('is deterministic independent of input order and does not alter repository data', () => {
        const plan = city(500), before = JSON.stringify(plan), env = environmentPlan(plan);
        const reversed = { ...plan, roads: [...plan.roads].reverse(), buildings: [...plan.buildings].reverse() };
        expect(amenitiesPlan(plan, env)).toEqual(amenitiesPlan(reversed, env));
        expect(JSON.stringify(plan)).toBe(before);
    });
});
describe('shared procedural models', () => {
    it('keeps wheel circles round after each vehicle receives its world-space dimensions', () => {
        const rubber = new Color('#283035');
        for (const kind of vehicleKinds) {
            const model = vehicleGeometry(kind), p = model.trim.attributes.position, c = model.trim.attributes.color;
            const y: number[] = [], z: number[] = [];
            for (let i = 0; i < p.count; i++) if (p.getX(i) > .2 && p.getZ(i) > 0 && Math.abs(c.getX(i) - rubber.r) < 1e-6 && Math.abs(c.getY(i) - rubber.g) < 1e-6) { y.push(p.getY(i)); z.push(p.getZ(i)); }
            const worldY = (Math.max(...y) - Math.min(...y)) * vehicleSizes[kind][1];
            const worldZ = (Math.max(...z) - Math.min(...z)) * vehicleSizes[kind][2];
            expect(worldY / worldZ).toBeGreaterThan(.94); expect(worldY / worldZ).toBeLessThan(1.06);
            model.paint.dispose(); model.trim.dispose();
        }
    });
    it('keeps every vehicle within a consistent footprint and supports all silhouettes', () => {
        const signatures = new Set<string>();
        for (const kind of vehicleKinds) {
            const model = vehicleGeometry(kind);
            signatures.add(model.paint.attributes.position.count + ':' + model.trim.attributes.position.count);
            for (const g of Object.values(model)) {
                g.computeBoundingBox();
                const b = g.boundingBox!;
                expect(b.min.x).toBeGreaterThanOrEqual(-.505); expect(b.max.x).toBeLessThanOrEqual(.505);
                expect(b.min.z).toBeGreaterThanOrEqual(-.505); expect(b.max.z).toBeLessThanOrEqual(.505);
                expect(b.min.y).toBeGreaterThanOrEqual(-.001); expect(b.max.y).toBeLessThanOrEqual(1.001);
                expect(g.attributes.color.count).toBe(g.attributes.position.count);
                g.dispose();
            }
        }
        expect(signatures.size).toBeGreaterThanOrEqual(6);
    });
    it('batches station details and builds bounded shoreline rings with open water', () => {
        for (const kind of ['stop', 'terminal', 'subway', 'rail'] as const) {
            const g = facilityGeometry(kind); g.computeBoundingBox();
            expect(g.boundingBox!.min.x).toBeGreaterThanOrEqual(-.501);
            expect(g.boundingBox!.max.x).toBeLessThanOrEqual(.501);
            expect(g.boundingBox!.min.z).toBeGreaterThanOrEqual(-.501);
            expect(g.boundingBox!.max.z).toBeLessThanOrEqual(.501);
            expect(g.boundingBox!.max.y).toBeLessThanOrEqual(1);
            g.dispose();
        }
        for (const kind of ['fountain', 'pond', 'lake'] as const) for (let variant = 0; variant < 3; variant++) {
            const model = waterGeometry(kind, variant);
            for (const g of Object.values(model)) { g.computeBoundingBox(); expect(g.boundingBox!.min.x).toBeGreaterThanOrEqual(-.501); expect(g.boundingBox!.max.z).toBeLessThanOrEqual(.501); expect(g.index!.count).toBeGreaterThan(0); g.dispose(); }
        }
    });
});
