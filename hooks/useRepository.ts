'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Repository } from '@/lib/model';
import { PreparedRepository } from '@/lib/prepare';
export interface LoadedRepository {
    version: number;
    repository: Repository;
    prepared: PreparedRepository;
}
export function useRepository() {
    const [loaded, setLoaded] = useState<LoadedRepository | null>(null), [status, setStatus] = useState(''), [error, setError] = useState('');
    const version = useRef(0);
    const active = useRef<AbortController | null>(null), worker = useRef<Worker | null>(null);
    const cancel = useCallback(() => { active.current?.abort(); worker.current?.terminate(); setStatus(''); }, []);
    const load = useCallback(async (input: string) => {
        active.current?.abort();
        worker.current?.terminate();
        const controller = new AbortController();
        active.current = controller;
        setError('');
        setStatus('Reading repository metadata and file tree…');
        try {
            const response = await fetch('/api/repository?q=' + encodeURIComponent(input), { signal: controller.signal });
            let repository: Repository & {
                error?: string;
            };
            try {
                repository = await response.json();
            }
            catch {
                throw new Error('The server returned an unreadable response. Please retry.');
            }
            if (!response.ok)
                throw new Error(repository.error ?? 'The repository could not be loaded.');
            if (!repository || !Array.isArray(repository.files) || typeof repository.owner !== 'string' || typeof repository.name !== 'string')
                throw new Error('The server returned incomplete repository data. Please retry.');
            controller.signal.throwIfAborted();
            setStatus('Indexing files and preparing the map…');
            const prepared = await new Promise<PreparedRepository>((resolve, reject) => {
                const current = new Worker(new URL('../lib/layout.worker.ts', import.meta.url));
                worker.current = current;
                const cleanup = () => {
                    current.terminate();
                    if (worker.current === current)
                        worker.current = null;
                    controller.signal.removeEventListener('abort', abort);
                };
                const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
                controller.signal.addEventListener('abort', abort, { once: true });
                current.onmessage = event => {
                    cleanup();
                    if (event.data.error)
                        reject(new Error(event.data.error));
                    else
                        resolve(event.data.prepared);
                };
                current.onerror = () => { cleanup(); reject(new Error('Your browser could not prepare this repository. Try a smaller repository or another browser.')); };
                current.postMessage(repository.files);
            });
            controller.signal.throwIfAborted();
            setLoaded({ version: ++version.current, repository, prepared });
            const url = new URL(window.location.href);
            url.searchParams.set('repo', repository.owner + '/' + repository.name);
            history.replaceState(null, '', url);
        }
        catch (cause) {
            if (!controller.signal.aborted)
                setError(cause instanceof Error ? cause.message : 'Unable to load this repository.');
        }
        finally {
            if (active.current === controller)
                setStatus('');
        }
    }, []);
    useEffect(() => {
        const input = new URLSearchParams(window.location.search).get('repo');
        const timer = setTimeout(() => {
            if (input)
                void load(input);
        }, 0);
        return () => { clearTimeout(timer); active.current?.abort(); worker.current?.terminate(); };
    }, [load]);
    return { loaded, status, error, load, cancel, dismissError: () => setError('') };
}
