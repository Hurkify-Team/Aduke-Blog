import RecoverOwner from '@/components/RecoverOwner';
export const metadata={title:'Reset team password',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function TeamRecoverPage(){return <RecoverOwner account="team"/>;}
