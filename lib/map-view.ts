import { Building, District } from './layout';
import { aggregateHeight, DETAIL_LIMIT, DIRECTORY_PAGE_SIZE, FILE_PAGE_SIZE } from './explorer';
import { Navigation } from './navigation';
import { PreparedRepository } from './prepare';
import { CityBlock } from './whole-city';
export interface MapView {
    bounds: District;
    maxHeight: number;
    buildings: Building[];
    aggregates: CityBlock[];
    boundaries: District[];
    representedFiles: number;
    filePages: number;
    directoryPages: number;
}
function frame(fallback: District, files: Building[], aggregates: CityBlock[]) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxHeight = 1;
    for (const b of files) {
        minX = Math.min(minX, b.x - .775);
        maxX = Math.max(maxX, b.x + .775);
        minZ = Math.min(minZ, b.z - .775);
        maxZ = Math.max(maxZ, b.z + .775);
        maxHeight = Math.max(maxHeight, b.height);
    }
    for (const b of aggregates) {
        minX = Math.min(minX, b.x - b.width / 2);
        maxX = Math.max(maxX, b.x + b.width / 2);
        minZ = Math.min(minZ, b.z - b.depth / 2);
        maxZ = Math.max(maxZ, b.z + b.depth / 2);
        maxHeight = Math.max(maxHeight, b.height);
    }
    return { bounds: Number.isFinite(minX) ? { ...fallback, x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: Math.max(8, maxX - minX + 4), depth: Math.max(8, maxZ - minZ + 4) } : fallback, maxHeight };
}
/** Local view coordinates keep drill-downs centered instead of flying across empty world space. */
function localize(view: MapView): MapView {
    const { x, z } = view.bounds;
    return { ...view, bounds: { ...view.bounds, x: 0, z: 0 },
        buildings: view.buildings.map(b => ({ ...b, x: b.x - x, z: b.z - z })),
        aggregates: view.aggregates.map(b => ({ ...b, x: b.x - x, z: b.z - z })),
        boundaries: view.boundaries.map(d => ({ ...d, x: d.x - x, z: d.z - z })) };
}
export function mapView(prepared: PreparedRepository, navigation: Pick<Navigation, 'directory' | 'mode' | 'filePage' | 'directoryPage'>): MapView {
    const { index, city, whole, buildings, districts } = prepared, path = navigation.mode === 'whole' ? '/' : navigation.directory;
    const directory = index.directories.get(path)!;
    const bounds = districts.get(path) ?? city.districts[0];
    if (navigation.mode === 'whole')
        return { ...frame(bounds, whole.buildings, whole.blocks), buildings: whole.buildings, aggregates: whole.blocks, boundaries: index.directories.get('/')!.directories.slice(0, 200).map(p => districts.get(p)!), representedFiles: whole.fileCount, filePages: 1, directoryPages: 1 };
    const detailed = directory.fileCount <= DETAIL_LIMIT;
    let visibleFiles: Building[] = [];
    if (detailed) {
        const pending = [path];
        while (pending.length) {
            const current = index.directories.get(pending.pop()!)!;
            for (const file of current.files)
                visibleFiles.push(buildings.get(file)!);
            pending.push(...current.directories);
        }
    }
    else
        for (const file of directory.files.slice(navigation.filePage * FILE_PAGE_SIZE, (navigation.filePage + 1) * FILE_PAGE_SIZE))
            visibleFiles.push(buildings.get(file)!);
    const childPaths = directory.directories.slice(navigation.directoryPage * DIRECTORY_PAGE_SIZE, (navigation.directoryPage + 1) * DIRECTORY_PAGE_SIZE);
    const aggregates = detailed ? [] : childPaths.map(p => {
        const info = index.directories.get(p)!, d = districts.get(p)!;
        const language = Object.keys(info.languages).sort((a, b) => info.languages[b] - info.languages[a] || (a < b ? -1 : 1))[0] ?? 'Other';
        return { id: 'directory:' + p, directory: p, x: d.x, z: d.z, width: Math.min(14, d.width * .55), depth: Math.min(14, d.depth * .55), height: aggregateHeight(info.fileCount), count: info.fileCount, bytes: info.bytes, language };
    });
    if (!detailed) {
        const columns = Math.ceil(Math.sqrt(visibleFiles.length));
        visibleFiles = visibleFiles.map((building, i) => ({ ...building, x: (i % columns) * 2.8, z: Math.floor(i / columns) * 2.8 }));
        const offset = visibleFiles.length ? columns * 2.8 + 8 : 0, aggregateColumns = Math.max(1, Math.ceil(Math.sqrt(aggregates.length)));
        aggregates.forEach((aggregate, i) => { aggregate.x = offset + (i % aggregateColumns) * 11; aggregate.z = Math.floor(i / aggregateColumns) * 11; aggregate.width = 7; aggregate.depth = 7; });
        const compactBoundaries: District[] = aggregates.slice(0, 200).map(aggregate => ({ ...districts.get(aggregate.directory)!, x: aggregate.x, z: aggregate.z, width: 9, depth: 9 }));
        if (visibleFiles.length)
            compactBoundaries.unshift({ ...bounds, x: (columns - 1) * 1.4, z: (Math.ceil(visibleFiles.length / columns) - 1) * 1.4, width: columns * 2.8 + 1, depth: Math.ceil(visibleFiles.length / columns) * 2.8 + 1 });
        return localize({ ...frame(bounds, visibleFiles, aggregates), buildings: visibleFiles, aggregates, boundaries: compactBoundaries.slice(0, 200), representedFiles: visibleFiles.length + aggregates.reduce((sum, a) => sum + a.count, 0), filePages: Math.max(1, Math.ceil(directory.files.length / FILE_PAGE_SIZE)), directoryPages: Math.max(1, Math.ceil(directory.directories.length / DIRECTORY_PAGE_SIZE)) });
    }
    const boundaryPaths = [...childPaths.slice(0, 200)];
    if (detailed)
        for (const child of childPaths) {
            for (const nested of index.directories.get(child)!.directories) {
                if (boundaryPaths.length === 200)
                    break;
                boundaryPaths.push(nested);
            }
            if (boundaryPaths.length === 200)
                break;
        }
    return localize({ ...frame(bounds, visibleFiles, aggregates), buildings: visibleFiles, aggregates, boundaries: boundaryPaths.map(p => districts.get(p)!), representedFiles: visibleFiles.length + aggregates.reduce((sum, a) => sum + a.count, 0), filePages: detailed ? 1 : Math.max(1, Math.ceil(directory.files.length / FILE_PAGE_SIZE)), directoryPages: detailed ? 1 : Math.max(1, Math.ceil(directory.directories.length / DIRECTORY_PAGE_SIZE)) });
}
