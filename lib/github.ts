import { normalize, parseRepository, Repository } from './model';
export class GitHubError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
interface Entry {
    path: string;
    type: string;
    sha: string;
    size?: number;
}
interface Tree {
    sha: string;
    truncated: boolean;
    tree: Entry[];
}
export async function loadRepository(input: string, request: typeof fetch = fetch, signal?: AbortSignal): Promise<Repository> {
    const { owner, name } = parseRepository(input);
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (process.env.GITHUB_TOKEN)
        headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const operation = new AbortController();
    const deadline = AbortSignal.timeout(120000);
    const combined = AbortSignal.any([operation.signal, deadline, ...(signal ? [signal] : [])]);
    let requests = 0;
    async function get<T>(path: string): Promise<T> {
        for (let attempt = 0; attempt < 3; attempt++) {
            if (combined.aborted)
                throw new GitHubError('Repository retrieval was cancelled or timed out.', 408);
            if (++requests > 1500)
                throw new GitHubError('Tree traversal reached its 1,500-request budget. No partial repository was returned. Retry with a server token or a smaller tree.', 422);
            let response: Response;
            try {
                response = await request('https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name) + path, { headers, signal: AbortSignal.any([combined, AbortSignal.timeout(25000)]) });
            }
            catch {
                throw new GitHubError(combined.aborted ? 'Repository retrieval was cancelled or exceeded its two-minute time budget. No partial city was generated.' : 'GitHub could not be reached, or a request timed out. Please retry.', 502);
            }
            if (response.ok) {
                try {
                    return await response.json();
                }
                catch {
                    throw new GitHubError('GitHub returned malformed JSON. Please retry.', 502);
                }
            }
            if (response.status >= 500 && attempt < 2) {
                await new Promise(r => setTimeout(r, 250 * 2 ** attempt));
                continue;
            }
            if (response.status === 404)
                throw new GitHubError('Repository not found. Check the spelling and make sure it is public.', 404);
            if (response.status === 403 || response.status === 429) {
                const rawReset = Number(response.headers.get('x-ratelimit-reset'));
                const reset = Number.isFinite(rawReset) && rawReset > 0 && rawReset < 8.64e12 ? rawReset : null;
                throw new GitHubError('GitHub request limit or access restriction reached.' + (reset ? ' Rate limit resets at ' + new Date(reset * 1000).toISOString() + '.' : '') + ' Retry later or configure a server-side GITHUB_TOKEN.', 429);
            }
            if (response.status === 409)
                throw new GitHubError('This repository is empty. Try a repository containing files.');
            throw new GitHubError('GitHub is temporarily unavailable. Please retry.', 502);
        }
        throw new GitHubError('GitHub retries exhausted.', 502);
    }
    try {
        const metadata = await get<{
            owner: {
                login: string;
            };
            name: string;
            default_branch: string;
            description: string;
            stargazers_count: number;
            private?: boolean;
        }>('');
        if (!metadata || typeof metadata.name !== 'string' || typeof metadata.owner?.login !== 'string' || typeof metadata.default_branch !== 'string' || !metadata.default_branch)
            throw new GitHubError('GitHub returned malformed repository metadata.', 502);
        if (metadata.private)
            throw new GitHubError('Only public repositories can be explored.', 404);
        const initial = await get<Tree>('/git/trees/' + encodeURIComponent(metadata.default_branch) + '?recursive=1');
        const valid = (tree: Tree) => { if (!tree || !Array.isArray(tree.tree) || tree.tree.some(entry => !entry || typeof entry.path !== 'string' || !['blob', 'tree', 'commit'].includes(entry.type) || (entry.type === 'tree' && (typeof entry.sha !== 'string' || !entry.sha))))
            throw new GitHubError('GitHub returned an incomplete or malformed tree.', 502); };
        valid(initial);
        let entries: Entry[] = initial.tree;
        if (initial.truncated) {
            if (!initial.sha)
                throw new GitHubError('GitHub returned an incomplete tree without a root identifier.', 502);
            entries = [];
            const queue = [{ sha: initial.sha, prefix: '' }];
            const cache = new Map<string, Promise<Tree>>();
            const fetchTree = (sha: string) => { let promise = cache.get(sha); if (!promise) {
                promise = get<Tree>('/git/trees/' + encodeURIComponent(sha));
                cache.set(sha, promise);
            } return promise; };
            let cursor = 0;
            while (cursor < queue.length) {
                const batch = queue.slice(cursor, cursor + 4);
                cursor += batch.length;
                const trees = await Promise.all(batch.map(task => fetchTree(task.sha)));
                for (let i = 0; i < trees.length; i++) {
                    const tree = trees[i];
                    valid(tree);
                    if (tree.truncated)
                        throw new GitHubError('GitHub truncated an individual directory. Its complete tree is unavailable; no partial city was generated.', 422);
                    for (const entry of tree.tree) {
                        const path = batch[i].prefix + entry.path;
                        if (entry.type === 'tree')
                            queue.push({ sha: entry.sha, prefix: path + '/' });
                        else
                            entries.push({ ...entry, path });
                    }
                }
            }
        }
        const submodules = entries.filter(e => e.type === 'commit').map(e => e.path);
        let files: ReturnType<typeof normalize>;
        try {
            files = normalize(entries);
        }
        catch {
            throw new GitHubError('GitHub returned malformed or duplicate file entries; no partial repository was returned.', 502);
        }
        if (!files.length)
            throw new GitHubError('This repository has no files to visualize.');
        return { owner: metadata.owner.login, name: metadata.name, branch: metadata.default_branch, description: metadata.description ?? '', stars: metadata.stargazers_count, files, submodules };
    }
    finally {
        operation.abort();
    }
}
