/** Stały kolor dla danej kategorii — ten sam w każdym wykresie i scenariuszu. */
const PREDEFINED: Record<string, string> = {
  facebook: '#3b6fd8',
  instagram: '#c2408b',
  tiktok: '#1a9e8f',
  linkedin: '#d98e04',
  youtube: '#d64545',
  x: '#6b7686',
  pinterest: '#8a5cd1',
};

const EXTRA = ['#2e9e5b', '#b5651d', '#4aa3df', '#e07b39', '#6b8e23', '#c76b98', '#7a7fd6', '#3f8f8a', '#a8873a'];

export function categoryColor(name: string): string {
  const key = name.trim().toLocaleLowerCase('pl');
  if (PREDEFINED[key]) return PREDEFINED[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return EXTRA[h % EXTRA.length];
}

export const PREDEFINED_CATEGORIES = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Pinterest'];

export const UNALLOCATED_COLOR = '#c9ced6';
