import { describe, it, expect } from 'vitest';
import { normalize, height } from '../lib/model';
import { aggregateHeight } from '../lib/explorer';
import { architectureKind, architectureVariant, buildingKind, buildingKinds, buildingFootprints, facadePixels } from '../lib/building-style';
import { buildingGeometry } from '../components/building-geometry';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { initialNavigation } from '../lib/navigation';
describe('scale-based architecture', () => {
    it.each([[.85, false, 'townhouse'], [2, false, 'apartment'], [6, false, 'midrise'], [11, false, 'highrise'], [20, true, 'landmark']])('maps height %s to the architectural scale', (value, aggregate, kind) => expect(architectureKind(value as number, aggregate as boolean)).toBe(kind));
    it('does not choose architectural identity from file category', () => { const files = normalize([{ path: 'README.md', type: 'blob', size: 4096 }, { path: 'app.ts', type: 'blob', size: 4096 }, { path: 'image.svg', type: 'blob', size: 4096 }]); expect(new Set(files.map(buildingKind)).size).toBe(1); });
    it('caps height outliers while preserving monotonic size comparison', () => { expect(height(0)).toBe(.85); expect(height(10000)).toBeGreaterThan(height(1000)); expect(height(1e15)).toBe(12); expect(aggregateHeight(1e15)).toBe(22); });
    it('preserves the unit-height and footprint envelope for every seeded archetype', () => { for (const kind of buildingKinds)
        for (let variant = 0; variant < 3; variant++) {
            const geometry = buildingGeometry(kind, variant), box = geometry.boundingBox!;
            expect(box.min.y).toBeCloseTo(-.5);
            expect(box.max.y).toBeCloseTo(.5);
            expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.00001);
            expect(box.max.z - box.min.z).toBeLessThanOrEqual(1.00001);
            expect(buildingFootprints[kind].width).toBeLessThanOrEqual(1.55);
            geometry.dispose();
        } });
    it('varies architecture deterministically within a scale', () => { expect(architectureVariant('src/a.ts')).toBe(architectureVariant('src/a.ts')); const a = buildingGeometry('highrise', 0), b = buildingGeometry('highrise', 1); expect([...a.attributes.position.array]).not.toEqual([...b.attributes.position.array]); a.dispose(); b.dispose(); });
    it('creates repeatable facade, emissive and glass roughness atlases', () => { const a = facadePixels('landmark', 1), b = facadePixels('landmark', 1); expect(a.diffuse).toEqual(b.diffuse); expect(a.emissive).toEqual(b.emissive); expect([...a.emissive.slice(0, 4)]).toEqual([0, 0, 0, 255]); expect(a.emissive.some((value, i) => i % 4 !== 3 && value > 0)).toBe(true); expect(new Set(a.roughness).size).toBeGreaterThan(2); });
    it('preserves exact metadata and bounded dimensions for huge modules', () => { const files = normalize([...Array.from({ length: 10000 }, (_, i) => ({ path: 'large/f' + i + '.ts', type: 'blob', size: 10 })), { path: 'small/a.ts', type: 'blob', size: 1 }, { path: 'massive.bin', type: 'blob', size: 1e15 }]); const view = mapView(prepareRepository(files), initialNavigation); expect(view.representedFiles).toBe(10002); expect(view.aggregates.every(a => a.width <= 9 && a.height <= 22)).toBe(true); expect(view.bounds.width).toBeLessThan(55); expect(view.buildings[0].height).toBe(12); });
});
