export type NewsLead = { id:string; title:string; url:string; publisher:string; publisherId:string; publishedAt:string; description:string };
export type RadarIdea = { id:string; title:string; category:string; summary:string; whyNow:string; angle:string; checks:string[]; outline:string[]; sourceIds:string[]; captions:{instagram:string;tiktok:string;facebook:string;x:string}; compared?:{at:string;sourceIds:string[];unavailable:number} };
export type RadarSettings = { enabled:boolean; focus:string };
export type RadarState = { checkedAt:string; leads:NewsLead[]; ideas:RadarIdea[]; warnings:string[]; engine:'gemini'|'feeds-only'; leaseUntil?:number; leaseId?:string; lastAttempt?:number; error?:string };
export const emptyRadar:RadarState={checkedAt:'',leads:[],ideas:[],warnings:[],engine:'feeds-only'};

export type NewsRegion='nigeria'|'foreign'|'unclassified';
// Classify the subject of the story, not the publisher's home country.
export function newsRegion(lead:Pick<NewsLead,'title'|'description'>):NewsRegion {
 const text=lead.title+' '+lead.description;
 if(/\b(nigeria(?:n)?|lagos|abuja|ogun|oyo|ibadan|kwara|kaduna|kano|enugu|anambra|ondo|osun|ekiti|akwa ibom|rivers state|borno|sokoto|zamfara|plateau state|benue|bayelsa|delta state|edo state|imo state|abia|ebonyi|kogi|nasarawa|adamawa|bauchi|gombe|jigawa|katsina|kebbi|niger state|taraba|yobe|fct|nollywood|tinubu|super eagles|super falcons|naira|wizkid|davido|burna boy|olamide|tems|ayra starr|funke akindele|adunni ade)\b|\u20a6/i.test(text))return 'nigeria';
 if(/\b(ghana(?:ian)?|kenya(?:n)?|south africa(?:n)?|uganda(?:n)?|tanzania(?:n)?|ethiopia(?:n)?|sudan(?:ese)?|congo|cameroon|senegal|egypt|morocco|united states|america(?:n)?|united kingdom|brit(?:ain|ish)|england|scotland|wales|london|france|french|germany|german|spain|spanish|italy|italian|portugal|china|chinese|japan|india(?:n)?|pakistan|israel|gaza|palestin(?:e|ian)|ukraine|russia(?:n)?|brazil|argentina|australia(?:n)?|canada|trump|premier league|manchester|liverpool|arsenal|chelsea|barcelona|real madrid|bundesliga|la liga|nba|nfl|hollywood)\b/i.test(text))return 'foreign';
 return 'unclassified';
}
export function ideaRegion(idea:RadarIdea,leads:NewsLead[]):NewsRegion{const direct=newsRegion({title:idea.title,description:idea.summary});if(direct!=='unclassified')return direct;const regions=idea.sourceIds.map(id=>leads.find(lead=>lead.id===id)).filter((lead):lead is NewsLead=>!!lead).map(newsRegion);return regions.length&&regions.every(region=>region===regions[0])?regions[0]:'unclassified';}
