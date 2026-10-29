import { describe, it, expect } from 'vitest';
import { layout } from '../lib/layout';
import { normalize } from '../lib/model';
import { wholeCity, WHOLE_CITY_BUDGET } from '../lib/whole-city';
import { navigate, initialNavigation } from '../lib/navigation';
function makeCity(count: number) { return layout(normalize(Array.from({ length: count }, (_, i) => ({ path: 'src/d' + i % 30 + '/file' + i + '.ts', type: 'blob', size: i + 1 })))); }
describe('whole city', () => {
    it('shows every building directly for smaller repositories', () => { const city = makeCity(4000); const result = wholeCity(city); expect(result.buildings).toEqual(city.buildings); expect(result.blocks).toEqual([]); });
    it('represents all 100,000 files within a fixed visible budget', () => { const result = wholeCity(makeCity(100000)); expect(result.blocks.length + result.buildings.length).toBeLessThanOrEqual(WHOLE_CITY_BUDGET); expect(result.buildings.length + result.blocks.reduce((sum, b) => sum + b.count, 0)).toBe(100000); expect(result.blocks.every(b => b.count > 1)).toBe(true); });
    it('preserves total bytes and original positions for singletons', () => { const city = makeCity(10001), result = wholeCity(city, 100); expect(result.buildings.reduce((sum, b) => sum + b.file.size, 0) + result.blocks.reduce((sum, b) => sum + b.bytes, 0)).toBe(city.buildings.reduce((sum, b) => sum + b.file.size, 0)); for (const b of result.buildings)
        expect(b).toEqual(city.buildings.find(original => original.file.id === b.file.id)); });
    it('is independent of input order including tied language colors', () => { const city = makeCity(5000); expect(wholeCity({ ...city, buildings: [...city.buildings].reverse() }, 200)).toEqual(wholeCity(city, 200)); });
    it('handles narrow layouts without breaking the budget', () => { const city = makeCity(2000); expect(wholeCity({ ...city, width: 1, depth: 1e8 }, 100).blocks.length).toBeLessThanOrEqual(100); });
    it('supports empty trees and validates budgets', () => { expect(wholeCity(layout([])).fileCount).toBe(0); expect(() => wholeCity(layout([]), 0)).toThrow(); });
    it('keeps blocks inside the original city bounds', () => { const city = makeCity(10000); for (const b of wholeCity(city, 200).blocks) {
        expect(Math.abs(b.x) + b.width / 2).toBeLessThan(city.width / 2);
        expect(Math.abs(b.z) + b.depth / 2).toBeLessThan(city.depth / 2);
    } });
    it('returns from whole city to file detail through navigation', () => { const whole = navigate(initialNavigation, { type: 'whole' }); expect(whole.mode).toBe('whole'); const file = makeCity(1).buildings[0].file; const detail = navigate(whole, { type: 'file', path: file.path, directory: file.directory, page: 0, focus: true }); expect(detail.mode).toBe('directory'); expect(detail.focus.path).toBe(file.path); });
});
