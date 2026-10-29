import {create} from 'zustand';
import {FileNode} from './model';
interface State {selected:FileNode|null;focus:string|null;district:string;revision:number;page:number;setPage:(value:number|((p:number)=>number))=>void;select:(f:FileNode|null,focus?:boolean)=>void;navigate:(path:string)=>void}
export const useCity=create<State>(set=>({selected:null,focus:null,district:'/',revision:0,page:0,setPage:value=>set(s=>({page:typeof value==='function'?value(s.page):value})),select:(f,focus=false)=>set(s=>({selected:f,...(focus?{focus:f?.id??null,district:f?.directory??'/',revision:s.revision+1}:{})})),navigate:district=>set(s=>({district,selected:null,focus:null,page:0,revision:s.revision+1}))}));
