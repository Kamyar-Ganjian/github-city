'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DistrictList from '@/components/DistrictList';
import FileBrowser from '@/components/FileBrowser';
import {Component,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Repository,FileNode,palette,searchFiles,fileUrl,landmark} from '@/lib/model';
import {City as CityData} from '@/lib/layout';
import {cityView,parent} from '@/lib/view';
import {useCity} from '@/lib/store';
const City=dynamic(()=>import('@/components/City'),{ssr:false});
const examples=[['facebook/react','React','Interface architecture'],['vercel/next.js','Next.js','A city of possibilities'],['microsoft/TypeScript','TypeScript','Explore the compiler'],['vuejs/core','Vue','Progressive by design']];
const bytes=(n:number)=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
class SceneBoundary extends Component<{children:React.ReactNode;onFailure:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}componentDidCatch(){this.props.onFailure()}render(){return this.state.failed?null:this.props.children}}
export default function Home(){
 const [input,setInput]=useState('');const [repo,setRepo]=useState<Repository|null>(null);const [city,setCity]=useState<CityData|null>(null);const [loading,setLoading]=useState('');const [error,setError]=useState('');const [query,setQuery]=useState('');const [active,setActive]=useState(0);const [labels,setLabels]=useState(true);const [skip,setSkip]=useState(false);const [capture,setCapture]=useState(0);const [shot,setShot]=useState(false);const [browser,setBrowser]=useState(false);const [drawer,setDrawer]=useState(false);const [tour,setTour]=useState(false);const [shareStatus,setShareStatus]=useState('');
 const request=useRef<AbortController|null>(null);const worker=useRef<Worker|null>(null);const search=useRef<HTMLInputElement>(null);
 const page=useCity(s=>s.page);const setPage=useCity(s=>s.setPage);const selected=useCity(s=>s.selected);const select=useCity(s=>s.select);const district=useCity(s=>s.district);const navigate=useCity(s=>s.navigate);
 const view=useMemo(()=>city?cityView(city,district,page):null,[city,district,page]);
 const results=useMemo(()=>repo?searchFiles(repo.files,query):[],[repo,query]);
 const languages=useMemo(()=>repo?Object.entries(repo.files.reduce((a,f)=>(a[f.language]=(a[f.language]??0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]):[],[repo]);
 const districtFiles=useMemo(()=>repo?.files.filter(f=>f.directory===district)??[],[repo,district]);
 const totalBytes=useMemo(()=>repo?.files.reduce((sum,f)=>sum+f.size,0)??0,[repo]);
 const failWebGL=useCallback(()=>{setBrowser(true);setShareStatus('3D rendering unavailable. All files remain available in the browser.')},[]);
 const load=useCallback(async(value:string)=>{
  request.current?.abort();worker.current?.terminate();const controller=new AbortController();request.current=controller;setInput(value);setLoading('Reading the repository tree');setError('');
  try{
   const response=await fetch('/api/repository?q='+encodeURIComponent(value),{signal:controller.signal});const data:Repository&{error?:string}=await response.json();if(!response.ok)throw new Error(data.error);
   setLoading('Planning districts and streets');
   const planned=await new Promise<CityData>((resolve,reject)=>{
    const w=new Worker(new URL('../lib/layout.worker.ts',import.meta.url));worker.current=w;
    w.onmessage=e=>{w.terminate();worker.current=null;if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.city)};
    w.onerror=()=>{w.terminate();reject(new Error('The browser could not plan this repository. Try a smaller tree or another browser.'))};
    controller.signal.addEventListener('abort',()=>{w.terminate();reject(new DOMException('Aborted','AbortError'))},{once:true});
    w.postMessage(data.files);
   });
   if(controller.signal.aborted)return;
   setRepo(data);setCity(planned);navigate('/');setQuery('');setPage(0);setSkip(false);setDrawer(false);setTour(false);
   const url=new URL(window.location.href);url.searchParams.set('repo',data.owner+'/'+data.name);history.replaceState(null,'',url);
   try{const c=document.createElement('canvas');const context=c.getContext('webgl2');setBrowser(!context);context?.getExtension('WEBGL_lose_context')?.loseContext()}catch{setBrowser(true)}
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to connect. Try again.')}finally{if(request.current===controller)setLoading('')}
 },[navigate,setPage]);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('repo');const timer=window.setTimeout(()=>{if(value)void load(value)},0);return()=>{clearTimeout(timer);request.current?.abort();worker.current?.terminate()}},[load]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{const input=event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement;if((event.key==='/'&&!input)||((event.metaKey||event.ctrlKey)&&event.key==='k')){event.preventDefault();search.current?.focus()}if(event.key==='Escape'){setQuery('');setShot(false);setTour(false);setDrawer(false)}if(!input&&event.key.toLowerCase()==='h'){navigate('/');setPage(0)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[navigate,setPage]);
 function go(path:string){setPage(0);navigate(path)}
 function choose(file:FileNode){select(file,true);const direct=city?.buildings.filter(b=>b.file.directory===file.directory)??[];setPage(Math.floor(Math.max(0,direct.findIndex(b=>b.file.id===file.id))/1000));setQuery('');setTour(false)}
 async function share(){try{await navigator.clipboard.writeText(window.location.href);setShareStatus('Repository link copied.')}catch{setShareStatus('Copy this page URL to share the repository.')}}
 const currentChildren=view?.children??[];
 return <main className={repo?'exploring':''}>
 <header className={shot?'hidden-ui':''}><Link href="/" className="brand"><span className="brand-icon">▥</span> GITHUB CITY<span className="edition">THE ARCHITECTURE OF CODE</span></Link><div className="header-right"><span className="status-dot"/>{repo?'PUBLIC REPOSITORY':'AN INTERACTIVE CODE ATLAS'}{repo&&<button onClick={()=>void share()}>Share ↗</button>}</div></header>
 {repo&&city&&!browser&&<div className="canvas" role="img" aria-label={'Interactive city of '+repo.owner+'/'+repo.name}><SceneBoundary key={repo.owner+'/'+repo.name} onFailure={failWebGL}><City city={city} labels={labels} reset={0} skip={skip} capture={capture} page={page} tour={tour} onFailure={failWebGL}/></SceneBoundary></div>}
 {!repo&&<div className="landing-art" aria-hidden="true"><div className="contour one"/><div className="contour two"/><div className="model-base"><div className="blueprint">{Array.from({length:81},(_,i)=><i key={i} style={{height:20+(i*37%100),background:['#87a8ad','#d5be89','#a6b799','#8d9cae'][i%4]}}/>)}</div></div><span className="art-caption">CONCEPTUAL MODEL / YOUR REPOSITORY BECOMES THE CITY</span><div className="north">N<br/>↑</div></div>}
 {!repo?<section className="landing"><p className="eyebrow"><span/> A DIFFERENT WAY TO READ CODE</p><h1>Software.<br/>With a sense<br/>of <em>place.</em></h1><p className="intro">Turn a repository into a world worth exploring.<br/>Files become architecture. Directories become districts.</p><form onSubmit={e=>{e.preventDefault();void load(input)}}><label htmlFor="repo">START WITH A PUBLIC GITHUB REPOSITORY</label><div className="repo-input"><span>↗</span><input id="repo" value={input} onChange={e=>setInput(e.target.value)} placeholder="owner / repository" required/><button disabled={!!loading}>Explore city <span>→</span></button></div></form><p className="input-note">A real repository. A new perspective. No account required.</p><div className="examples"><p className="eyebrow">TAKE THE SCENIC ROUTE</p>{examples.map(([value,name,description],i)=><button key={value} onClick={()=>void load(value)} disabled={!!loading}><span className="example-number">0{i+1}</span><span><strong>{name}</strong><small>{description}</small></span><span>↗</span></button>)}</div></section>:<>
 {!shot&&<><section className="repository-bar"><button className="switcher" onClick={()=>{request.current?.abort();setRepo(null);setCity(null);go('/');history.replaceState(null,'','/')}} aria-label="Explore another repository">←</button><div><p>{repo.owner} /</p><h1>{repo.name}<span> / CITY</span></h1></div><div className="repo-facts"><span>{repo.files.length.toLocaleString()} files</span><span>{Math.max(0,(city?.districts.length??1)-1).toLocaleString()} directories</span><span>{bytes(totalBytes)}</span></div></section>
 <div className="search"><label htmlFor="search" className="sr-only">Find a file</label><span aria-hidden="true">⌕</span><input ref={search} id="search" placeholder="Find a file or path" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.max(0,Math.min(a+1,results.length-1)))}if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(a-1,0))}if(e.key==='Enter'&&results[active])choose(results[active]);if(e.key==='Escape')setQuery('')}} aria-controls={query?'results':undefined} aria-expanded={!!query} aria-activedescendant={query&&results[active]?'result-'+active:undefined} role="combobox"/><kbd>/</kbd>{query&&<div className="results" id="results" role="listbox">{results.length?results.map((f,i)=><button role="option" aria-selected={active===i} id={'result-'+i} key={f.id} className={i===active?'active':''} onClick={()=>choose(f)}>{f.path}</button>):<p>No matching files</p>}<small>Showing up to 60 matching paths</small></div>}</div>
 <nav className="breadcrumbs" aria-label="District path"><button onClick={()=>go('/')}>City overview</button>{district!=='/'&&<><span>/</span><button onClick={()=>go(parent(district))}>↑ Parent</button><span>/</span><strong>{district}</strong></>}</nav>
 <div className="view-info"><button onClick={()=>setDrawer(d=>!d)} aria-expanded={drawer}>☷ District navigator <span>{currentChildren.length}</span></button>{view?.aggregate&&<p>District overview · {view.descendantCount.toLocaleString()} files<br/><small>Neighborhood foundations are aggregates. Enter a district to reveal files.</small></p>}{currentChildren.length>512&&<p>First 512 district foundations shown. All {currentChildren.length.toLocaleString()} districts are accessible in the navigator.</p>}{(repo.submodules?.length??0)>0&&<p className="notice">{repo.submodules!.length} external submodules are listed on GitHub; their contents are not included.</p>}</div>
 {drawer&&<aside className="district-drawer"><div className="drawer-title"><span>EXPLORE / {district}</span><button aria-label="Close district navigator" onClick={()=>setDrawer(false)}>×</button></div><DistrictList key={district} districts={currentChildren} onNavigate={go}/><p className="muted">Use the file browser for all files in this directory.</p></aside>}
 <aside className="legend"><p className="eyebrow">MATERIAL PALETTE</p>{languages.map(([name,count])=><div key={name}><i style={{background:palette[name]}}/><span>{name}</span><small>{Math.round(count/repo.files.length*100)}%</small></div>)}<p className="legend-note">{view?.aggregate?'Aggregate height = file count':'Building height = file size'} · Gold roof = landmark</p></aside>
 {selected&&<aside className="inspector"><button className="close" onClick={()=>select(null)} aria-label="Close inspector">×</button><p className="eyebrow">{landmark(selected)?'REPOSITORY LANDMARK':'FILE / BUILDING'}</p><h2>{selected.name}</h2><p className="path">{selected.path}</p><dl><dt>Language</dt><dd>{selected.language}</dd><dt>File size</dt><dd>{bytes(selected.size)}</dd><dt>District</dt><dd><button className="inline-link" onClick={()=>go(selected.directory)}>{selected.directory} ↗</button></dd></dl>{landmark(selected)&&<p className="muted">Gold roofs identify README, package.json and Dockerfile by filename.</p>}<button onClick={()=>choose(selected)}>Focus building ↗</button><a href={fileUrl(repo,selected)} target="_blank" rel="noreferrer">Open file on GitHub ↗</a></aside>}
 {view&&view.pages>1&&<div className="pagination"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>←</button><span>File block {page+1} / {view.pages} · {view.directCount.toLocaleString()} direct files</span><button disabled={page+1===view.pages} onClick={()=>setPage(p=>p+1)}>→</button></div>}
 <nav className="tools" aria-label="City controls"><button onClick={()=>go('/')}>⌂ <span>Overview</span></button><button aria-pressed={labels} onClick={()=>setLabels(l=>!l)}>Aa <span>Labels</span></button><button aria-pressed={browser} onClick={()=>setBrowser(b=>!b)}>☷ <span>{browser?'3D city':'File browser'}</span></button><button onClick={()=>setSkip(true)}>» <span>Skip intro</span></button><button disabled={browser} onClick={()=>{setShot(true);setDrawer(false)}}>▣ <span>Present</span></button></nav>
 <div className="interaction-note">DRAG TO ORBIT <b>·</b> SCROLL TO ZOOM <b>·</b> RIGHT DRAG TO PAN <b>·</b> CLICK TO EXPLORE <b>·</b> H TO GO HOME</div></>}
 {shot&&<div className="screenshot-controls"><span>COMPOSITION / 16:9 PNG</span><button aria-pressed={tour} onClick={()=>setTour(t=>!t)}>{tour?'Pause tour':'Cinematic orbit'}</button><button onClick={()=>setCapture(c=>c+1)}>Download PNG ↓</button><button onClick={()=>{setShot(false);setTour(false)}}>Done</button></div>}
 {browser&&<FileBrowser key={district} directory={district} files={districtFiles} onSelect={choose}/>}
 </>}
 {loading&&<div className="loading" role="status"><span className="spinner"/><p>{loading}</p><small>A repository becomes a place.</small><button onClick={()=>{request.current?.abort();worker.current?.terminate();setLoading('')}}>Cancel</button></div>}
 {error&&<div className="error" role="alert"><strong>We couldn’t build this city.</strong><p>{error}</p><button onClick={()=>setError('')}>Dismiss</button></div>}
 <div className="announcement" role="status">{shareStatus}</div>
 {!repo&&<footer><span>01 — CODE, SEEN FROM ABOVE</span><span>BUILT FOR THE CURIOUS <b>↗</b></span></footer>}
 </main>
}
