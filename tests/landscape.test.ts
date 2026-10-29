import { describe, expect, it } from 'vitest';
import { groundOccupancy, landscapeLots, overlaps } from '../lib/landscape';
import { environmentPlan } from '../lib/environment';
import { urbanLayout, type UrbanPlan } from '../lib/urban-layout';
import { normalize } from '../lib/model';
import { prepareRepository } from '../lib/prepare';

function city(count = 80): UrbanPlan {
    const prepared = prepareRepository(normalize(Array.from({ length: count }, (_, i) => ({ path: `src/d${i % 7}/file${i}.ts`, type: 'blob', size: 300 }))));
    return urbanLayout(prepared.city.buildings, [], count);
}
describe('land use and planting', () => {
    it('reclaims wide vacant areas with continuous parks instead of isolated reserved lots', () => {
        const plan = city(1);
        plan.bounds = { x: 0, z: 0, width: 90, depth: 70 };
        const lots = landscapeLots(plan), area = lots.reduce((n, lot) => n + lot.width * lot.depth, 0);
        expect(area).toBeGreaterThan(90 * 70 * .8);
        expect(lots.some(lot => lot.width * lot.depth > 500)).toBe(true);
        const env = environmentPlan(plan);
        expect(env.paths.length).toBeGreaterThan(0);
        expect(env.trees.length).toBeGreaterThan(10);
        expect(env.shrubs.length).toBeGreaterThan(10);
    });
    it('respects file foundations, aggregate podiums, roads and sidewalk clearance', () => {
        const plan = city(), ground = groundOccupancy(plan), env = environmentPlan(plan);
        for (const prop of [...env.parks, ...env.paths, ...env.trees, ...env.shrubs, ...env.background, ...env.benches]) expect(ground.clear(prop)).toBe(true);
        const aggregate = { x: 0, z: 0, width: 9, depth: 8 };
        const withAggregate = { ...plan, aggregates: [aggregate] } as UrbanPlan;
        const protectedGround = groundOccupancy(withAggregate);
        for (const lot of landscapeLots(withAggregate)) expect(protectedGround.clear(lot)).toBe(true);
    });
    it('creates disjoint lawns and keeps groves within their lawn and outside walking paths', () => {
        const env = environmentPlan(city());
        for (let i = 0; i < env.parks.length; i++) for (let j = 0; j < i; j++) {
            // A tiny tolerance excludes floating point differences at shared edges.
            expect(overlaps({ ...env.parks[i], width: env.parks[i].width - 1e-8, depth: env.parks[i].depth - 1e-8 }, env.parks[j])).toBe(false);
        }
        for (const plant of [...env.trees, ...env.shrubs]) {
            expect(env.parks.some(park => Math.abs(plant.x - park.x) + plant.width / 2 <= park.width / 2 + 1e-8 && Math.abs(plant.z - park.z) + plant.depth / 2 <= park.depth / 2 + 1e-8)).toBe(true);
            expect(env.paths.some(path => overlaps(path, plant))).toBe(false);
        }
    });
    it('reproduces landscaped areas regardless of source order and never changes data', () => {
        const plan = city(), before = JSON.stringify(plan);
        expect(environmentPlan(plan)).toEqual(environmentPlan({ ...plan, buildings: [...plan.buildings].reverse(), roads: [...plan.roads].reverse() }));
        expect(JSON.stringify(plan)).toBe(before);
    });
    it('keeps generation bounded on a very broad sparse map', () => {
        const plan = city(1000);
        plan.bounds = { x: 0, z: 0, width: 50000, depth: 50000 };
        const env = environmentPlan(plan);
        expect(env.parks.length).toBeLessThanOrEqual(3072);
        expect(env.paths.length).toBeLessThanOrEqual(128);
        expect(env.trees.length).toBeLessThanOrEqual(512);
        expect(env.shrubs.length).toBeLessThanOrEqual(768);
        expect(env.parks.length).toBeGreaterThan(0);
    });
    it('does not create a landscaped city when there are no repository buildings', () => {
        const plan = urbanLayout([], [], 0);
        expect(environmentPlan(plan).parks).toEqual([]);
        expect(environmentPlan(plan).trees).toEqual([]);
    });
});
