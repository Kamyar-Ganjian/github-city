import { FileNode } from './model';
export const FILE_PAGE_SIZE = 1000;
export const DIRECTORY_PAGE_SIZE = 500;
export const DETAIL_LIMIT = 2000;
export const comparePaths = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export const parentDirectory = (path: string) => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '/';
export const isWithin = (path: string, directory: string) => directory === '/' || path === directory || path.startsWith(directory + '/');
export const aggregateHeight = (count: number) => Math.min(22, 2.5 + Math.log2(1 + Math.max(0, count)) * 1.1);
export interface DirectoryInfo {
    path: string;
    name: string;
    parent: string | null;
    depth: number;
    directories: string[];
    files: string[];
    fileCount: number;
    directoryCount: number;
    bytes: number;
    unknownSizes: number;
    languages: Record<string, number>;
}
export interface RepositoryIndex {
    files: Map<string, FileNode>;
    directories: Map<string, DirectoryInfo>;
    largestFiles: string[];
    largestDirectories: string[];
    notableFiles: string[];
    maxDepth: number;
}
export type ExplorerItem = {
    kind: 'file' | 'directory';
    path: string;
};
export function commonProjectFile(name: string) {
    return /^(readme(\..+)?|package.json|dockerfile|go.mod|cargo.toml|pyproject.toml|tsconfig(\..+)?\.json|next.config\..+|main\.(ts|js|py|go|rs)|index\.(ts|js))$/i.test(name);
}
/** Aggregate once, bottom-up, instead of scanning descendants on selection. */
export function indexRepository(files: FileNode[]): RepositoryIndex {
    const directories = new Map<string, DirectoryInfo>(), byPath = new Map<string, FileNode>();
    function ensure(path: string): DirectoryInfo {
        const existing = directories.get(path);
        if (existing)
            return existing;
        const parent = path === '/' ? null : parentDirectory(path);
        const node: DirectoryInfo = { path, name: path === '/' ? 'Repository' : path.split('/').pop()!, parent, depth: path === '/' ? 0 : path.split('/').length, directories: [], files: [], fileCount: 0, directoryCount: 0, bytes: 0, unknownSizes: 0, languages: {} };
        directories.set(path, node);
        if (parent !== null)
            ensure(parent).directories.push(path);
        return node;
    }
    ensure('/');
    const largestFiles: string[] = [], notableFiles: string[] = [];
    for (const file of files) {
        if (byPath.has(file.path))
            throw new Error('Duplicate file path: ' + file.path);
        byPath.set(file.path, file);
        const directory = ensure(file.directory);
        directory.files.push(file.path);
        directory.fileCount++;
        directory.bytes += file.size;
        directory.unknownSizes += file.sizeKnown === false ? 1 : 0;
        directory.languages[file.language] = (directory.languages[file.language] ?? 0) + 1;
        if (file.sizeKnown !== false)
            largestFiles.push(file.path);
        largestFiles.sort((a, b) => byPath.get(b)!.size - byPath.get(a)!.size || comparePaths(a, b));
        if (largestFiles.length > 8)
            largestFiles.pop();
        if (commonProjectFile(file.name)) {
            notableFiles.push(file.path);
            notableFiles.sort((a, b) => a.split('/').length - b.split('/').length || comparePaths(a, b));
            if (notableFiles.length > 12)
                notableFiles.pop();
        }
    }
    const ordered = [...directories.values()].sort((a, b) => b.depth - a.depth || comparePaths(a.path, b.path));
    for (const node of ordered) {
        node.directories.sort(comparePaths);
        node.files.sort(comparePaths);
        if (node.parent !== null) {
            const parent = directories.get(node.parent)!;
            parent.fileCount += node.fileCount;
            parent.bytes += node.bytes;
            parent.directoryCount += node.directoryCount + 1;
            parent.unknownSizes += node.unknownSizes;
            for (const [language, count] of Object.entries(node.languages))
                parent.languages[language] = (parent.languages[language] ?? 0) + count;
        }
    }
    const largestDirectories: string[] = [];
    for (const directory of directories.values()) {
        if (directory.path === '/')
            continue;
        largestDirectories.push(directory.path);
        largestDirectories.sort((a, b) => directories.get(b)!.fileCount - directories.get(a)!.fileCount || comparePaths(a, b));
        if (largestDirectories.length > 8)
            largestDirectories.pop();
    }
    return { files: byPath, directories, largestFiles, largestDirectories, notableFiles, maxDepth: ordered[0]?.depth ?? 0 };
}
export function searchRepository(index: RepositoryIndex, query: string, limit = 60): ExplorerItem[] {
    const q = query.trim().toLowerCase();
    if (!q || limit <= 0)
        return [];
    const results: ExplorerItem[] = [];
    for (const path of index.directories.keys()) {
        if (path !== '/' && path.toLowerCase().includes(q))
            results.push({ kind: 'directory', path });
        if (results.length >= Math.min(20, limit))
            break;
    }
    for (const path of index.files.keys()) {
        if (results.length >= limit)
            break;
        if (path.toLowerCase().includes(q))
            results.push({ kind: 'file', path });
    }
    return results;
}
export interface TreeRow extends ExplorerItem {
    level: number;
    position: number;
    total: number;
}
export function treeRows(index: RepositoryIndex, expanded: ReadonlySet<string>): TreeRow[] {
    const rows: TreeRow[] = [], stack: TreeRow[] = [{ kind: 'directory', path: '/', level: 1, position: 1, total: 1 }];
    while (stack.length) {
        const row = stack.pop()!;
        rows.push(row);
        if (row.kind === 'directory' && expanded.has(row.path)) {
            const d = index.directories.get(row.path)!;
            for (let i = d.files.length - 1; i >= 0; i--)
                stack.push({ kind: 'file', path: d.files[i], level: row.level + 1, position: d.directories.length + i + 1, total: d.files.length + d.directories.length });
            for (let i = d.directories.length - 1; i >= 0; i--)
                stack.push({ kind: 'directory', path: d.directories[i], level: row.level + 1, position: i + 1, total: d.files.length + d.directories.length });
        }
    }
    return rows;
}
export function ancestorDirectories(item: ExplorerItem) {
    let path = item.kind === 'file' ? parentDirectory(item.path) : item.path;
    const result: string[] = [];
    while (path !== '/') {
        result.push(path);
        path = parentDirectory(path);
    }
    return ['/', ...result.reverse()];
}
export function formatBytes(size: number) {
    if (size < 1024)
        return size.toLocaleString() + ' B';
    if (size < 1024 ** 2)
        return (size / 1024).toFixed(1) + ' KiB';
    if (size < 1024 ** 3)
        return (size / 1024 ** 2).toFixed(1) + ' MiB';
    return (size / 1024 ** 3).toFixed(2) + ' GiB';
}
