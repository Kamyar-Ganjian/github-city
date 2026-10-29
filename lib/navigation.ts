import { ExplorerItem } from './explorer';
import { CityBlock } from './whole-city';
export type Selection = ExplorerItem | {
    kind: 'group';
    block: CityBlock;
};
export interface Navigation {
    directory: string;
    mode: 'directory' | 'whole';
    selection: Selection;
    selectionRevision: number;
    filePage: number;
    directoryPage: number;
    focus: ExplorerItem;
    cameraRevision: number;
}
export const initialNavigation: Navigation = { directory: '/', mode: 'directory', selection: { kind: 'directory', path: '/' }, selectionRevision: 0, filePage: 0, directoryPage: 0, focus: { kind: 'directory', path: '/' }, cameraRevision: 0 };
export type NavigationAction = {
    type: 'directory';
    path: string;
} | {
    type: 'file';
    path: string;
    directory: string;
    page: number;
    focus: boolean;
} | {
    type: 'group';
    block: CityBlock;
} | {
    type: 'whole';
} | {
    type: 'page';
    target: 'file' | 'directory';
    page: number;
} | {
    type: 'reset';
};
export function navigate(state: Navigation, action: NavigationAction): Navigation {
    switch (action.type) {
        case 'directory': return { ...state, directory: action.path, mode: 'directory', selection: { kind: 'directory', path: action.path }, selectionRevision: state.selectionRevision + 1, filePage: 0, directoryPage: 0, focus: { kind: 'directory', path: action.path }, cameraRevision: state.cameraRevision + 1 };
        case 'file': return { ...state, selection: { kind: 'file', path: action.path }, selectionRevision: state.selectionRevision + 1, ...(action.focus ? { directory: action.directory, mode: 'directory' as const, filePage: action.page, directoryPage: 0, focus: { kind: 'file' as const, path: action.path }, cameraRevision: state.cameraRevision + 1 } : {}) };
        case 'group': return { ...state, selection: { kind: 'group', block: action.block }, selectionRevision: state.selectionRevision + 1 };
        case 'whole': return { ...state, directory: '/', mode: 'whole', selection: { kind: 'directory', path: '/' }, selectionRevision: state.selectionRevision + 1, filePage: 0, directoryPage: 0, focus: { kind: 'directory', path: '/' }, cameraRevision: state.cameraRevision + 1 };
        case 'page': return { ...state, [action.target === 'file' ? 'filePage' : 'directoryPage']: Math.max(0, action.page), selection: { kind: 'directory', path: state.directory }, selectionRevision: state.selectionRevision + 1, focus: { kind: 'directory', path: state.directory }, cameraRevision: state.cameraRevision + 1 };
        case 'reset': return { ...state, focus: { kind: 'directory', path: state.directory }, cameraRevision: state.cameraRevision + 1 };
    }
}
