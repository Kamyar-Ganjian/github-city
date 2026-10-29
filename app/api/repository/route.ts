import {NextRequest,NextResponse} from 'next/server';
import {GitHubError,loadRepository} from '@/lib/github';
export async function GET(request:NextRequest){try{return NextResponse.json(await loadRepository(request.nextUrl.searchParams.get('q')??'',fetch,request.signal),{headers:{'Cache-Control':'public, max-age=120, s-maxage=300'}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load repository.'},{status:error instanceof GitHubError?error.status:400})}}
