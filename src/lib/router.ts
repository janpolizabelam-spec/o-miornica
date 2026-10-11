import { useEffect, useState } from 'react';

export type Route =
  | { name: 'editor'; id: string | null }
  | { name: 'list' }
  | { name: 'compare'; a: string | null; b: string | null };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  if (parts[0] === 'scenariusze') return { name: 'list' };
  if (parts[0] === 'porownanie') return { name: 'compare', a: params.get('a'), b: params.get('b') };
  if (parts[0] === 'edytor' && parts[1]) return { name: 'editor', id: decodeURIComponent(parts[1]) };
  return { name: 'editor', id: null };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'list':
      return '#/scenariusze';
    case 'compare': {
      const p = new URLSearchParams();
      if (r.a) p.set('a', r.a);
      if (r.b) p.set('b', r.b);
      const q = p.toString();
      return `#/porownanie${q ? `?${q}` : ''}`;
    }
    case 'editor':
      return r.id ? `#/edytor/${encodeURIComponent(r.id)}` : '#/edytor';
  }
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}
