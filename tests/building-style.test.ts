import { describe, it, expect } from 'vitest';
import { normalize, height } from '../lib/model';
import { aggregateHeight } from '../lib/explorer';
import { buildingKind, buildingKinds, buildingFootprints, windowPixels } from '../lib/building-style';
import { buildingGeometry } from '../components/building-geometry';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { initialNavigation } from '../lib/navigation';
function file(path: string) { return normalize([{ path, type: 'blob', size: 100 }])[0]; }
describe('building categories and scale', () => {
    it.each([['src/app.ts', 'source'], ['src/app.test.ts', 'test'], ['tests/fixture.ts', 'test'], ['package.json', 'configuration'], ['README.md', 'documentation'], ['images/logo.svg', 'asset'], ['data/unknown.bin', 'other']])('classifies %s by explicit filename/path rules', (path, kind) => expect(buildingKind(file(path))).toBe(kind));
    it('caps extreme file heights while preserving monotonic growth below the cap', () => { expect(height(0)).toBe(.85); expect(height(10000)).toBeGreaterThan(height(1000)); expect(height(1e15)).toBe(12); expect(aggregateHeight(1e15)).toBe(22); });
    it('keeps every file archetype in the same unit-height envelope', () => { for (const kind of buildingKinds) {
        const geometry = buildingGeometry(kind), box = geometry.boundingBox!;
        expect(box.min.y).toBeCloseTo(-.5);
        expect(box.max.y).toBeCloseTo(.5);
        expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.000001);
        expect(box.max.z - box.min.z).toBeLessThanOrEqual(1.000001);
        expect(buildingFootprints[kind].width).toBeLessThanOrEqual(1.55);
        expect(buildingFootprints[kind].depth).toBeLessThanOrEqual(1.55);
        geometry.dispose();
    } });
    it('uses distinct, reusable geometry without multiplying file instances', () => { const sizes = buildingKinds.map(kind => { const geometry = buildingGeometry(kind), count = geometry.attributes.position.count; geometry.dispose(); return count; }); expect(new Set(sizes).size).toBeGreaterThan(2); });
    it('produces a deterministic window atlas with black roof texels and lit windows', () => { const a = windowPixels(), b = windowPixels(); expect(a.data).toEqual(b.data); expect([...a.data.slice(0, 4)]).toEqual([0, 0, 0, 255]); expect(a.data.some((value, i) => i % 4 !== 3 && value > 0)).toBe(true); });
    it('keeps a huge module from stretching the aggregated overview', () => {
        const files = normalize([...Array.from({ length: 10000 }, (_, i) => ({ path: 'large/f' + i + '.ts', type: 'blob', size: 10 })), { path: 'small/a.ts', type: 'blob', size: 1 }, { path: 'massive.bin', type: 'blob', size: 1e15 }]);
        const prepared = prepareRepository(files), view = mapView(prepared, initialNavigation);
        expect(view.representedFiles).toBe(10002);
        expect(view.aggregates.every(a => a.width === 7 && a.depth === 7 && a.height <= 22)).toBe(true);
        expect(view.bounds.width).toBeLessThan(50);
        expect(view.buildings[0].height).toBe(12);
    });
});
