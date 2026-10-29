import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {layout} from '../lib/layout';
import {normalize} from '../lib/model';
import {wholeCity} from '../lib/whole-city';
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0]?.model,note:'Synthetic whole-city preparation only; excludes layout, browser and GPU.'}));
for(const count of [5000,25000,100000]){
 const city=layout(normalize(Array.from({length:count},(_,i)=>({path:'src/d'+i%100+'/file'+i+'.ts',type:'blob',size:100+i*7}))));
 const start=performance.now(),whole=wholeCity(city);
 console.log(JSON.stringify({files:count,preparationMs:+(performance.now()-start).toFixed(2),individualBuildings:whole.buildings.length,aggregateBlocks:whole.blocks.length,representedFiles:whole.buildings.length+whole.blocks.reduce((total,block)=>total+block.count,0)}));
}
