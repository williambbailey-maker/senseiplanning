import type { VercelRequest, VercelResponse } from '@vercel/node';
import { route } from './_lib/http.js';
import { clearedCookie } from './_lib/session.js';

export default route(
  {
    POST: async (_req: VercelRequest, res: VercelResponse) => {
      res.setHeader('Set-Cookie', clearedCookie());
      return { ok: true };
    },
  },
  { auth: false },
);
