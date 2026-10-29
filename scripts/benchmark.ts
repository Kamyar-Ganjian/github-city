import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { normalize } from '../lib/model';
import { prepareRepository } from '../lib/prepare';
import { searchRepository, treeRows } from '../lib/explorer';
import { mapView } from '../lib/map-view';
import { initialNavigation } from '../lib/navigation';
console.log(JSON.stringify({ node: process.version, cpu: os.cpus()[0]?.model, note: 'Synthetic CPU timings, excluding network, worker cloning, DOM and GPU.' }));
for (const count of [5000, 25000, 100000]) {
    const files = normalize(Array.from({ length: count }, (_, i) => ({ path: 'src/d' + i % 100 + '/f' + i + '.ts', type: 'blob', size: i * 7 })));
    const start = performance.now(), prepared = prepareRepository(files), planned = performance.now();
    const view = mapView(prepared, initialNavigation), viewed = performance.now();
    searchRepository(prepared.index, 'f99999');
    const searched = performance.now();
    const rows = treeRows(prepared.index, new Set(['/', 'src', ...Array.from({ length: 100 }, (_, i) => 'src/d' + i)]));
    const flattened = performance.now();
    console.log(JSON.stringify({ files: count, prepareMs: +(planned - start).toFixed(2), mapMs: +(viewed - planned).toFixed(2), searchMs: +(searched - viewed).toFixed(2), flattenMs: +(flattened - searched).toFixed(2), rows: rows.length, mapItems: view.buildings.length + view.aggregates.length }));
}
