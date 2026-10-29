import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {layout} from '../lib/layout';
import {normalize,searchFiles} from '../lib/model';
import {cityView,districtCounts} from '../lib/view';
console.log(JSON.stringify({runtime:process.version,cpu:os.cpus()[0]?.model,platform:os.platform(),note:'Synthetic CPU timings; no GPU or browser measurements.'}));
for(const count of [5000,25000,100000]){
 const files=normalize(Array.from({length:count},(_,i)=>({path:'src/district'+i%100+'/nested'+i%5+'/file'+i+'.ts',type:'blob',size:100+i*7})));
 const start=performance.now();const city=layout(files);const laidOut=performance.now();const view=cityView(city,'/');districtCounts(city);const viewed=performance.now();searchFiles(files,'file999');const searched=performance.now();
 console.log(JSON.stringify({files:count,districts:city.districts.length,layoutMs:+(laidOut-start).toFixed(2),viewAndCountsMs:+(viewed-laidOut).toFixed(2),searchMs:+(searched-viewed).toFixed(2),overviewInstances:view.buildings.length,aggregated:view.aggregate}));
}
