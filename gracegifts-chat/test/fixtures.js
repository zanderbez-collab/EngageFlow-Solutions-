// Snapshot of the live Grace Gifts catalogue (Oct 2026), shaped like Shopify's public /products.json.
const v = (titles, price) => titles.map((title) => ({ title, price, available: true }));
const one = (price) => [{ title: 'Default Title', price, available: true }];
const def = [{ name: 'Title', values: ['Default Title'] }];
const colours4 = ['Pink', 'Rust', 'Sage', 'Cream'];

export const products = [
  { title: 'Full House Baby Basket', handle: 'full-house-baby-basket', options: [{ name: 'Colour', values: colours4 }], variants: v(colours4, '1899.00'),
    body_html: "<p>The complete welcome for a new baby: bag, blankets, clothes, bath and care, all packed and wrapped beautifully. Pick the bag colour and we match the rest.</p><h2>What's inside</h2><ul>\n<li>Quilted baby bag with matching pouch</li>\n<li>Knitted swaddle blanket</li>\n<li>Fluffy dot blanket</li>\n<li>Two bear jumpsuits</li>\n<li>Two gauze burp cloths</li>\n<li>Johnson's Baby Oil 500ml</li>\n<li>Johnson's Baby Soap 100g</li>\n<li>Baby wipes, three packs of 80</li>\n<li>Hooded baby bath towel</li>\n</ul><p>Looking for something smaller? See our <a href=\"/products/budget-baby-basket\">Budget Baby Basket</a>.</p>" },
  { title: 'Budget Baby Basket', handle: 'budget-baby-basket', options: [{ name: 'Colour', values: colours4 }], variants: v(colours4, '899.00'),
    body_html: "<p>The essentials for a new baby, packed and wrapped beautifully at a friendly price.</p><h2>What's inside</h2><ul>\n<li>Quilted baby bag with matching pouch</li>\n<li>Knitted swaddle blanket</li>\n<li>Two gauze burp cloths</li>\n<li>Johnson's Baby Soap 100g</li>\n<li>Baby wipes, pack of 80</li>\n</ul>" },
  { title: 'Build Your Own Baby Basket', handle: 'build-your-own-baby-basket', options: [{ name: 'Size', values: ['Mini (4 items)', 'Classic (6 items)', 'Luxe (8 items)'] }],
    variants: v(['Mini (4 items)', 'Classic (6 items)', 'Luxe (8 items)'], '529.00'), body_html: '<p>Make it exactly right. Choose your basket, tick every item you want, pick the colours, and watch your total as you go.</p>' },
  { title: 'Personalised Baby Caddy Basket', handle: 'personalised-baby-caddy-basket', options: [{ name: 'Colour', values: ['White teddy', 'Light grey teddy', 'Brown teddy', 'Dark grey corduroy', 'White corduroy', 'Dark brown corduroy'] }],
    variants: v(['White teddy', 'Light grey teddy', 'Brown teddy', 'Dark grey corduroy', 'White corduroy', 'Dark brown corduroy'], '599.00'),
    body_html: '<p>A soft fabric caddy basket embroidered with a name of your choice.</p><p>Type the name you would like embroidered (up to 12 characters) &amp; choose a font.</p>' },
  { title: 'Quilted Baby Bag', handle: 'quilted-baby-bag', options: [{ name: 'Colour', values: colours4 }], variants: v(colours4, '529.00'), body_html: '<p>A roomy quilted baby bag with a matching zip pouch.</p>' },
  { title: 'Knitted Swaddle Blanket', handle: 'knitted-swaddle-blanket', options: [{ name: 'Colour', values: ['Grey', 'Pink', 'Beige', 'Blue', 'Cream'] }], variants: v(['Grey', 'Pink', 'Beige', 'Blue', 'Cream'], '279.00'), body_html: '<p>A soft knitted blanket.</p>' },
  { title: 'Fluffy Dot Blanket', handle: 'fluffy-dot-blanket', options: [{ name: 'Colour', values: ['Cream', 'Pink', 'Blue'] }], variants: v(['Cream', 'Pink', 'Blue'], '309.00'), body_html: '<p>A double-layer blanket.</p>' },
  { title: 'Bear Jumpsuits (2 pack)', handle: 'bear-jumpsuits-2-pack', options: [{ name: 'Style', values: ['Blue and white', 'Yellow and white'] }], variants: v(['Blue and white', 'Yellow and white'], '419.00'), body_html: '<p>Newborn up to about 9 months.</p>' },
  { title: 'Gauze Burp Cloths (2 pack)', handle: 'gauze-burp-cloths-2-pack', options: def, variants: one('79.00'), body_html: '<p>Two soft cotton gauze burp cloths.</p>' },
  { title: "Johnson's Baby Oil 500ml", handle: 'johnsons-baby-oil-500ml', options: def, variants: one('139.00'), body_html: '' },
  { title: "Johnson's Baby Soap 100g", handle: 'johnsons-baby-soap-100g', options: def, variants: one('25.00'), body_html: '' },
  { title: 'Baby Wipes (pack of 80)', handle: 'baby-wipes-pack-of-80', options: def, variants: one('35.00'), body_html: '' },
  { title: 'Hooded Baby Bath Towel', handle: 'hooded-baby-bath-towel', options: [{ name: 'Colour', values: ['Cream bear', 'Grey bear'] }], variants: v(['Cream bear', 'Grey bear'], '159.00'), body_html: '' },
  { title: 'Gift wrapping', handle: 'gift-wrapping', options: def, variants: one('45.00'), body_html: '<p>Have your gift beautifully wrapped.</p>' },
];

export const collections = [
  { title: 'Home page', handle: 'frontpage', products_count: 1 },
  { title: 'Baby Showers', handle: 'baby-showers', products_count: 6 },
  { title: 'Kitchen Teas', handle: 'kitchen-teas', products_count: 0 },
  { title: 'Bridal Parties', handle: 'bridal-parties', products_count: 0 },
  { title: 'House Warming', handle: 'house-warming', products_count: 0 },
  { title: 'Big Birthdays', handle: 'big-birthdays', products_count: 0 },
  { title: 'Build items', handle: 'build-items', products_count: 9 },
];

// What /pages/<handle>?section_id=main returns: the grace-page section markup.
const section = (title, html) =>
  `<div id="shopify-section-main" class="shopify-section"><section class='sec'><div class='wrap narrow'>\n<h1 class='sec__h'>${title}</h1>\n<div class='rv pgc'>${html}</div>\n</div></section></div>`;

export const pages = {
  delivery: section('Delivery', '<h2>What delivery costs</h2><p>Delivery is a flat rate of <b>R120</b> anywhere in South Africa. Delivery is <b>free on orders over R1,500</b>.</p><h2>Made to order</h2><p>Please allow <b>10 to 15 business days</b>.</p>'),
  returns: section('Returns and refunds', '<h2>2. Return period</h2><p>If you have changed your mind, you have 7 days from the day you receive your order.</p>'),
  contact: section('Contact', "<p><b>Phone and WhatsApp:</b> <a href=\"https://wa.me/27799796443\">+27 79 979 6443</a><br><b>Address:</b> 169 Dublin Street, Krugersdorp</p><form method='post'><input name='contact[name]'><textarea name='contact[body]'></textarea></form>"),
  faq: `<div id="shopify-section-main"><section class='sec'><h1>Frequently asked questions</h1><div class='fq'><details><summary>Can I add a personal message?</summary><div class='a'><p>Yes. Each product page has a gift message box for up to 200 characters.</p></div></details></div></section><script type='application/ld+json'>{"@type":"FAQPage"}</script></div>`,
};
