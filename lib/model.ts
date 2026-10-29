export interface FileNode {id:string;path:string;name:string;directory:string;extension:string;language:string;size:number}
export interface Repository {owner:string;name:string;branch:string;description:string;stars:number;files:FileNode[]}
export const palette:Record<string,string>={TypeScript:'#7faee4',JavaScript:'#e5c77d',Python:'#86b99e',Rust:'#d7997f',Go:'#75c9ce',CSS:'#b69bd3',HTML:'#e5a17d',JSON:'#a8b99b',Markdown:'#a0afc3',Other:'#727f92'};
export function parseRepository(input:string):{owner:string;name:string}{
 let value=input.trim().replace(/\/$/,'');
 if(value.startsWith('https://')) {let u:URL;try{u=new URL(value)}catch{throw new Error('Enter a valid GitHub URL or owner/repository.')}
 if(u.hostname!=='github.com'||u.search||u.hash)throw new Error('Use a public github.com repository URL.');value=u.pathname.slice(1);}
 const parts=value.split('/');if(parts.length!==2||!parts.every(p=>/^[\w.-]+$/.test(p)&&p!=='.'&&p!=='..'))throw new Error('Enter a GitHub URL or owner/repository.');
 return {owner:parts[0],name:parts[1].replace(/\.git$/,'')};
}
export function language(path:string){const ext=path.split('.').pop()?.toLowerCase()??'';return ({ts:'TypeScript',tsx:'TypeScript',js:'JavaScript',jsx:'JavaScript',mjs:'JavaScript',py:'Python',rs:'Rust',go:'Go',css:'CSS',scss:'CSS',html:'HTML',vue:'JavaScript',json:'JSON',md:'Markdown',mdx:'Markdown'} as Record<string,string>)[ext]??'Other'}
export function normalize(tree:unknown):FileNode[]{
 if(!Array.isArray(tree))throw new Error('GitHub returned a malformed tree.');
 return tree.filter((n):n is {path:string;size:number;type:string}=>!!n&&typeof n.path==='string'&&n.type==='blob').map(n=>({id:n.path,path:n.path,name:n.path.split('/').pop()!,directory:n.path.includes('/')?n.path.slice(0,n.path.lastIndexOf('/')):'/',extension:n.path.includes('.')?n.path.split('.').pop()!:'',language:language(n.path),size:Number.isFinite(n.size)?Math.max(0,n.size):0})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export const height=(size:number)=>Math.min(19,Math.max(.7,Math.log2(1+Math.max(0,size)/180)*1.7));
export const searchFiles=(files:FileNode[],query:string)=>{const q=query.trim().toLowerCase();return q?files.filter(f=>f.path.toLowerCase().includes(q)).slice(0,60):[]};
export const fileUrl=(repo:Repository,file:FileNode)=>'https://github.com/'+repo.owner+'/'+repo.name+'/blob/'+repo.branch.split('/').map(encodeURIComponent).join('/')+'/'+file.path.split('/').map(encodeURIComponent).join('/');
