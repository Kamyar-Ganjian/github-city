import {layout} from './layout';
import {wholeCity} from './whole-city';
import {FileNode} from './model';
self.onmessage=(event:MessageEvent<FileNode[]>)=>{try{const city=layout(event.data);self.postMessage({city,whole:wholeCity(city)})}catch(error){self.postMessage({error:error instanceof Error?error.message:'Layout failed'})}};
