import { NextResponse } from 'next/server';
import { checkOrigin,currentUser } from '@/lib/auth';
import { limitedJson } from '@/lib/request';
import { radarSettings,radarState,refreshRadar,compareIdea } from '@/lib/news-radar';
import { readData,serialized,writeData } from '@/lib/store';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(){if(!await currentUser())return NextResponse.json({error:'Please sign in.'},{status:401});return NextResponse.json({settings:await radarSettings(),state:await radarState(),cronConfigured:!!process.env.CRON_SECRET},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
  const user=await currentUser();if(!user)return NextResponse.json({error:'Please sign in.'},{status:401});
  if(user.role==='author')return NextResponse.json({error:'An owner or editor can refresh and compare research sources.'},{status:403});
  try{
    checkOrigin(request);const input=await limitedJson(request,2048);
    if(input.action==='settings'){
      if(user.role!=='owner')return NextResponse.json({error:'Only the owner can change background settings.'},{status:403});
      if(typeof input.enabled!=='boolean'||typeof input.focus!=='string'||!input.focus.trim()||input.focus.length>300)throw new Error('Choose daily checks and enter a focus of up to 300 characters.');
      const settings={enabled:input.enabled,focus:input.focus.trim()};
      await serialized(()=>writeData('radar-settings.json',settings));
      return NextResponse.json({settings:await radarSettings(),state:await radarState(),cronConfigured:!!process.env.CRON_SECRET},{headers:{'Cache-Control':'no-store'}});
    }
    if(!['refresh','compare'].includes(String(input.action)))throw new Error('Invalid research action.');
    const allowed=await serialized(async()=>{let limit=await readData('radar-limit.json',{count:0,reset:0});if(limit.reset<Date.now())limit={count:0,reset:Date.now()+60*60*1000};if(limit.count>=12)return false;await writeData('radar-limit.json',{...limit,count:limit.count+1});return true;});
    if(!allowed)return NextResponse.json({error:'The hourly research limit was reached. Existing ideas remain available.'},{status:429});
    const state=input.action==='refresh'?await refreshRadar():typeof input.id==='string'?await compareIdea(input.id):null;
    if(!state)throw new Error('Choose an idea to compare.');
    return NextResponse.json({state,settings:await radarSettings(),cronConfigured:!!process.env.CRON_SECRET},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'News research could not finish. Try later.'},{status:400});}
}
