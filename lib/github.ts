import {normalize,parseRepository,Repository} from './model';
export class GitHubError extends Error {constructor(message:string,public status=400){super(message)}}
export async function loadRepository(input:string,request:typeof fetch=fetch):Promise<Repository>{
 const {owner,name}=parseRepository(input);const headers:Record<string,string>={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 async function get(path:string){let response:Response;try{response=await request('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name)+path,{headers,signal:AbortSignal.timeout(25000)})}catch{throw new GitHubError('GitHub could not be reached. Check your connection and try again.',502)}
 if(!response.ok){if(response.status===404)throw new GitHubError('Repository not found. Check the spelling and make sure it is public.',404);if(response.status===403||response.status===429)throw new GitHubError('GitHub request limit reached. Try again later, or configure a server-side GITHUB_TOKEN.',429);if(response.status===409)throw new GitHubError('This repository is empty. Try a repository containing files.');throw new GitHubError('GitHub is temporarily unavailable. Please try again.',502)}return response.json()}
 const metadata=await get('');const tree=await get('/git/trees/'+encodeURIComponent(metadata.default_branch)+'?recursive=1');
 if(tree.truncated)throw new GitHubError('GitHub returned an incomplete tree. This city cannot be built faithfully. Try a smaller repository.',422);
 if(tree.tree?.some((n:{type:string})=>n.type==='commit'))throw new GitHubError('This repository contains submodules. Their files are outside this tree; choose a repository without submodules for a complete city.',422);
 const files=normalize(tree.tree);if(!files.length)throw new GitHubError('This repository has no files to visualize.');if(files.length>20000)throw new GitHubError('This repository exceeds the 20,000 file limit. Choose a smaller repository; no partial city has been generated.',422);
 return {owner:metadata.owner.login,name:metadata.name,branch:metadata.default_branch,description:metadata.description??'',stars:metadata.stargazers_count,files};
}
