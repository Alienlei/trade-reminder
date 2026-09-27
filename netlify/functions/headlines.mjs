import { isFresh, readNews, refreshNews } from './_lib/news.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=300, stale-while-revalidate=3300'
  }
});

export default async () => {
  try {
    const cached = await readNews();
    if (cached && isFresh(cached)) return json({ ...cached, cache: 'fresh' });

    try {
      const updated = await refreshNews();
      return json({ ...updated, cache: cached ? 'refreshed-stale' : 'refreshed' });
    } catch (err) {
      if (cached) return json({ ...cached, cache: 'stale-fallback', stale: true });
      return json({ updatedAt: null, headlines: [], error: String(err?.message || err) }, 503);
    }
  } catch (err) {
    return json({ updatedAt: null, headlines: [], error: String(err?.message || err) }, 500);
  }
};
