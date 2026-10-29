'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ancestorDirectories, parentDirectory, ExplorerItem, RepositoryIndex, treeRows } from '@/lib/explorer';
import { palette } from '@/lib/model';
const ROW = 30;
const itemKey = (item: ExplorerItem) => item.kind + ':' + item.path;
const itemId = (item: ExplorerItem) => 'tree-' + encodeURIComponent(itemKey(item));
export default function FileTree({ index, selected, revision, onSelect }: {
    index: RepositoryIndex;
    selected: ExplorerItem;
    revision: number;
    onSelect: (item: ExplorerItem) => void;
}) {
    const selectionKey = itemKey(selected) + ':' + revision;
    const [expansion, setExpansion] = useState({ key: '', paths: new Set(['/']) });
    const reveal = expansion.key !== selectionKey;
    const ancestorPath = selected.kind === 'file' ? parentDirectory(selected.path) : selected.path;
    const expanded = useMemo(() => {
        if (!reveal)
            return expansion.paths;
        const ancestors = ancestorDirectories({ kind: 'directory', path: ancestorPath });
        return ancestors.every(path => expansion.paths.has(path)) ? expansion.paths : new Set([...expansion.paths, ...ancestors]);
    }, [expansion.paths, reveal, ancestorPath]);
    const rows = useMemo(() => treeRows(index, expanded), [index, expanded]);
    const [active, setActive] = useState({ selectionKey: '', item: itemKey(selected) });
    const activeKey = active.selectionKey === selectionKey ? active.item : itemKey(selected);
    const positions = useMemo(() => new Map(rows.map((row, i) => [itemKey(row), i])), [rows]);
    const activeIndex = positions.get(activeKey) ?? 0;
    const [scroll, setScroll] = useState(0), [height, setHeight] = useState(500);
    const viewport = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const element = viewport.current;
        if (!element)
            return;
        const observer = new ResizeObserver(() => setHeight(element.clientHeight));
        observer.observe(element);
        element.focus();
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const element = viewport.current;
        if (!element)
            return;
        const i = positions.get(itemKey(selected)) ?? -1;
        if (i < 0)
            return;
        const top = i * ROW;
        if (top < element.scrollTop || top + ROW > element.scrollTop + element.clientHeight)
            element.scrollTop = Math.max(0, top - element.clientHeight / 2);
    }, [positions, selected, revision]);
    function focusRow(position: number) {
        const row = rows[Math.max(0, Math.min(rows.length - 1, position))];
        setActive({ selectionKey, item: itemKey(row) });
        const element = viewport.current;
        if (element) {
            const top = (positions.get(itemKey(row)) ?? 0) * ROW;
            if (top < element.scrollTop)
                element.scrollTop = top;
            else if (top + ROW > element.scrollTop + element.clientHeight)
                element.scrollTop = top + ROW - element.clientHeight;
        }
    }
    function toggle(path: string) {
        const next = new Set(expanded);
        if (next.has(path))
            next.delete(path);
        else
            next.add(path);
        setExpansion({ key: selectionKey, paths: next });
    }
    const start = Math.max(0, Math.min(rows.length - 1, Math.floor(scroll / ROW) - 8)), end = Math.min(rows.length, start + Math.ceil(height / ROW) + 16);
    return <section className="tree-panel" aria-label="Repository files">
  <div className="panel-heading"><h2>Files</h2><button className="icon-button" aria-label="Collapse all folders" title="Collapse all folders" onClick={() => { setExpansion({ key: selectionKey, paths: new Set(['/']) }); focusRow(0); }}>⊟</button></div>
  <div className="tree-viewport" role="tree" aria-label="Repository file tree" tabIndex={0} aria-activedescendant={activeIndex >= start && activeIndex < end ? itemId(rows[activeIndex]) : undefined} ref={viewport} onScroll={event => setScroll(event.currentTarget.scrollTop)} onKeyDown={event => {
            const row = rows[activeIndex];
            if (!row)
                return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                focusRow(activeIndex + 1);
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                focusRow(activeIndex - 1);
            }
            if (event.key === 'Home') {
                event.preventDefault();
                focusRow(0);
            }
            if (event.key === 'End') {
                event.preventDefault();
                focusRow(rows.length - 1);
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                if (row.kind === 'directory') {
                    if (!expanded.has(row.path))
                        toggle(row.path);
                    else if (rows[activeIndex + 1]?.level > row.level)
                        focusRow(activeIndex + 1);
                }
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                if (row.kind === 'directory' && expanded.has(row.path))
                    toggle(row.path);
                else {
                    let i = activeIndex - 1;
                    while (i >= 0 && rows[i].level >= row.level)
                        i--;
                    if (i >= 0)
                        focusRow(i);
                }
            }
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(row);
            }
        }}>
   <div className="tree-spacer" style={{ height: rows.length * ROW }}>{rows.slice(start, end).map((row, offset) => {
            const file = row.kind === 'file' ? index.files.get(row.path) : null;
            const name = row.path === '/' ? 'Repository' : row.path.split('/').pop();
            return <div key={itemKey(row)} id={itemId(row)} role="treeitem" aria-level={row.level} aria-posinset={row.position} aria-setsize={row.total} aria-expanded={row.kind === 'directory' ? expanded.has(row.path) : undefined} aria-selected={itemKey(row) === itemKey(selected)} className={'tree-row' + (start + offset === activeIndex ? ' tree-active' : '')} style={{ top: (start + offset) * ROW, paddingLeft: 10 + (row.level - 1) * 16 }} title={row.path} onClick={() => { setActive({ selectionKey, item: itemKey(row) }); onSelect(row); viewport.current?.focus(); }}>
     {row.kind === 'directory' ? <button tabIndex={-1} className="tree-chevron" aria-label={(expanded.has(row.path) ? 'Collapse ' : 'Expand ') + row.path} onClick={event => { event.stopPropagation(); toggle(row.path); viewport.current?.focus(); }}>{expanded.has(row.path) ? '⌄' : '›'}</button> : <span className="tree-chevron"/>}
     <span className={'tree-symbol ' + row.kind} style={file ? { color: palette[file.language] } : undefined}>{row.kind === 'directory' ? '▱' : '▪'}</span><span className="tree-name">{name}</span>
     {row.kind === 'directory' && <small>{index.directories.get(row.path)!.fileCount.toLocaleString()}</small>}
    </div>;
        })}</div>
  </div>
  <div className="panel-footnote">↑↓ navigate · ←→ expand · Enter select</div>
 </section>;
}
