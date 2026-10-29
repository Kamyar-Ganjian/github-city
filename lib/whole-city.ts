import {Building,City} from './layout';
import {height} from './model';

/** A complete spatial synopsis: every file belongs to exactly one visible item. */
export interface CityBlock {
 id:string;
 x:number;z:number;width:number;depth:number;height:number;
 count:number;bytes:number;language:string;directory:string;
}
export interface WholeCity {
 buildings:Building[];
 blocks:CityBlock[];
 fileCount:number;
}
export const WHOLE_CITY_BUDGET=8000;

function commonDirectory(a:string,b:string){
 if(a==='/'||b==='/')return '/';
 const left=a.split('/'),right=b.split('/');
 let i=0;while(i<left.length&&i<right.length&&left[i]===right[i])i++;
 return left.slice(0,i).join('/')||'/';
}

/**
 * Grid cells keep their original city coordinates. Singleton cells retain real
 * buildings; occupied cells with multiple files become explicitly marked blocks.
 * nx*nz never exceeds the budget, even for very narrow or very wide cities.
 */
export function wholeCity(city:City,budget=WHOLE_CITY_BUDGET):WholeCity {
 if(!Number.isInteger(budget)||budget<1)throw new Error('Whole-city budget must be a positive integer.');
 if(city.buildings.length<=budget)return {buildings:city.buildings,blocks:[],fileCount:city.buildings.length};
 const width=Math.max(1,city.width),depth=Math.max(1,city.depth);
 const nx=Math.max(1,Math.min(budget,Math.floor(Math.sqrt(budget*width/depth))));
 const nz=Math.max(1,Math.floor(budget/nx));
 interface Cell {first:Building;count:number;bytes:number;directory:string;minX:number;maxX:number;minZ:number;maxZ:number;languages:Map<string,number>}
 const cells=new Map<number,Cell>();
 for(const b of city.buildings){
  const ix=Math.max(0,Math.min(nx-1,Math.floor((b.x+width/2)/width*nx)));
  const iz=Math.max(0,Math.min(nz-1,Math.floor((b.z+depth/2)/depth*nz)));
  const key=iz*nx+ix;
  let cell=cells.get(key);
  if(!cell){cell={first:b,count:0,bytes:0,directory:b.file.directory,minX:b.x,maxX:b.x,minZ:b.z,maxZ:b.z,languages:new Map()};cells.set(key,cell)}
  cell.count++;cell.bytes+=b.file.size;
  cell.directory=commonDirectory(cell.directory,b.file.directory);
  cell.minX=Math.min(cell.minX,b.x);cell.maxX=Math.max(cell.maxX,b.x);
  cell.minZ=Math.min(cell.minZ,b.z);cell.maxZ=Math.max(cell.maxZ,b.z);
  cell.languages.set(b.file.language,(cell.languages.get(b.file.language)??0)+1);
 }
 const buildings:Building[]=[],blocks:CityBlock[]=[];
 for(const [id,cell] of [...cells].sort(([a],[b])=>a-b)){
  if(cell.count===1){buildings.push(cell.first);continue}
  const language=[...cell.languages].sort(([a,ac],[b,bc])=>bc-ac||(a<b?-1:a>b?1:0))[0][0];
  blocks.push({id:String(id),x:(cell.minX+cell.maxX)/2,z:(cell.minZ+cell.maxZ)/2,width:cell.maxX-cell.minX+1.55,depth:cell.maxZ-cell.minZ+1.55,height:height(cell.bytes/cell.count),count:cell.count,bytes:cell.bytes,language,directory:cell.directory});
 }
 return {buildings,blocks,fileCount:city.buildings.length};
}
