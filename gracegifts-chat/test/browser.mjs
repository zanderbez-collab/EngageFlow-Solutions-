// Browser test for theme/sections/grace-whatsapp.liquid: renders the section with a
// tiny Liquid stand-in, serves it next to the real Worker (pointed at a fake Claude
// API), and drives it in Chromium. Run: node test/browser.mjs
import http from 'node:http';
import fs from 'node:fs';
import { chromium } from 'playwright';
import worker from '../src/worker.js';
import { products, collections, pages } from './fixtures.js';

const liquid = fs.readFileSync(new URL('../theme/sections/grace-whatsapp.liquid', import.meta.url), 'utf8');

function render(endpoint) {
  const on = endpoint !== '';
  return liquid
    .replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/, '')
    .replace(/\{% assign n = [^%]*%\}\n?/, '')
    .replace(/\{%- assign occ = ''[\s\S]*?\{%- endfor -%\}\n?/, '')
    .replace(/\{% if section\.settings\.endpoint != blank %\}([\s\S]*?)(?:\{% else %\}([\s\S]*?))?\{% endif %\}/g, (_, a, b = '') => (on ? a : b))
    .replace(/\{\{ n \}\}/g, '27799796443')
    .replace("{{ section.settings.endpoint | escape }}", endpoint)
    .replace("{{ section.settings.greeting | escape }}", 'Hello! How can I help?')
    .replace("{{ occ | escape }}", 'Baby Showers|/collections/baby-showers;');
}
const page = (endpoint) => `<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<style>.wa{position:fixed;right:18px;bottom:18px;z-index:60}@media(max-width:800px){.wa{bottom:78px}}</style></head>
<body><main style="height:1200px"><h1>Test</h1></main>${render(endpoint)}</body></html>`;
for (const tag of ['{%', '{{']) if (render('x').includes(tag)) throw new Error(`unrendered Liquid: ${render('x').slice(render('x').indexOf(tag), render('x').indexOf(tag) + 80)}`);

// Fake Claude: answers by echoing the page context it was given, so we can see it arrive.
let claudeCalls = [];
let claudeFails = false;
const claude = http.createServer((req, res) => {
  let d = '';
  req.on('data', (c) => (d += c));
  req.on('end', () => {
    const body = JSON.parse(d);
    claudeCalls.push(body);
    if (claudeFails) return res.writeHead(500, { 'content-type': 'application/json' }).end('{"type":"error","error":{"type":"api_error","message":"boom"}}');
    const ctx = body.messages.at(-1).role === 'system' ? body.messages.at(-1).content : 'no page context';
    const text = `**AI answer** (${ctx}). The Budget Baby Basket is R899. /products/budget-baby-basket`;
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null, content: [{ type: 'text', text }], usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}).listen(0);
await new Promise((r) => claude.on('listening', r));

const realFetch = globalThis.fetch;
globalThis.fetch = (u, i) => {
  const url = new URL(String(u));
  if (url.host !== 'shop.test') return realFetch(u, i);
  if (url.pathname === '/products.json') return Promise.resolve(Response.json({ products }));
  if (url.pathname === '/collections.json') return Promise.resolve(Response.json({ collections }));
  const h = url.pathname.split('/')[2];
  return Promise.resolve(pages[h] ? new Response(pages[h]) : new Response('', { status: 404 }));
};

// One local server plays both the shop (pages) and the chat Worker (/chat).
const site = http.createServer(async (req, res) => {
  const origin = `http://localhost:${site.address().port}`;
  if (req.url.startsWith('/chat')) {
    let body = '';
    for await (const c of req) body += c;
    const r = await worker.fetch(new Request(origin + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }), {
      STORE_URL: 'https://shop.test', ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://127.0.0.1:${claude.address().port}`, ALLOWED_ORIGINS: origin,
    });
    res.writeHead(r.status, Object.fromEntries(r.headers)).end(await r.text());
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' }).end(page(req.url.includes('guided') ? '' : '/chat'));
}).listen(8766);
await new Promise((r) => site.on('listening', r));
const base = 'http://localhost:8766';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const errors = [];
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function open(path, viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + path);
  await p.click('#gcb');
  return { ctx, p };
}
async function ask(p, text) {
  const before = await p.locator('.gm.bot:not(.wait)').count();
  await p.fill('#gci', text);
  await p.press('#gci', 'Enter');
  await p.waitForFunction((n) => document.querySelectorAll('.gm.bot:not(.wait)').length > n, before, { timeout: 8000 });
  return p.locator('.gm.bot').last();
}

// ---- AI mode ----
{
  const { ctx, p } = await open('/products/full-house-baby-basket');
  check('AI mode shows AI notice', (await p.textContent('.gc__n')).includes('AI assistant'));
  check('AI mode shows extra quick replies', (await p.locator('#gcq button').first().textContent()) === 'Help me choose a gift');
  const a = await ask(p, 'Is this one good for a baby shower?');
  const txt = await a.innerText();
  check('AI reply shown', txt.includes('AI answer'), txt);
  check('markdown stripped', !txt.includes('**'), txt);
  check('page context reached Claude', txt.includes('Full House Baby Basket page'), txt);
  check('product link rendered', (await a.locator('a').last().getAttribute('href')) === '/products/budget-baby-basket' && (await a.locator('a').last().textContent()) === 'View product');
  const a2 = await ask(p, 'And the cheaper one?');
  const last = claudeCalls.at(-1).messages.filter((m) => m.role !== 'system');
  check('conversation history sent', last.length === 3 && last[0].content === 'Is this one good for a baby shower?', JSON.stringify(last.map((m) => m.role)));
  claudeFails = true;
  const a3 = await ask(p, 'How much is delivery?');
  check('falls back to guided answer when AI fails', (await a3.innerText()).includes('R120'), await a3.innerText());
  claudeFails = false;
  await p.keyboard.press('Escape');
  check('Escape closes and returns focus to button', !(await p.isVisible('#gc')) && (await p.evaluate(() => document.activeElement.id)) === 'gcb');
  await p.reload();
  await p.click('#gcb');
  check('history survives reload', (await p.locator('.gm').count()) === 6);
  await ctx.close();
}

// ---- Guided mode (no endpoint): the 28 questions from the fault check ----
const expect = {
  'Delivery': /R120/, 'Returns': /7 days/, 'Custom designs': /Customise/, 'Payments': /Yoco/, 'Gift wrapping': /gift wrapping/, 'Track my order': /tracking/,
  'Hi': /^Hello/, 'How much is the Full House basket?': /price/, "What's in the budget basket?": /exactly what is inside/, 'Do you have kitchen tea gifts?': /Baby Showers\. More occasions are coming soon/,
  'Do you do 21st birthday gifts?': /coming soon/, 'Can I pay by EFT?': /pay another way/, 'Can you deliver to Namibia?': /only within South Africa/, 'Do you have stock?': /price/,
  'Can I cancel my order?': /order number/, 'I want to speak to someone': /\+27799796443/, 'What are your opening hours?': /not sure/, 'Is the baby oil safe?': /safety/,
  'Can I get it by Friday?': /certain date/, 'Can I add a card with a message?': /200 characters/, 'Do you sell gift vouchers?': /vouchers/, 'Is there a discount?': /WELCOME5/,
  'My parcel arrived damaged': /6 months/, 'Can I collect in person?': /Krugersdorp/, 'Where are you based?': /Krugersdorp/, 'can i change the name on my order': /order number/,
  'Do you do corporate orders?': /not sure/, 'thanks': /pleasure/,
  'Where is my order?': /tracking/, 'Can I change my mind?': /7 days/, 'Is it high quality?': /not sure/, 'Pay by credit card?': /Yoco/,
};
{
  const { ctx, p } = await open('/guided');
  check('guided mode shows guided notice', (await p.textContent('.gc__n')).includes('Quick answers'));
  for (const [q, re] of Object.entries(expect)) {
    const t = await (await ask(p, q)).innerText();
    check(`guided: ${q}`, re.test(t), t.slice(0, 90));
  }
  await ctx.close();
}

// ---- Mobile layout ----
{
  const { ctx, p } = await open('/', { width: 375, height: 667 });
  const box = await p.locator('#gc').boundingBox();
  check('mobile panel fits screen', box.x >= 0 && box.x + box.width <= 375 && box.y >= 0, JSON.stringify(box));
  await p.screenshot({ path: process.env.SHOT || '/dev/null' });
  await ctx.close();
}

await browser.close();
site.close();
claude.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  -> ${r.detail}`}`);
console.log(`\n${results.length - failed.length}/${results.length} passed, ${errors.length} page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
process.exit(failed.length || errors.length ? 1 : 0);
