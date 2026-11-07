export type NewsLead = { id:string; title:string; url:string; publisher:string; publisherId:string; publishedAt:string; description:string };
export type RadarIdea = { id:string; title:string; category:string; summary:string; whyNow:string; angle:string; checks:string[]; outline:string[]; sourceIds:string[]; captions:{instagram:string;tiktok:string;facebook:string;x:string}; compared?:{at:string;sourceIds:string[];unavailable:number} };
export type RadarSettings = { enabled:boolean; focus:string };
export type RadarState = { checkedAt:string; leads:NewsLead[]; ideas:RadarIdea[]; warnings:string[]; engine:'gemini'|'feeds-only'; leaseUntil?:number; leaseId?:string; lastAttempt?:number; error?:string };
export const emptyRadar:RadarState={checkedAt:'',leads:[],ideas:[],warnings:[],engine:'feeds-only'};
