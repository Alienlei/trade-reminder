export default async () => new Response(JSON.stringify({
  testMode: process.env.TEST_MODE === 'true',
  testEntitlementMode: process.env.TEST_MODE === 'true' ? (process.env.TEST_ENTITLEMENT_MODE || 'all') : null,
  payhipBuyUrl: process.env.PAYHIP_BUY_URL || null,
  version: '2.2.1-clean'
}), {
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=60'
  }
});
