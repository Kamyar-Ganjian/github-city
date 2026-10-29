'use client';
import Link from 'next/link';
import { useCallback, useReducer, useState } from 'react';
import { ExplorerItem, FILE_PAGE_SIZE, formatBytes } from '@/lib/explorer';
import { initialNavigation, navigate } from '@/lib/navigation';
import { LoadedRepository, useRepository } from '@/hooks/useRepository';
import ThemeToggle from '@/components/ThemeToggle';
import FileTree from '@/components/FileTree';
import Search from '@/components/Search';
import Inspector from '@/components/Inspector';
import MapPanel from '@/components/MapPanel';
function RepositoryForm({ initial = '', loading, onLoad, compact = false }: {
    initial?: string;
    loading: boolean;
    onLoad: (input: string) => void;
    compact?: boolean;
}) {
    const [input, setInput] = useState(initial);
    return <form className={compact ? 'repository-form compact' : 'repository-form'} onSubmit={event => { event.preventDefault(); onLoad(input); }}><label htmlFor={compact ? 'repository-switcher' : 'repository-input'} className="sr-only">GitHub repository URL or owner/repository</label><input id={compact ? 'repository-switcher' : 'repository-input'} value={input} onChange={event => setInput(event.target.value)} placeholder="https://github.com/owner/repository" autoComplete="off" required/><button className="primary-button" disabled={loading}>{loading ? 'Loading…' : compact ? 'Open' : 'Explore repository'}<span aria-hidden="true"> →</span></button></form>;
}
function Workspace({ loaded, onMessage }: {
    loaded: LoadedRepository;
    onMessage: (message: string) => void;
}) {
    const { repository, prepared } = loaded;
    const [navigation, dispatch] = useReducer(navigate, initialNavigation);
    const [treeOpen, setTreeOpen] = useState(true), [panel, setPanel] = useState('files');
    const root = prepared.index.directories.get('/')!;
    const onSelect = useCallback((item: ExplorerItem, focus = true) => {
        if (item.kind === 'directory') {
            dispatch({ type: 'directory', path: item.path });
            return;
        }
        const file = prepared.index.files.get(item.path);
        if (!file)
            return;
        const local = prepared.index.directories.get(file.directory)!;
        dispatch({ type: 'file', path: file.path, directory: file.directory, page: Math.floor(local.files.indexOf(file.path) / FILE_PAGE_SIZE), focus });
    }, [prepared]);
    const selected = navigation.selection.kind === 'group' ? { kind: 'directory' as const, path: navigation.selection.block.directory } : navigation.selection;
    const parts = navigation.directory === '/' ? [] : navigation.directory.split('/');
    async function share() { try {
        await navigator.clipboard.writeText(window.location.href);
        onMessage('Repository link copied.');
    }
    catch {
        onMessage('Copy the current page URL to share this repository.');
    } }
    return <div className="workspace-shell">
  <div className="workspace-bar"><div className="workspace-location"><button className="icon-button tree-toggle" aria-expanded={treeOpen} aria-label={treeOpen ? 'Hide file tree' : 'Show file tree'} onClick={() => setTreeOpen(v => !v)}>☷</button><nav className="breadcrumbs" aria-label="Repository path"><button onClick={() => onSelect({ kind: 'directory', path: '/' })}>{repository.owner} / <strong>{repository.name}</strong></button>{parts.map((part, i) => <span key={i}><span aria-hidden="true">/</span><button onClick={() => onSelect({ kind: 'directory', path: parts.slice(0, i + 1).join('/') })}>{part}</button></span>)}</nav></div><Search index={prepared.index} onSelect={onSelect}/><button className="share-button" onClick={() => void share()}>Share ↗</button></div>
  <div className="repository-stats"><span className="branch-badge">⑂ {repository.branch}</span><span>{root.fileCount.toLocaleString()} files</span><span>{root.directoryCount.toLocaleString()} directories</span><span title="Sum of available GitHub blob sizes">{formatBytes(root.bytes)} in file metadata</span><span title="Number of nested directories on the deepest path">Depth {prepared.index.maxDepth}</span>{repository.submodules?.length ? <span className="submodule-note">{repository.submodules.length} external submodules excluded</span> : null}</div>
  <div className="mobile-tabs" role="group" aria-label="Workspace panel">{['files', 'map', 'details'].map(name => <button key={name} aria-pressed={panel === name} onClick={() => setPanel(name)}>{name === 'files' ? 'Files' : name === 'map' ? 'Map' : 'Details'}</button>)}</div>
  <main className="workspace-layout" data-tree={treeOpen} data-panel={panel}>
   <FileTree index={prepared.index} selected={selected} revision={navigation.selectionRevision} onSelect={onSelect}/>
   <MapPanel prepared={prepared} navigation={navigation} title={repository.owner + '/' + repository.name} onSelect={onSelect} onGroup={block => dispatch({ type: 'group', block })} dispatch={dispatch} onMessage={onMessage}/>
   <Inspector repository={repository} index={prepared.index} selection={navigation.selection} onSelect={onSelect}/>
  </main>
 </div>;
}
export default function Home() {
    const { loaded, status, error, load, cancel, dismissError } = useRepository();
    const [message, setMessage] = useState('');
    const examples = [['facebook/react', 'React'], ['vercel/next.js', 'Next.js'], ['microsoft/TypeScript', 'TypeScript'], ['vuejs/core', 'Vue']];
    return <div className="app-shell"><header className="app-header"><Link href="/" className="brand"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M2 20V9h5v11M9 20V2h5v18M16 20V6h4v14" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>GitHub City</Link>{loaded && <RepositoryForm key={loaded.version} initial={loaded.repository.owner + '/' + loaded.repository.name} compact loading={!!status} onLoad={value => void load(value)}/>}<ThemeToggle /></header>
  {status && <div className="loading-bar" role="status"><span className="loading-dot"/>{status}<button onClick={cancel}>Cancel</button></div>}
  {error && <div className="error-banner" role="alert"><span><strong>Repository couldn’t be loaded.</strong> {error}</span><button onClick={dismissError} aria-label="Dismiss error">×</button></div>}
  {loaded ? <Workspace key={loaded.version} loaded={loaded} onMessage={setMessage}/> : <main className="landing">
   <div className="landing-grid" aria-hidden="true"/>
   <section className="landing-content"><span className="eyebrow">A different perspective on your codebase</span><h1>Understand the repository.<br /><span>Then start exploring.</span></h1><p>See how a project fits together. Browse its files, compare directories,<br className="desktop-break"/> and explore an architectural map of the code.</p>
    <RepositoryForm loading={!!status} onLoad={value => void load(value)}/><small className="landing-note">Public GitHub repositories · No account required</small>
    <div className="example-list"><span>Start with a familiar project</span>{examples.map(([value, name]) => <button key={value} disabled={!!status} onClick={() => void load(value)}>{name}<span aria-hidden="true">↗</span></button>)}</div>
   </section>
   <section className="product-principles" aria-label="What you can explore"><div><span>01</span><h2>Find your way around.</h2><p>A searchable file tree with the context you need. File sizes, languages, directory counts, and direct GitHub links.</p></div><div><span>02</span><h2>See the bigger picture.</h2><p>Files become buildings. Directories become districts. A simple map makes the structure and scale tangible.</p></div><div><span>03</span><h2>Go as deep as you need.</h2><p>Explore large repositories by directory or as a whole. Aggregated views stay explicit about what they represent.</p></div></section>
   <footer><span>GitHub City</span><span>Repository structure, made visible.</span></footer>
  </main>}
  <div className="sr-only" role="status">{loaded ? loaded.repository.owner + '/' + loaded.repository.name + ' loaded. ' + loaded.repository.files.length.toLocaleString() + ' files available.' : ''}</div>
  <div className={'announcement' + (message ? ' visible' : '')} role="status">{message}{message && <button onClick={() => setMessage('')} aria-label="Dismiss notification">×</button>}</div>
 </div>;
}
