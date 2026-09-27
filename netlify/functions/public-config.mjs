export default async () => new Response(JSON.stringify({
  testMode: process.env.TEST_MODE === 'true',
  version: '2.2.1'
}), {
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=300'
  }
});
