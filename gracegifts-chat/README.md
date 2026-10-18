# Grace Gifts AI chat assistant

The chat window on gracegifts.co.za, connected to Claude so shoppers get real answers about
the actual products, prices and policies instead of canned replies.

```
Shopper's browser ──► Chat server (Cloudflare Worker) ──► Claude API
  theme chat window      holds the API key, reads the
                         live shop for products/pages
```

The theme can't call Claude directly: the API key would be visible to every visitor.
The Worker keeps it secret.

## What the assistant knows

Every 10 minutes the Worker re-reads the live shop:

- **Products**: names, prices, options/colours, descriptions and what's inside, from `/products.json`.
- **Occasions**: which collections have products, and which are "coming soon".
- **Pages**: About, Contact, FAQ, Delivery, Returns, How to pay, Track your order,
  Gift wrapping, Safety and care, Gift Club terms.

Change a price or a page in Shopify and the assistant picks it up within 10 minutes.
**It is only as accurate as your shop data.** If a product price is wrong in Shopify,
the assistant will quote the wrong price.

It also knows which page the shopper is on, so "is this one good for a newborn?" on a
product page is answered about that product.

It cannot see orders, payments or customer details. For anything about an existing order
it sends people to WhatsApp.

## Files

| Path | What it is |
|---|---|
| `src/worker.js` | The chat server: checks requests, asks Claude, returns the reply |
| `src/knowledge.js` | Reads products, collections and pages from the live shop |
| `theme/sections/grace-whatsapp.liquid` | The updated chat window for the Shopify theme |
| `dist/worker.js` | The server bundled into one file, for pasting into Cloudflare's dashboard |
| `test/` | Automated tests (`npm test`, and `node test/browser.mjs` for the chat window) |

## Setting it up

### 1. Get a Claude API key (about 5 minutes)

1. Sign in at <https://platform.claude.com>, add a payment method and buy a small amount of credit.
2. **Set a monthly spend limit** under Settings → Limits (for example $20). This is the
   real safety net against abuse or a bug running up a bill.
3. Create an API key under Settings → API keys. Copy it; you'll paste it in step 2.

### 2. Put the chat server online (about 10 minutes, free)

1. Create a free account at <https://dash.cloudflare.com>.
2. Go to **Workers & Pages → Create → Create Worker**, name it `gracegifts-chat`, and click **Deploy**.
3. Click **Edit code**, delete everything in the editor, paste the whole of `dist/worker.js`, and click **Deploy**.
4. Go to the Worker's **Settings → Variables and secrets** and add:
   - `ANTHROPIC_API_KEY`, type **Secret**, value: your key from step 1
5. Copy the Worker's address. It looks like `https://gracegifts-chat.<your-name>.workers.dev`.

(If you prefer the command line: `npm install`, `npx wrangler login`,
`npx wrangler secret put ANTHROPIC_API_KEY`, `npx wrangler deploy`.)

### 3. Update the theme (about 5 minutes)

1. Shopify admin → **Online Store → Themes** → **⋯ → Duplicate** your live theme (a backup).
2. On the live theme: **⋯ → Edit code** → open `sections/grace-whatsapp.liquid`, replace
   everything with `theme/sections/grace-whatsapp.liquid` from this folder, and **Save**.
3. **Customize** → click the chat section (**Chat assistant**) → paste the Worker address
   into **AI chat server address** → **Save**.
4. Optional: change the **Greeting** to something like
   "Hi! I can help you choose a gift, and answer questions about prices, delivery and returns."

### 4. Check it

Open the shop, click the chat button and ask "What's in the Full House basket?" You should get
the real contents and price. If you get a short generic answer instead, the server isn't
reachable: check the address in step 3 and the secret in step 2. Cloudflare's **Logs** tab for
the Worker shows each chat's token usage and any errors.

To switch the AI off at any time, clear the **AI chat server address** field. The chat goes back
to the free guided answers.

## Cost

It uses Claude Opus 5.5 at low effort. Your products and pages (roughly 8,000 tokens) are cached,
so the shop knowledge isn't paid for in full each time. A rough estimate is **US$0.01 to
US$0.05 per message**, depending on how busy the shop is. A slow month should cost a few
dollars. Watch the real figures in the Claude Console under Usage.

## Built-in protections

- Only answers requests from gracegifts.co.za (CORS origin check).
- 20 messages per visitor per 10 minutes, and 25 messages per chat session in the browser.
  The per-visitor count is kept in memory per Cloudflare instance, so treat it as a speed
  bump. Your spend limit from step 1 is the hard cap.
- Messages are capped at 500 characters, and only the last 12 messages are sent.
- If Claude is down or slow (over 30 seconds), the chat falls back to the guided answers.
- The assistant is told never to invent prices, stock, dates or policies. It has no access
  to orders and won't ask for card or ID numbers.

## Development

```
npm install
npm test                  # server tests (no API key needed; Claude is mocked)
node test/browser.mjs     # drives the chat window in Chromium against the real server code
npm run build             # rebuilds dist/worker.js after changing src/
```
