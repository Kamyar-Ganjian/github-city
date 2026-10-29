'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExplorerItem, RepositoryIndex, searchRepository } from '@/lib/explorer';
export default function Search({ index, onSelect }: {
    index: RepositoryIndex;
    onSelect: (item: ExplorerItem) => void;
}) {
    const [query, setQuery] = useState(''), [active, setActive] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => { const outside = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target))
        setQuery(''); }; document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside); }, []);
    const results = useMemo(() => searchRepository(index, query), [index, query]);
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
            if (((event.ctrlKey || event.metaKey) && event.key === 'k') || (!typing && event.key === '/')) {
                event.preventDefault();
                input.current?.focus();
            }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    useEffect(() => {
        if (query)
            document.getElementById('search-result-' + active)?.scrollIntoView({ block: 'nearest' });
    }, [active, query]);
    function choose(item: ExplorerItem) { onSelect(item); setQuery(''); }
    return <div ref={container} className="search-box"><span aria-hidden="true">⌕</span><input ref={input} aria-label="Search files and folders" placeholder="Search files and folders…" role="combobox" aria-autocomplete="list" aria-expanded={!!query} aria-controls={query ? 'search-results' : undefined} aria-activedescendant={query && results[active] ? 'search-result-' + active : undefined} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => {
            if (event.key === 'Escape')
                setQuery('');
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive(a => Math.min(a + 1, Math.max(0, results.length - 1)));
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(a => Math.max(a - 1, 0));
            }
            if (event.key === 'Enter' && results[active]) {
                event.preventDefault();
                choose(results[active]);
            }
        }}/><kbd>⌘ K</kbd>{query && <div className="search-results" id="search-results" role="listbox" aria-label="Matching paths">{results.length ? results.map((item, i) => <button key={item.kind + item.path} id={'search-result-' + i} role="option" tabIndex={-1} aria-selected={i === active} onClick={() => choose(item)}><span className="result-type">{item.kind === 'file' ? 'File' : 'Folder'}</span><span>{item.path}</span></button>) : <p>No files or folders match “{query}”.</p>}<div className="search-note">Up to 60 paths · ↑↓ navigate · Enter open · Esc close<button onClick={() => setQuery('')} aria-label="Close search results">×</button></div></div>}</div>;
}
