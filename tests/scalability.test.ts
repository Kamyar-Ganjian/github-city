import {describe,it,expect,vi} from 'vitest';
import {loadRepository} from '../lib/github';
import {normalize} from '../lib/model';
import {layout} from '../lib/layout';
import {cityView,districtCounts} from '../lib/view';
const meta={owner:{login:'a'},name:'b',default_branch:'main',stargazers_count:0};
const reply=(value:unknown)=>new Response(JSON.stringify(value));
describe('large tree retrieval',()=>{
 it('recovers truncated trees, deduplicates SHA requests and preserves both paths',async()=>{
 const fetcher=vi.fn(async(url:string|URL|Request)=>{const path=String(url);if(path.endsWith('/a/b'))return reply(meta);if(path.includes('?recursive'))return reply({sha:'root',truncated:true,tree:[{path:'omitted.ts',type:'blob'}]});if(path.endsWith('/root'))return reply({tree:[{path:'src',type:'tree',sha:'shared'},{path:'copy',type:'tree',sha:'shared'}]});if(path.endsWith('/shared'))return reply({tree:[{path:'index.ts',type:'blob',size:100}]});throw new Error('Unexpected URL')});
 const repo=await loadRepository('a/b',fetcher);expect(repo.files.map(f=>f.path)).toEqual(['copy/index.ts','src/index.ts']);expect(fetcher).toHaveBeenCalledTimes(4);
 });
 it('does not reject 25,000 files',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({tree:Array.from({length:25000},(_,i)=>({path:'file'+i+'.ts',type:'blob',size:10})),truncated:false}));expect((await loadRepository('a/b',fetcher)).files).toHaveLength(25000)});
 it('rejects truncation in an individual directory',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({sha:'root',truncated:true,tree:[]})).mockResolvedValueOnce(reply({truncated:true,tree:[]}));await expect(loadRepository('a/b',fetcher)).rejects.toThrow('individual directory')});
 it('reports submodules explicitly without treating them as files',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(reply(meta)).mockResolvedValueOnce(reply({tree:[{path:'lib',type:'commit'},{path:'main.ts',type:'blob',size:10}]}));const repo=await loadRepository('a/b',fetcher);expect(repo.submodules).toEqual(['lib']);expect(repo.files).toHaveLength(1)});
});
describe('multiscale representation',()=>{
 const files=normalize(Array.from({length:25000},(_,i)=>({path:'src/d'+i%25+'/f'+i+'.ts',type:'blob',size:i})));const city=layout(files);
 it('uses district aggregates in overview and individual files in neighborhoods',()=>{const overview=cityView(city,'/');expect(overview.aggregate).toBe(true);expect(overview.buildings).toHaveLength(0);expect(overview.descendantCount).toBe(25000);expect(cityView(city,'src/d0').buildings).toHaveLength(1000)});
 it('counts every file exactly once per ancestor',()=>{const counts=districtCounts(city);expect(counts.get('/')).toBe(25000);expect(counts.get('src')).toBe(25000);expect(counts.get('src/d0')).toBe(1000)});
 it('paginates large flat directories without omissions',()=>{const flat=layout(normalize(Array.from({length:4001},(_,i)=>({path:'f'+i+'.ts',size:i,type:'blob'}))));const pages=Array.from({length:5},(_,page)=>cityView(flat,'/',page));expect(pages[0].pages).toBe(5);expect(new Set(pages.flatMap(p=>p.buildings.map(b=>b.file.id))).size).toBe(4001)});
 it('respects directory boundaries rather than string prefix alone',()=>expect(cityView(city,'src/d1').descendantCount).toBe(1000));
});
describe('public data boundary',()=>{it('never serves private metadata through a configured token',async()=>{const fetcher=vi.fn().mockResolvedValue(reply({...meta,private:true}));await expect(loadRepository('a/b',fetcher)).rejects.toThrow('Only public');expect(fetcher).toHaveBeenCalledTimes(1)})});
