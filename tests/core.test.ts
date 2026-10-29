import { describe, it, expect, vi } from 'vitest';
import { parseRepository, normalize, language, height, fileUrl } from '../lib/model';
import { indexRepository, searchRepository } from '../lib/explorer';
import { layout } from '../lib/layout';
import { loadRepository } from '../lib/github';
const files = normalize([{ path: 'src/a.ts', type: 'blob', size: 100 }, { path: 'src/nested/a.ts', type: 'blob', size: 10000 }, { path: 'README.md', type: 'blob', size: 800 }]);
describe('repository parsing', () => {
    it('accepts URL, shorthand, git suffix', () => { expect(parseRepository('https://github.com/facebook/react/')).toEqual({ owner: 'facebook', name: 'react' }); expect(parseRepository('vuejs/core.git').name).toBe('core'); });
    it.each(['', 'https://evil.com/a/b', 'a', 'a/b/tree/main', '../b', 'a/b?x'])('rejects %s', value => expect(() => parseRepository(value)).toThrow());
});
describe('normalization and classification', () => {
    it('sorts and ignores directories', () => expect(normalize([{ path: 'x', type: 'tree' }, ...files.map(f => ({ ...f, type: 'blob' }))]).length).toBe(3));
    it('handles missing sizes', () => expect(normalize([{ path: 'x', type: 'blob' }])[0].size).toBe(0));
    it('rejects malformed trees', () => expect(() => normalize({})).toThrow());
    it('classifies common extensions', () => { expect(language('a.tsx')).toBe('TypeScript'); expect(language('README.md')).toBe('Markdown'); expect(language('LICENSE')).toBe('Other'); });
    it('constrains monotonically increasing heights', () => { expect(height(0)).toBeGreaterThan(0); expect(height(10000)).toBeGreaterThan(height(100)); expect(height(1e12)).toBeLessThanOrEqual(19); });
});
describe('city geometry', () => {
    it('is deterministic regardless of input order', () => expect(layout([...files].reverse())).toEqual(layout(files)));
    it('handles empty input', () => expect(layout([]).buildings).toEqual([]));
    it('keeps each building inside its directory foundation', () => { const city = layout(files); for (const b of city.buildings) {
        const d = city.districts.find(d => d.path === b.file.directory)!;
        expect(Math.abs(b.x - d.x) + .775).toBeLessThan(d.width / 2);
        expect(Math.abs(b.z - d.z) + .775).toBeLessThan(d.depth / 2);
    } });
    it('does not overlap footprints across a representative hierarchy', () => { const many = normalize(Array.from({ length: 1000 }, (_, i) => ({ path: 'src/d' + i % 23 + '/nested' + i % 3 + '/file' + i + '.ts', type: 'blob', size: i * 100 }))); const city = layout(many); for (let i = 0; i < city.buildings.length; i++)
        for (let j = i + 1; j < city.buildings.length; j++) {
            const a = city.buildings[i], b = city.buildings[j];
            expect(Math.abs(a.x - b.x) >= 1.55 || Math.abs(a.z - b.z) >= 1.55).toBe(true);
        } });
});
describe('search and links', () => {
    it('matches paths and duplicate names case-insensitively', () => { expect(searchRepository(indexRepository(files), 'A.TS')).toHaveLength(2); expect(searchRepository(indexRepository(files), 'nested')).toHaveLength(2); expect(searchRepository(indexRepository(files), '')).toEqual([]); });
    it('encodes file paths', () => expect(fileUrl({ owner: 'a', name: 'b', branch: 'main', files: [], description: '', stars: 0 }, { ...files[0], path: 'src/a #.ts' })).toContain('src/a%20%23.ts'));
});
describe('GitHub pipeline', () => {
    const meta = { owner: { login: 'a' }, name: 'b', default_branch: 'develop', description: 'test', stargazers_count: 1 };
    const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value&&typeof value==='object'&&'tree' in value?{truncated:false,...value}:value), { status });
    it('uses actual default branch', async () => { const fetcher = vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ tree: [{ path: 'a.ts', size: 20, type: 'blob' }], truncated: false })); const repo = await loadRepository('a/b', fetcher); expect(repo.branch).toBe('develop'); expect(fetcher.mock.calls[1][0]).toContain('/develop?recursive=1'); });
    it.each([404, 403, 429, 409, 500])('handles HTTP %i', async (status) => { await expect(loadRepository('a/b', vi.fn().mockResolvedValue(reply({}, status)))).rejects.toThrow(); });
    it('rejects truncated trees', async () => { await expect(loadRepository('a/b', vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ tree: [], truncated: true })))).rejects.toThrow('incomplete'); });
    it('reports empty trees', async () => { await expect(loadRepository('a/b', vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ tree: [] })))).rejects.toThrow('no files'); });
    it('reports network failure', async () => { await expect(loadRepository('a/b', vi.fn().mockRejectedValue(new Error('network')))).rejects.toThrow('reached'); });
});
