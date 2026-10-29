'use client';
import {useState} from 'react';
import {District} from '@/lib/layout';
export default function DistrictList({districts,onNavigate}:{districts:District[];onNavigate:(path:string)=>void}){
 const [page,setPage]=useState(0);
 if(!districts.length)return <p>No subdirectories. You’ve reached a local neighborhood.</p>;
 return <><div className="district-list">{districts.slice(page*100,(page+1)*100).map(d=><button key={d.path} onClick={()=>onNavigate(d.path)}><span>{d.path.split('/').pop()}</span><span>↗</span></button>)}</div>{districts.length>100&&<div className="browser-pagination"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>←</button><span>{page+1} / {Math.ceil(districts.length/100)}</span><button disabled={(page+1)*100>=districts.length} onClick={()=>setPage(p=>p+1)}>→</button></div>}</>;
}
