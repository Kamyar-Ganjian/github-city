export interface FileNode {
    id: string;
    path: string;
    name: string;
    directory: string;
    extension: string;
    language: string;
    size: number;
    sizeKnown?: boolean;
}
export interface Repository {
    owner: string;
    name: string;
    branch: string;
    description: string;
    stars: number;
    files: FileNode[];
    submodules?: string[];
}
export const palette: Record<string, string> = { TypeScript: '#5a91c9', JavaScript: '#c6a04c', Python: '#5e9b79', Rust: '#c17f65', Go: '#54a6ae', CSS: '#977bb7', HTML: '#d18564', JSON: '#8b9d70', Markdown: '#8796aa', Vue: '#70a88d', YAML: '#a89271', Shell: '#8ca779', Java: '#b98c77', 'C++': '#8994ba', C: '#809bb2', Ruby: '#be7f87', Swift: '#c68f65', Other: '#777f89' };
export function parseRepository(input: string): {
    owner: string;
    name: string;
} {
    let value = input.trim().replace(/\/$/, '');
    if (value.startsWith('https://')) {
        let url: URL;
        try {
            url = new URL(value);
        }
        catch {
            throw new Error('Enter a GitHub HTTPS URL or owner/repository.');
        }
        if (url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash)
            throw new Error('Use a public github.com repository URL.');
        value = url.pathname.slice(1);
    }
    const parts = value.split('/'), owner = parts[0] ?? '', name = (parts[1] ?? '').replace(/\.git$/, '');
    if (parts.length !== 2 || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner) || !name || name === '.' || name === '..' || !/^[\w.-]+$/.test(name))
        throw new Error('Enter a GitHub HTTPS URL or owner/repository.');
    return { owner, name };
}
export function language(path: string) { const ext = path.split('.').pop()?.toLowerCase() ?? ''; return ({ ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', py: 'Python', rs: 'Rust', go: 'Go', css: 'CSS', scss: 'CSS', html: 'HTML', vue: 'Vue', json: 'JSON', md: 'Markdown', mdx: 'Markdown', yaml: 'YAML', yml: 'YAML', sh: 'Shell', bash: 'Shell', java: 'Java', cpp: 'C++', cc: 'C++', cxx: 'C++', c: 'C', rb: 'Ruby', swift: 'Swift' } as Record<string, string>)[ext] ?? 'Other'; }
export function normalize(tree: unknown): FileNode[] {
    if (!Array.isArray(tree))
        throw new Error('GitHub returned a malformed tree.');
    const seen = new Set<string>(), files: FileNode[] = [];
    for (const entry of tree) {
        if (!entry || typeof entry.path !== 'string' || !entry.path || entry.path.split('/').some((p: string) => !p || p === '.' || p === '..') || !['blob', 'tree', 'commit'].includes(entry.type))
            throw new Error('GitHub returned a malformed tree entry.');
        if (seen.has(entry.path))
            throw new Error('GitHub returned duplicate paths.');
        seen.add(entry.path);
        if (entry.type !== 'blob')
            continue;
        if (entry.size !== undefined && (!Number.isFinite(entry.size) || entry.size < 0))
            throw new Error('GitHub returned an invalid file size.');
        const name = entry.path.split('/').pop()!;
        files.push({ id: entry.path, path: entry.path, name, directory: entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '/', extension: name.includes('.') ? name.split('.').pop()! : '', language: language(entry.path), size: entry.size ?? 0, sizeKnown: entry.size !== undefined });
    }
    return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
export const height = (size: number) => Math.min(12, Math.max(.85, Math.log2(1 + Math.max(0, size) / 256) * 1.25));
export const fileUrl = (repo: Repository, file: FileNode) => 'https://github.com/' + repo.owner + '/' + repo.name + '/blob/' + repo.branch.split('/').map(encodeURIComponent).join('/') + '/' + file.path.split('/').map(encodeURIComponent).join('/');
