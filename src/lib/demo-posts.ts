import { articles, featured, trending } from '@/data/homepage';
import { Post, slugify } from '@/types/post';
const source = [...articles, ...featured, ...trending.map((title, i) => ({ id: i + 10, title, category: 'Entertainment News', time: '' })), { id: 99, title: 'The Sound, The Stars, The Stories. Blog feature', category: 'Music', time: '' }];
export const demoPosts: Post[] = source.map(a => ({
  id: `demo-${a.id}`, slug: slugify(a.title), title: a.title, category: a.category,
  excerpt: 'This is a demonstration article showing the Aduke Radio Blog reading experience.',
  body: 'This headline comes from the approved homepage design. It is demonstration content and should not be treated as verified reporting.\n\n## Your front-row seat to entertainment\n\nReal articles published from the owner dashboard appear here with your own words, images and author details. The homepage links directly to each published story.\n\n## Music, culture and the stories behind them\n\nUse the editor to write your introduction, add section headings and develop the full story. This sample intentionally contains no invented claims about the people named in the design.',
  author: 'Aduke Editorial Preview', cover: '', coverAlt: '', video: '', status: 'published', featured: a.id === 99, trending: a.id >= 10 && a.id < 20,
  createdAt: '2026-10-17T12:00:00.000Z', updatedAt: '2026-10-17T12:00:00.000Z', publishedAt: '2026-10-17T12:00:00.000Z', demo: true,
}));
