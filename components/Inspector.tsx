'use client';
import { ExplorerItem, formatBytes, RepositoryIndex } from '@/lib/explorer';
import { fileUrl, palette, Repository } from '@/lib/model';
import { Selection } from '@/lib/navigation';
function directoryLink(repo: Repository, path: string) { return 'https://github.com/' + repo.owner + '/' + repo.name + (path === '/' ? '' : '/tree/' + repo.branch.split('/').map(encodeURIComponent).join('/') + '/' + path.split('/').map(encodeURIComponent).join('/')); }
export default function Inspector({ repository, index, selection, onSelect }: {
    repository: Repository;
    index: RepositoryIndex;
    selection: Selection;
    onSelect: (item: ExplorerItem) => void;
}) {
    if (selection.kind === 'group') {
        const block = selection.block;
        return <aside className="inspector-panel" aria-label="Selection details"><div className="panel-heading"><h2>Group details</h2><span className="badge">Aggregate</span></div><div className="inspector-content"><h3>Spatial file group</h3><p className="muted">A summary of neighboring files in the whole-repository map. This is a subset, not the entire directory.</p><dl><dt>Files represented</dt><dd>{block.count.toLocaleString()}</dd><dt>Known file sizes</dt><dd>{formatBytes(block.bytes)}</dd><dt>Dominant language</dt><dd>{block.language}</dd><dt>Common directory</dt><dd>{block.directory}</dd></dl><button className="primary-button" onClick={() => onSelect({ kind: 'directory', path: block.directory })}>Open directory →</button></div></aside>;
    }
    const file = selection.kind === 'file' ? index.files.get(selection.path) : null;
    const directory = selection.kind === 'directory' ? index.directories.get(selection.path) : null;
    if (!file && !directory)
        return <aside className="inspector-panel"><p>Select a file or folder.</p></aside>;
    const root = selection.path === '/';
    const name = file?.name ?? (root ? repository.name : directory!.name);
    const languages = directory ? Object.entries(directory.languages).sort((a, b) => b[1] - a[1]) : [];
    return <aside className="inspector-panel" aria-label="Selection details">
  <div className="panel-heading"><h2>{file ? 'File details' : root ? 'Repository overview' : 'Directory details'}</h2><span className="badge">{file ? 'File' : 'Directory'}</span></div>
  <div className="inspector-content">
   <h3>{name}</h3><p className="path">{selection.path}</p>
   {root && repository.description && <p className="description">{repository.description}</p>}
   <dl>{file ? <><dt>Type</dt><dd>{file.extension ? '.' + file.extension : 'Extensionless file'}</dd><dt>Language</dt><dd><i className="language-dot" style={{ background: palette[file.language] }}/>{file.language}</dd><dt>Size</dt><dd>{file.sizeKnown === false ? 'Unavailable' : formatBytes(file.size)}</dd><dt>Parent directory</dt><dd><button className="inline-button" onClick={() => onSelect({ kind: 'directory', path: file.directory })}>{file.directory}</button></dd></> : <><dt>Descendant files</dt><dd>{directory!.fileCount.toLocaleString()}</dd><dt>Descendant folders</dt><dd>{directory!.directoryCount.toLocaleString()}</dd><dt>Known file sizes</dt><dd>{formatBytes(directory!.bytes)}</dd><dt>Direct files</dt><dd>{directory!.files.length.toLocaleString()}</dd><dt>{root ? 'Deepest directory' : 'Directory depth'}</dt><dd>{root ? index.maxDepth : directory!.depth}</dd></>}
    <dt>Default branch</dt><dd>{repository.branch}</dd>
   </dl>
   <a className="github-link" href={file ? fileUrl(repository, file) : directoryLink(repository, selection.path)} target="_blank" rel="noreferrer">Open {file ? 'file' : root ? 'repository' : 'directory'} on GitHub ↗</a>
   {directory && <><p className="definition">Counts include all descendants. Size is the sum of available GitHub blob sizes, not checkout or disk size.{directory.unknownSizes > 0 && ' ' + directory.unknownSizes + ' file sizes are unavailable and excluded from the total.'}</p>
   <section className="inspector-section"><h4>Languages <span>by file count</span></h4><div className="language-bar" aria-hidden="true">{languages.map(([language, count]) => <i key={language} style={{ width: count / directory.fileCount * 100 + '%', background: palette[language] }}/>)}</div>{languages.map(([language, count]) => <div className="language-row" key={language}><i className="language-dot" style={{ background: palette[language] }}/><span>{language}</span><small>{count.toLocaleString()} · {(count / directory.fileCount * 100).toFixed(1)}%</small></div>)}</section></>}
   {root && <><section className="inspector-section"><h4>Largest files <span>available blob size</span></h4>{index.largestFiles.map(path => { const f = index.files.get(path)!; return <button className="file-summary" key={path} onClick={() => onSelect({ kind: 'file', path })}><span title={path}>{path}</span><small>{formatBytes(f.size)}</small></button>; })}</section><section className="inspector-section"><h4>Common project files</h4><p className="definition">Recognized by filename only; no architectural role is inferred.</p>{index.notableFiles.length ? index.notableFiles.map(path => <button className="file-summary" key={path} onClick={() => onSelect({ kind: 'file', path })}><span>{path}</span><span>→</span></button>) : <p className="muted">No recognized filenames in this repository.</p>}</section></>}
  </div>
 </aside>;
}
