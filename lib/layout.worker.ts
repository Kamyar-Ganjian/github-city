import { prepareRepository } from './prepare';
import { FileNode } from './model';
self.onmessage = (event: MessageEvent<FileNode[]>) => {
    try {
        self.postMessage({ prepared: prepareRepository(event.data) });
    }
    catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : 'Repository preparation failed.' });
    }
};
