export type Article = { id: number; category: string; title: string; excerpt: string; time: string };
export const articles: Article[] = [
  { id: 1, category: 'Music', title: 'Wizkid hints at new album and fans go wild', excerpt: 'The Afrobeat icon drops a major hint that has set social media...', time: '5 hours ago' },
  { id: 2, category: 'Celebrities', title: 'Tems makes history with new global recognition', excerpt: 'The Grammy-winning star continues to break barriers and...', time: '8 hours ago' },
  { id: 3, category: 'Entertainment News', title: 'Davido’s latest single breaks multiple records', excerpt: 'The hit track has taken over streaming platforms worldwide...', time: '12 hours ago' },
];
export const featured = [
  { id: 4, category: 'Music', title: 'Tems continues to redefine global music with new milestone', time: '2 hours ago' },
  { id: 5, category: 'Celebrities', title: 'Davido’s latest move sparks massive reactions online', time: '4 hours ago' },
  { id: 6, category: 'Nollywood', title: 'Nollywood’s biggest premiere lights up Lagos', time: '6 hours ago' },
];
export const trending = ['Nollywood stars dazzle at AMVCA 2024', 'Top 10 viral entertainment moments this week', 'New Afrobeats artists to watch in 2024', 'Celebrity fashion hits from the weekend'];
export const editorials = [
  ['Conversations', 'Meet the voices behind the music and screen.', 'Explore Interviews', 'Interviews'],
  ['Music & Releases', 'New sounds, artist stories and releases to follow.', 'Explore Music', 'Music'],
  ['Lifestyle & Culture', 'Community, celebrations and the stories around us.', 'Read More', 'Lifestyle'],
  ['Videos', 'Discover our video stories and music coverage.', 'Explore Videos', 'Videos'],
];
