// Builds the store knowledge the assistant answers from, straight from the live
// shop: products and collections from Shopify's public JSON endpoints, policy
// pages through the Section Rendering API. Cached per Worker instance so most
// chats reuse the same text (which also keeps the prompt cache warm).

const PAGE_HANDLES = [
  'about',
  'contact',
  'faq',
  'delivery',
  'returns',
  'how-to-pay',
  'track-your-order',
  'gift-wrapping-and-messages',
  'safety-and-care',
  'gift-club-terms',
];

// Collections that exist for theme plumbing, not for shoppers.
const HIDDEN_COLLECTIONS = new Set(['frontpage', 'build-items']);

const TTL_MS = 10 * 60 * 1000;
let cached = null;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', rarr: '→', ndash: '–', mdash: '—' };

export function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `${text} (${href})`)
    .replace(/<(br|\/p|\/li|\/h\d|\/summary|\/details|\/div)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<summary\b[^>]*>/gi, '\nQ: ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatRand(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `R${amount}`;
  const whole = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return `R${whole}`;
}

function describeProduct(p) {
  const prices = [...new Set((p.variants || []).map((v) => Number(v.price)))].sort((a, b) => a - b);
  const price = prices.length > 1 ? `${formatRand(prices[0])} to ${formatRand(prices.at(-1))}` : formatRand(prices[0]);
  const available = (p.variants || []).some((v) => v.available);
  const options = (p.options || [])
    .filter((o) => !(o.name === 'Title' && o.values?.length === 1))
    .map((o) => `${o.name}: ${o.values.join(', ')}`)
    .join('; ');
  const variantPrices =
    prices.length > 1 ? `\n  Prices by option: ${p.variants.map((v) => `${v.title} ${formatRand(v.price)}`).join(', ')}` : '';
  const desc = htmlToText(p.body_html).slice(0, 1500);
  return [
    `- ${p.title} (/products/${p.handle}) — ${price}${available ? '' : ' — currently unavailable'}`,
    options ? `\n  Options: ${options}` : '',
    variantPrices,
    desc ? `\n  Details: ${desc.replace(/\n+/g, ' ')}` : '',
  ].join('');
}

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function getPageText(fetchImpl, storeUrl, handle) {
  try {
    const res = await fetchImpl(`${storeUrl}/pages/${handle}?section_id=main`);
    if (!res.ok) return null;
    const text = htmlToText(await res.text());
    return text ? `### /pages/${handle}\n${text}` : null;
  } catch {
    return null;
  }
}

export async function buildKnowledge(storeUrl, fetchImpl = fetch) {
  const [productsRes, collectionsRes, ...pages] = await Promise.all([
    getJson(fetchImpl, `${storeUrl}/products.json?limit=250`),
    getJson(fetchImpl, `${storeUrl}/collections.json?limit=250`).catch(() => ({ collections: [] })),
    ...PAGE_HANDLES.map((h) => getPageText(fetchImpl, storeUrl, h)),
  ]);

  const products = productsRes.products || [];
  const collections = (collectionsRes.collections || []).filter((c) => !HIDDEN_COLLECTIONS.has(c.handle));
  const live = collections.filter((c) => c.products_count > 0);
  const empty = collections.filter((c) => c.products_count === 0);

  const text = [
    '## Occasions (collections)',
    live.length ? live.map((c) => `- ${c.title} (/collections/${c.handle}): ${c.products_count} products`).join('\n') : '- (none listed)',
    empty.length ? `Coming soon, no products yet: ${empty.map((c) => c.title).join(', ')}` : '',
    '',
    `## Products (${products.length}, prices in South African rand)`,
    products.map(describeProduct).join('\n'),
    '',
    '## Shop pages',
    pages.filter(Boolean).join('\n\n'),
  ].join('\n');

  return {
    text,
    productTitles: new Map(products.map((p) => [p.handle, p.title])),
    collectionTitles: new Map(collections.map((c) => [c.handle, c.title])),
  };
}

export async function getKnowledge(storeUrl, fetchImpl = fetch, now = Date.now()) {
  if (cached && cached.storeUrl === storeUrl && now - cached.at < TTL_MS) return cached.value;
  try {
    const value = await buildKnowledge(storeUrl, fetchImpl);
    cached = { storeUrl, at: now, value };
    return value;
  } catch (err) {
    // Serve stale knowledge rather than failing the chat if the shop blips.
    if (cached && cached.storeUrl === storeUrl) return cached.value;
    throw err;
  }
}

export function resetKnowledgeCache() {
  cached = null;
}
