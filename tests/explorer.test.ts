import { describe, it, expect, vi } from 'vitest';
import { normalize, parseRepository } from '../lib/model';
import { aggregateHeight, ancestorDirectories, indexRepository, searchRepository, treeRows } from '../lib/explorer';
import { prepareRepository } from '../lib/prepare';
import { initialNavigation, navigate } from '../lib/navigation';
import { mapView } from '../lib/map-view';
import { loadRepository } from '../lib/github';
const files = normalize([{ path: 'README.md', type: 'blob', size: 50 }, { path: 'package.json', type: 'blob', size: 40 }, { path: 'src/main.ts', type: 'blob', size: 100 }, { path: 'src/nested/main.ts', type: 'blob', size: 200 }, { path: 'docs/unknown.md', type: 'blob' }]);
describe('repository index', () => {
    it('aggregates files, nested directories, languages, known sizes and unknown-size counts', () => {
        const index = indexRepository(files), root = index.directories.get('/')!, src = index.directories.get('src')!;
        expect(root).toMatchObject({ fileCount: 5, directoryCount: 3, bytes: 390, unknownSizes: 1, depth: 0 });
        expect(src).toMatchObject({ fileCount: 2, directoryCount: 1, bytes: 300, depth: 1 });
        expect(root.languages).toEqual({ Markdown: 2, JSON: 1, TypeScript: 2 });
        expect(index.maxDepth).toBe(2);
    });
    it('computes deterministic top files and excludes unknown sizes from the ranking', () => { const a = indexRepository(files), b = indexRepository([...files].reverse()); expect(a.largestFiles).toEqual(b.largestFiles); expect(a.largestFiles[0]).toBe('src/nested/main.ts'); expect(a.largestFiles).not.toContain('docs/unknown.md'); expect(a.notableFiles).toContain('package.json'); });
    it('does not count src2 as a descendant of src', () => { const index = indexRepository(normalize([{ path: 'src/a.ts', type: 'blob', size: 1 }, { path: 'src2/b.ts', type: 'blob', size: 2 }])); expect(index.directories.get('src')!.fileCount).toBe(1); });
    it('handles empty input and rejects duplicates', () => { expect(indexRepository([]).directories.get('/')!.fileCount).toBe(0); expect(() => indexRepository([...files, files[0]])).toThrow('Duplicate'); });
    it('searches directories and distinguishes duplicate filenames', () => { const index = indexRepository(files); expect(searchRepository(index, 'MAIN.TS').map(r => r.path)).toEqual(['src/main.ts', 'src/nested/main.ts']); expect(searchRepository(index, 'nested')).toContainEqual({ kind: 'directory', path: 'src/nested' }); expect(searchRepository(index, '')).toEqual([]); expect(searchRepository(index, 'src', 0)).toEqual([]); });
    it('flattens only expanded directories, with correct virtual-tree ARIA positions', () => { const index = indexRepository(files), collapsed = treeRows(index, new Set(['/'])); expect(collapsed.some(r => r.path === 'src/main.ts')).toBe(false); const rows = treeRows(index, new Set(['/', 'src'])); expect(rows.some(r => r.path === 'src/main.ts')).toBe(true); expect(rows.some(r => r.path === 'src/nested/main.ts')).toBe(false); expect(rows.find(r => r.path === 'src/main.ts')).toMatchObject({ level: 3, position: 2, total: 2 }); expect(ancestorDirectories({ kind: 'file', path: 'src/nested/main.ts' })).toEqual(['/', 'src', 'src/nested']); });
});
describe('navigation', () => {
    it('inspects files without moving the camera when clicked in the map', () => { const state = navigate(initialNavigation, { type: 'file', path: 'src/main.ts', directory: 'src', page: 0, focus: false }); expect(state.selection).toEqual({ kind: 'file', path: 'src/main.ts' }); expect(state.focus).toEqual(initialNavigation.focus); expect(state.cameraRevision).toBe(0); });
    it('focuses search results, opens the correct folder and file page, and resets reliably', () => { const state = navigate(navigate(initialNavigation, { type: 'whole' }), { type: 'file', path: 'src/main.ts', directory: 'src', page: 4, focus: true }); expect(state).toMatchObject({ mode: 'directory', directory: 'src', filePage: 4, selection: { kind: 'file', path: 'src/main.ts' }, focus: { kind: 'file', path: 'src/main.ts' } }); const reset = navigate(state, { type: 'reset' }); expect(reset.cameraRevision).toBe(state.cameraRevision + 1); expect(reset.focus).toEqual({ kind: 'directory', path: 'src' }); });
    it('returns to parent scopes without retaining stale pagination', () => { const state = navigate({ ...initialNavigation, filePage: 9, directoryPage: 2 }, { type: 'directory', path: 'src' }); expect(state).toMatchObject({ directory: 'src', filePage: 0, directoryPage: 0 }); });
});
describe('map accounting', () => {
    it('shows every small-repository file and no parent aggregates', () => { const view = mapView(prepareRepository(files), initialNavigation); expect(view.buildings).toHaveLength(5); expect(view.aggregates).toHaveLength(0); expect(view.representedFiles).toBe(5); });
    it('uses a monotonic bounded count scale', () => { expect(aggregateHeight(10)).toBeLessThan(aggregateHeight(100)); expect(aggregateHeight(1e20)).toBeLessThanOrEqual(28); });
    it('discloses and pages directories when there are more than 500 children', () => { const prepared = prepareRepository(normalize(Array.from({ length: 2505 }, (_, i) => ({ path: 'd' + i + '/f.ts', type: 'blob', size: 1 })))); const first = mapView(prepared, initialNavigation); expect(first.directoryPages).toBe(6); expect(first.aggregates.length).toBe(500); const pages = Array.from({ length: 6 }, (_, directoryPage) => mapView(prepared, { ...initialNavigation, directoryPage })); expect(pages.reduce((sum, page) => sum + page.representedFiles, 0)).toBe(2505); });
    it('shows searched files in large flat directories on the correct page', () => { const prepared = prepareRepository(normalize(Array.from({ length: 10001 }, (_, i) => ({ path: 'src/f' + String(i).padStart(5, '0') + '.ts', type: 'blob', size: i })))); const state = navigate(initialNavigation, { type: 'file', path: 'src/f10000.ts', directory: 'src', page: 10, focus: true }); expect(mapView(prepared, state).buildings.map(b => b.file.path)).toContain('src/f10000.ts'); });
});
describe('validation and GitHub failure boundaries', () => {
    it.each(['a/.git', 'https://user:password@github.com/a/b', 'https://github.com:1234/a/b', 'https://github.com/a/b#readme', 'http://github.com/a/b'])('rejects unsupported repository input %s', input => expect(() => parseRepository(input)).toThrow());
    it('rejects duplicate and malformed tree entries instead of silently losing files', () => { expect(() => normalize([{ path: 'a', type: 'blob' }, { path: 'a', type: 'blob' }])).toThrow(); expect(() => normalize([{ path: 'a/../b', type: 'blob' }])).toThrow(); expect(() => normalize([{ type: 'blob' }])).toThrow(); expect(() => normalize([{ path: 'a', type: 'blob', size: -1 }])).toThrow(); });
    it('preserves explicit missing-size information', () => expect(normalize([{ path: 'a', type: 'blob' }])[0]).toMatchObject({ size: 0, sizeKnown: false }));
    it('stops before issuing a request if cancelled', async () => { const controller = new AbortController(); controller.abort(); const request = vi.fn(); await expect(loadRepository('a/b', request, controller.signal)).rejects.toThrow('cancelled'); expect(request).not.toHaveBeenCalled(); });
    it('reports upstream malformed JSON as an upstream failure', async () => { const request = vi.fn().mockResolvedValue(new Response('not json')); await expect(loadRepository('a/b', request)).rejects.toMatchObject({ status: 502 }); });
});
describe('practical framing', () => {
    it('frames the visible aggregate rather than an empty underlying district', () => { const prepared = prepareRepository(normalize(Array.from({ length: 10000 }, (_, i) => ({ path: 'src/f' + i + '.ts', type: 'blob', size: i })))); const view = mapView(prepared, initialNavigation); expect(view.aggregates).toHaveLength(1); expect(view.bounds.width).toBeLessThanOrEqual(18); expect(view.maxHeight).toBeGreaterThan(1); });
});
describe('overview usefulness', () => {
    it('ranks directory counts including nested entries with deterministic ties', () => {
        const index = indexRepository(files);
        expect(index.largestDirectories[0]).toBe('src');
        expect(index.largestDirectories).not.toContain('/');
        expect(index.largestDirectories).toEqual(indexRepository([...files].reverse()).largestDirectories);
    });
});
describe('tree completeness', () => {
    it('rejects a response with an unknown completeness flag', async () => {
        const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ owner: { login: 'a' }, name: 'b', default_branch: 'main' }))).mockResolvedValueOnce(new Response(JSON.stringify({ tree: [{ path: 'a.ts', type: 'blob', size: 10 }] })));
        await expect(loadRepository('a/b', request)).rejects.toMatchObject({ status: 502 });
    });
});
