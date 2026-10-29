import {layout} from './layout';
import {FileNode} from './model';
self.onmessage=(event:MessageEvent<FileNode[]>)=>{try{self.postMessage({city:layout(event.data)})}catch(error){self.postMessage({error:error instanceof Error?error.message:'Layout failed'})}};
