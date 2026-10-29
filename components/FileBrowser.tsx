'use client';
import {useState} from 'react';
import {FileNode} from '@/lib/model';
export default function FileBrowser({directory,files,onSelect}:{directory:string;files:FileNode[];onSelect:(file:FileNode)=>void}){
 const [page,setPage]=useState(0);
 return <section className="file-browser"><h2>Repository file browser</h2><p>{directory} · {files.length.toLocaleString()} direct files. Use the district navigator to explore subdirectories.</p>{files.slice(page*100,(page+1)*100).map(file=><button key={file.id} onClick={()=>onSelect(file)}><span>{file.path}</span><small>{file.size.toLocaleString()} B</small></button>)}{!files.length&&<p>This directory contains subdirectories, but no direct files.</p>}<div className="browser-pagination"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{page+1} / {Math.max(1,Math.ceil(files.length/100))}</span><button disabled={(page+1)*100>=files.length} onClick={()=>setPage(p=>p+1)}>Next</button></div></section>;
}
