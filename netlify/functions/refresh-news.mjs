import { refreshNews } from './_lib/news.mjs';

export default async () => {
  try {
    const result = await refreshNews();
    return new Response(JSON.stringify({ ok: true, updatedAt: result.updatedAt }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
};

export const config = { schedule: '0 * * * *' };
