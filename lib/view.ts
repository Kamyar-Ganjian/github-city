import {City,District} from './layout';
export const DETAIL_BUDGET=3000;
export const PAGE_SIZE=1000;
export function inside(path:string,directory:string){return directory==='/'||path===directory||path.startsWith(directory+'/')}
export function parent(path:string){return path==='/'?'/':path.includes('/')?path.slice(0,path.lastIndexOf('/')):'/'}
export function cityView(city:City,directory:string,page=0){
 const district=city.districts.find(d=>d.path===directory)??city.districts[0];
 const descendants=city.buildings.filter(b=>inside(b.file.directory,directory));
 const aggregate=descendants.length>DETAIL_BUDGET;
 const direct=aggregate?descendants.filter(b=>b.file.directory===directory):descendants;
 const children=city.districts.filter(d=>d.path!==directory&&parent(d.path)===directory);
 const visible=aggregate?direct.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE):direct;
 return {district,aggregate,buildings:visible,children,descendantCount:descendants.length,directCount:direct.length,pages:aggregate?Math.max(1,Math.ceil(direct.length/PAGE_SIZE)):1};
}
export function districtCounts(city:City){const counts=new Map<string,number>();for(const b of city.buildings){let path=b.file.directory;while(true){counts.set(path,(counts.get(path)??0)+1);if(path==='/')break;path=parent(path)}}return counts}
export function childDistricts(districts:District[],path:string){return districts.filter(d=>d.path!==path&&parent(d.path)===path)}
