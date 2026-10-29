'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ExplorerItem } from '@/lib/explorer';
import { mapView } from '@/lib/map-view';
import { Navigation, NavigationAction } from '@/lib/navigation';
import { PreparedRepository } from '@/lib/prepare';
import { CityBlock } from '@/lib/whole-city';
import { palette } from '@/lib/model';
const City = dynamic(() => import('./City'), { ssr: false, loading: () => <p className="map-placeholder">Loading map…</p> });
function subscribeTheme(callback: () => void) { const media = window.matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', callback); window.addEventListener('themechange', callback); return () => { media.removeEventListener('change', callback); window.removeEventListener('themechange', callback); }; }
function themeSnapshot() { const value = document.documentElement.dataset.theme; return value === 'light' || value === 'dark' ? value : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
const serverTheme = () => 'light' as const;
function UnavailableMap() { return <div className="map-placeholder"><h3>3D isn’t available in this browser.</h3><p>The file tree, search, statistics, and inspector remain fully available.</p></div>; }
class MapBoundary extends Component<{
    children: React.ReactNode;
    onUnavailable: () => void;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onUnavailable(); }
    render() { return this.state.failed ? <UnavailableMap /> : this.props.children; }
}
export default function MapPanel({ prepared, navigation, title, onSelect, onGroup, dispatch, onMessage }: {
    prepared: PreparedRepository;
    navigation: Navigation;
    title: string;
    onSelect: (item: ExplorerItem, focus?: boolean) => void;
    onGroup: (block: CityBlock) => void;
    dispatch: React.Dispatch<NavigationAction>;
    onMessage: (message: string) => void;
}) {
    const [environment, setEnvironment] = useState<'minimal' | 'detailed'>('detailed'), [background, setBackground] = useState(true);
    const [pan, setPan] = useState(false), [labels, setLabels] = useState(true), [enabled, setEnabled] = useState(true), [ready, setReady] = useState(false), [capture, setCapture] = useState(0);
    const contextLost = useCallback(() => { setEnabled(false); setReady(false); onMessage('3D context lost. All files remain available in the tree.'); }, [onMessage]);
    const [support, setSupport] = useState<'checking' | 'available' | 'unavailable'>('checking');
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2');
                setSupport(context ? 'available' : 'unavailable');
                context?.getExtension('WEBGL_lose_context')?.loseContext();
            }
            catch {
                setSupport('unavailable');
            }
        }, 0);
        return () => clearTimeout(timer);
    }, []);
    const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, serverTheme);
    const { directory, mode, filePage, directoryPage } = navigation;
    const view = useMemo(() => mapView(prepared, { directory, mode, filePage, directoryPage }), [prepared, directory, mode, filePage, directoryPage]);
    const total = prepared.index.directories.get(directory)!.fileCount;
    return <section className="map-panel" aria-label="Repository map">
  <div className="map-toolbar"><div className="segmented" role="group" aria-label="Map scope"><button aria-pressed={mode === 'directory'} onClick={() => dispatch({ type: 'directory', path: directory })}>Directory</button><button aria-pressed={mode === 'whole'} onClick={() => dispatch({ type: 'whole' })}>Whole repository</button></div><div className="map-actions"><button onClick={() => dispatch({ type: 'reset' })} title="Fit the visible map">Reset camera</button><button onClick={() => { setEnabled(v => !v); setReady(false); }}>{enabled ? 'Hide 3D' : 'Show 3D'}</button></div></div>
  <div className="environment-controls"><div className="segmented" role="group" aria-label="Environment detail"><span>Environment</span><button aria-pressed={environment === 'minimal'} onClick={() => setEnvironment('minimal')}>Minimal</button><button aria-pressed={environment === 'detailed'} onClick={() => setEnvironment('detailed')}>Detailed</button></div>{environment === 'detailed' && <label><input type="checkbox" checked={background} onChange={event => setBackground(event.target.checked)}/>Background buildings</label>}</div><div className="map-description"><span>{view.buildings.length.toLocaleString()} file buildings{view.aggregates.length > 0 ? ' · ' + view.aggregates.length.toLocaleString() + ' aggregates' : ''}</span><span>{view.representedFiles.toLocaleString()} of {total.toLocaleString()} files represented</span></div>
  <div className="map-canvas">{enabled ? support === 'unavailable' ? <UnavailableMap /> : support === 'checking' ? <p className="map-placeholder">Checking 3D support…</p> : <MapBoundary onUnavailable={() => setReady(false)}><City environment={environment} backgroundBuildings={background} prepared={prepared} view={view} navigation={navigation} theme={theme} pan={pan} labels={labels} capture={capture} title={title + ' / ' + directory} onSelect={onSelect} onGroup={onGroup} onUnavailable={contextLost} onReady={() => setReady(true)} onCapture={onMessage}/></MapBoundary> : <div className="map-placeholder"><h3>Explore without 3D.</h3><p>Select any file or directory in the tree. All metadata and search remain available.</p></div>}</div>
  <div className="map-bottom"><div className="segmented" role="group" aria-label="Drag behavior"><button aria-pressed={!pan} onClick={() => setPan(false)}>Orbit</button><button aria-pressed={pan} onClick={() => setPan(true)}>Pan</button></div><span className="map-hint">Drag to {pan ? 'pan' : 'orbit'} · Right-drag to pan · Scroll to zoom</span><button aria-pressed={labels} onClick={() => setLabels(v => !v)}>Labels</button><button disabled={!enabled || !ready} onClick={() => setCapture(v => v + 1)}>Export PNG</button></div>
  {(view.filePages > 1 || view.directoryPages > 1) && <div className="map-pagination">{view.filePages > 1 && <div><span>Direct files</span><button aria-label="Previous file page" disabled={!filePage} onClick={() => dispatch({ type: 'page', target: 'file', page: filePage - 1 })}>←</button><span>{filePage + 1} / {view.filePages}</span><button aria-label="Next file page" disabled={filePage + 1 >= view.filePages} onClick={() => dispatch({ type: 'page', target: 'file', page: filePage + 1 })}>→</button></div>}{view.directoryPages > 1 && <div><span>Directories</span><button aria-label="Previous directory page" disabled={!directoryPage} onClick={() => dispatch({ type: 'page', target: 'directory', page: directoryPage - 1 })}>←</button><span>{directoryPage + 1} / {view.directoryPages}</span><button aria-label="Next directory page" disabled={directoryPage + 1 >= view.directoryPages} onClick={() => dispatch({ type: 'page', target: 'directory', page: directoryPage + 1 })}>→</button></div>}<small>This map is paginated. The file tree and search include every loaded file.</small></div>}
  <details className="map-key"><summary>How to read this map</summary><p>Colored buildings represent individual files; height is logarithmic byte size and capped to keep large files in proportion. Buildings on outlined podiums represent file groups or whole directories; height is logarithmic file count with a fixed maximum. Parent aggregates and their files are never shown together. Hover for metadata; select a folder to drill in. Architecture follows the encoded scale: houses, apartments, mid-rises, high-rises, and directory landmarks. Seeded variation changes roofs and facades, not data. Language colors identify repository buildings; outlined podiums identify aggregates. Roads, greenery, parked vehicles, transit facilities, water features, background structures, and the city sign are decorative and excluded from all counts. Static transit and vehicles do not indicate repository activity. Environment detail is bounded and reduced at distant views.</p><div className="map-legend">{Object.entries(palette).map(([language, color]) => <span key={language}><i className="language-dot" style={{ background: color }}/>{language}</span>)}</div></details>
 </section>;
}
