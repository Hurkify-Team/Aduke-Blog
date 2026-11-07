import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { radarSettings,refreshRadar } from '@/lib/news-radar';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(request:Request){
  const secret=process.env.CRON_SECRET,header=request.headers.get('authorization')||'';
  const expected=Buffer.from('Bearer '+(secret||'')),supplied=Buffer.from(header);
  if(!secret||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return NextResponse.json({error:'Unauthorised'},{status:401});
  if(!(await radarSettings()).enabled)return NextResponse.json({skipped:true,reason:'Daily checks disabled.'});
  try{const state=await refreshRadar();return NextResponse.json({ok:true,checkedAt:state.checkedAt,leads:state.leads.length,ideas:state.ideas.length,engine:state.engine});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Daily scan failed.'},{status:503});}
}
