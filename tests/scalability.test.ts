import { describe, it, expect, vi } from 'vitest';
import { loadRepository } from '../lib/github';
import { normalize } from '../lib/model';
import { indexRepository } from '../lib/explorer';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { initialNavigation, navigate } from '../lib/navigation';
const meta = { owner: { login: 'a' }, name: 'b', default_branch: 'main', stargazers_count: 0 };
const reply = (value: unknown) => new Response(JSON.stringify(value));
describe('large tree retrieval', () => {
    it('recovers truncated trees, deduplicates SHA requests and preserves both paths', async () => {
        const fetcher = vi.fn(async (url: string | URL | Request) => { const path = String(url); if (path.endsWith('/a/b'))
            return reply(meta); if (path.includes('?recursive'))
            return reply({ sha: 'root', truncated: true, tree: [{ path: 'omitted.ts', type: 'blob' }] }); if (path.endsWith('/root'))
            return reply({ tree: [{ path: 'src', type: 'tree', sha: 'shared' }, { path: 'copy', type: 'tree', sha: 'shared' }] }); if (path.endsWith('/shared'))
            return reply({ tree: [{ path: 'index.ts', type: 'blob', size: 100 }] }); throw new Error('Unexpected URL'); });
        const repo = await loadRepository('a/b', fetcher);
        expect(repo.files.map(f => f.path)).toEqual(['copy/index.ts', 'src/index.ts']);
        expect(fetcher).toHaveBeenCalledTimes(4);
    });
    it('does not reject 25,000 files', async () => { const fetcher = vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ tree: Array.from({ length: 25000 }, (_, i) => ({ path: 'file' + i + '.ts', type: 'blob', size: 10 })), truncated: false })); expect((await loadRepository('a/b', fetcher)).files).toHaveLength(25000); });
    it('rejects truncation in an individual directory', async () => { const fetcher = vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ sha: 'root', truncated: true, tree: [] })).mockResolvedValueOnce(reply({ truncated: true, tree: [] })); await expect(loadRepository('a/b', fetcher)).rejects.toThrow('individual directory'); });
    it('reports submodules explicitly without treating them as files', async () => { const fetcher = vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({ tree: [{ path: 'lib', type: 'commit' }, { path: 'main.ts', type: 'blob', size: 10 }] })); const repo = await loadRepository('a/b', fetcher); expect(repo.submodules).toEqual(['lib']); expect(repo.files).toHaveLength(1); });
});
describe('large repository exploration', () => {
    const files = normalize(Array.from({ length: 25000 }, (_, i) => ({ path: 'src/d' + i % 25 + '/f' + i + '.ts', type: 'blob', size: i })));
    const prepared = prepareRepository(files);
    it('uses aggregates and exact directory counts', () => { const overview = mapView(prepared, initialNavigation); expect(overview.aggregates).toHaveLength(1); expect(overview.representedFiles).toBe(25000); expect(mapView(prepared, navigate(initialNavigation, { type: 'directory', path: 'src/d0' })).buildings).toHaveLength(1000); });
    it('counts each ancestor once', () => { const index = indexRepository(files); expect(index.directories.get('/')!.fileCount).toBe(25000); expect(index.directories.get('src')!.fileCount).toBe(25000); expect(index.directories.get('src/d0')!.fileCount).toBe(1000); });
    it('paginates flat directories without missing or duplicated files', () => { const flat = prepareRepository(normalize(Array.from({ length: 4001 }, (_, i) => ({ path: 'f' + i + '.ts', size: i, type: 'blob' })))); const pages = Array.from({ length: 5 }, (_, filePage) => mapView(flat, { ...initialNavigation, filePage })); expect(pages[0].filePages).toBe(5); expect(new Set(pages.flatMap(p => p.buildings.map(b => b.file.id))).size).toBe(4001); });
    it('respects full directory segments', () => expect(prepared.index.directories.get('src/d1')!.fileCount).toBe(1000));
});
describe('public data boundary', () => { it('never serves private metadata through a configured token', async () => { const fetcher = vi.fn().mockResolvedValue(reply({ ...meta, private: true })); await expect(loadRepository('a/b', fetcher)).rejects.toThrow('Only public'); expect(fetcher).toHaveBeenCalledTimes(1); }); });
