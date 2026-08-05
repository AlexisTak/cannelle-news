export type ClaimStatus="draft"|"ai_reviewed"|"human_reviewed"|"published";
export type Verdict="unverified"|"true"|"mostly_true"|"mixed"|"mostly_false"|"false";
export interface Claim{id:string;contentId?:string;text:string;status:ClaimStatus;verdict:Verdict;confidence:number;rationale:string;createdAt:string;updatedAt:string}
export interface Source{id:string;claimId:string;url:string;title:string;publisher:string;publishedAt?:string;stance:"supports"|"contradicts"|"context";createdAt:string}
export function clampConfidence(value:number):number{return Math.round(Math.max(0,Math.min(100,value)));}
export function canPublish(claim:Claim,sourceCount:number,minimumSources:number):boolean{return claim.status==="human_reviewed"&&claim.verdict!=="unverified"&&claim.rationale.trim().length>=10&&sourceCount>=minimumSources;}
export function sourceDiversity(sources:Source[]):number{return new Set(sources.map(x=>{try{return new URL(x.url).hostname.replace(/^www\./,"");}catch{return x.publisher.trim().toLowerCase();}}).filter(Boolean)).size;}
