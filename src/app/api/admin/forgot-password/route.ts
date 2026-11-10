import { after,NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/auth';
import { limitedJson } from '@/lib/request';
import { emailRecoveryConfigured,normalEmail,requestOwnerRecovery } from '@/lib/recovery-email';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
  try{
    checkOrigin(request);const input=await limitedJson(request,1024);
    const email=normalEmail(input.email);if(!email)return NextResponse.json({error:'Enter a valid email address.'},{status:400});
    if(!emailRecoveryConfigured())return NextResponse.json({error:'Owner email recovery is not configured yet. Contact the site administrator or use your private recovery link.'},{status:503});
    // Queue every valid address identically: delivery time must not reveal which address is the owner.
    after(async()=>{try{await requestOwnerRecovery(email);}catch{console.error('Owner email recovery request could not complete.');}});
    return NextResponse.json({message:'If this email matches the owner recovery address, a reset link will be sent. Check your inbox and spam folder. Please wait five minutes before requesting another link.'},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Recovery is temporarily unavailable.'},{status:400});}
}
