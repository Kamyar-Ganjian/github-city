import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { normalize } from '../lib/model';
import { prepareRepository } from '../lib/prepare';
import { mapView } from '../lib/map-view';
import { initialNavigation, navigate } from '../lib/navigation';
import { environmentPlan } from '../lib/environment';
import { architectureKind } from '../lib/building-style';
console.log(JSON.stringify({ node: process.version, cpu: os.cpus()[0]?.model, platform: os.platform(), note: 'Single-run synthetic CPU timings; excludes network, worker cloning, React, GPU and shader compilation.' }));
for (const count of [5000, 25000, 100000]) {
    const files = normalize(Array.from({ length: count }, (_, i) => ({ path: 'src/d' + i % 100 + '/file' + i + '.ts', type: 'blob', size: 300 + i * 7 })));
    const start = performance.now(), prepared = prepareRepository(files), preparedAt = performance.now();
    const view = mapView(prepared, navigate(initialNavigation, { type: 'whole' })), plannedAt = performance.now(), environment = environmentPlan(view.urban), environmentAt = performance.now();
    const scale: Record<string, number> = {};
    for (const b of view.buildings) {
        const k = architectureKind(b.height);
        scale[k] = (scale[k] ?? 0) + 1;
    }
    for (const a of view.aggregates) {
        const k = architectureKind(a.height, true);
        scale[k] = (scale[k] ?? 0) + 1;
    }
    console.log(JSON.stringify({ files: count, prepareMs: +(preparedAt - start).toFixed(2), urbanMs: +(plannedAt - preparedAt).toFixed(2), environmentMs: +(environmentAt - plannedAt).toFixed(2), represented: view.representedFiles, units: view.buildings.length + view.aggregates.length, roads: view.urban.roads.length, lawns: environment.parks.length, paths: environment.paths.length, trees: environment.trees.length, shrubs: environment.shrubs.length, background: environment.background.length, vehicles: environment.vehicles.length, facilities: environment.facilities.length, water: environment.water.length, scale }));
}
