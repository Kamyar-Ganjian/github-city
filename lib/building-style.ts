import { FileNode } from './model';
export type BuildingKind = 'source' | 'test' | 'configuration' | 'documentation' | 'asset' | 'other';
export const buildingKinds: BuildingKind[] = ['source', 'test', 'configuration', 'documentation', 'asset', 'other'];
export const buildingNames: Record<BuildingKind, string> = { source: 'Source tower', test: 'Test building', configuration: 'Configuration tower', documentation: 'Documentation slab', asset: 'Asset pavilion', other: 'General building' };
export const buildingFootprints: Record<BuildingKind, {
    width: number;
    depth: number;
}> = {
    source: { width: 1.35, depth: 1.35 }, test: { width: 1.25, depth: 1.55 }, configuration: { width: 1, depth: 1 },
    documentation: { width: 1.55, depth: .85 }, asset: { width: 1.55, depth: 1.35 }, other: { width: 1.3, depth: 1.3 }
};
export function buildingKind(file: FileNode): BuildingKind {
    if (/(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(test|spec)\./i.test(file.path))
        return 'test';
    if (/^(readme|changelog|contributing|license)(\.|$)/i.test(file.name) || /\.(md|mdx|rst|txt|adoc|pdf)$/i.test(file.name))
        return 'documentation';
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|mp[34]|wav|ogg|glb|gltf)$/i.test(file.name))
        return 'asset';
    if (file.name.startsWith('.') || /\.(json|ya?ml|toml|ini|lock)$/i.test(file.name) || /^(dockerfile|makefile|go.mod|cargo.toml)$|config\./i.test(file.name))
        return 'configuration';
    return file.language === 'Other' ? 'other' : 'source';
}
/** One deterministic emissive atlas. Window count is decorative, not repository data. */
export function windowPixels() {
    const width = 64, height = 128, data = new Uint8Array(width * height * 4);
    for (let i = 3; i < data.length; i += 4)
        data[i] = 255;
    for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++) {
            if ((row * 13 + col * 7) % 11 >= 5)
                continue;
            for (let y = 8 + row * 16; y < 14 + row * 16; y++)
                for (let x = 8 + col * 11; x < 12 + col * 11; x++) {
                    const offset = (y * width + x) * 4;
                    data[offset] = 255;
                    data[offset + 1] = 226;
                    data[offset + 2] = 172;
                }
        }
    return { width, height, data };
}
