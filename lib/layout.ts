import {FileNode,height} from './model';
export interface Building {file:FileNode;x:number;z:number;height:number}
export interface District {path:string;x:number;z:number;width:number;depth:number;level:number}
export interface City {buildings:Building[];districts:District[];width:number;depth:number}
interface Node {path:string;files:FileNode[];children:Node[];width:number;depth:number;placements:{node:Node;x:number;z:number}[]}
export function layout(files:FileNode[]):City {
 const nodes=new Map<string,Node>();
 const root:Node={path:'/',files:[],children:[],width:0,depth:0,placements:[]};
 nodes.set('/',root);
 for(const file of [...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)){let node=root;let path='';for(const part of file.directory==='/'?[]:file.directory.split('/')){path=path?path+'/'+part:part;let child=nodes.get(path);if(!child){child={path,files:[],children:[],width:0,depth:0,placements:[]};node.children.push(child);nodes.set(path,child)}node=child}node.files.push(file)}
 function measure(n:Node){n.children.forEach(measure);const cols=Math.ceil(Math.sqrt(n.files.length));const ownW=cols?cols*2.3+4:0;const ownD=cols?Math.ceil(n.files.length/cols)*2.3+4:0;
 const area=n.children.reduce((a,c)=>a+(c.width+3)*(c.depth+3),0)+ownW*ownD;const target=n.children.reduce((max,c)=>Math.max(max,c.width+3),Math.max(ownW,Math.sqrt(area)*1.2,8));
 let x=2,z=2,row=0,max=0;if(ownW){x=ownW+3;row=ownD}
 for(const child of n.children){if(x+child.width>target&&x>2){z+=row+3;x=2;row=0}n.placements.push({node:child,x,z});x+=child.width+3;row=Math.max(row,child.depth);max=Math.max(max,x)}
 n.width=Math.max(ownW+4,max+1,8);n.depth=z+row+2;
 }
 measure(root);const buildings:Building[]=[],districts:District[]=[];
 function emit(n:Node,x:number,z:number,level:number){districts.push({path:n.path,x:x+n.width/2,z:z+n.depth/2,width:n.width,depth:n.depth,level});const cols=Math.ceil(Math.sqrt(n.files.length));n.files.forEach((file,i)=>buildings.push({file,x:x+4+(i%cols)*2.3,z:z+4+Math.floor(i/cols)*2.3,height:height(file.size)}));n.placements.forEach(p=>emit(p.node,x+p.x,z+p.z,level+1))}
 emit(root,-root.width/2,-root.depth/2,0);return {buildings,districts,width:root.width,depth:root.depth};
}
