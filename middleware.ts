// Vercel Routing Middleware: password gate for every route except login and static shell files.
import { readCookie, verifySession } from './api/_lib/session.js';

const PUBLIC_PATHS = new Set([
  '/login',
  '/index.html', // the app shell has no data; the SW precaches it
  '/api/login',
  '/manifest.webmanifest',
  '/sw.js',
  '/registerSW.js',
  '/robots.txt',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
]);
const PUBLIC_PREFIXES = ['/assets/', '/icons/', '/workbox-'];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (isPublic(url.pathname)) return undefined;

  if (await verifySession(process.env.PLAN_SECRET, readCookie(request.headers.get('cookie')))) return undefined;

  const headers = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
  const login = new URL('/login', url);
  if (url.pathname !== '/') login.searchParams.set('next', url.pathname + url.search);
  return new Response(null, { status: 302, headers: { ...headers, Location: login.toString() } });
}
