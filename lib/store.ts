import {create} from 'zustand';
import {FileNode} from './model';
export const useCity=create<{selected:FileNode|null;focus:string|null;select:(f:FileNode|null,focus?:boolean)=>void}>(set=>({selected:null,focus:null,select:(f,focus=false)=>set({selected:f,...(focus?{focus:f?.id??null}:{})})}));
