import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  createContext,
  useContext,
  useRef,
} from 'react';

// ─── STRUCTURED LOGGER ────────────────────────────────────────────────────────
const LEVEL_CSS = {
  info: 'color:#60a5fa;font-weight:600',
  warn: 'color:#fbbf24;font-weight:600',
  error: 'color:#f87171;font-weight:700',
  debug: 'color:#a78bfa;font-weight:500',
  success: 'color:#34d399;font-weight:700',
};
const TS_CSS = 'color:#475569;font-size:10px';

function makeLogger(service) {
  const ts = () => new Date().toISOString().replace('T', ' ').slice(0, -5);
  const emit = (level, msg, payload) => {
    const prefix = `%c[${service}]%c ${msg} %c${ts()}`;
    const styles = [LEVEL_CSS[level], 'color:inherit;font-weight:400', TS_CSS];
    if (payload !== undefined) {
      console.groupCollapsed(prefix, ...styles);
      console.log('%cPayload', 'color:#64748b', payload);
      console.groupEnd();
    } else {
      console.log(prefix, ...styles);
    }
  };
  return {
    info: (m, p) => emit('info', m, p),
    warn: (m, p) => emit('warn', m, p),
    error: (m, p) => emit('error', m, p),
    debug: (m, p) => emit('debug', m, p),
    success: (m, p) => emit('success', m, p),
  };
}

const cartLog = makeLogger('CartService');
const wishLog = makeLogger('WishlistService');
const filterLog = makeLogger('FilterEngine');
const checkoutLog = makeLogger('CheckoutPipeline');
const invLog = makeLogger('InventoryService');
const authLog = makeLogger('AuthService');

// ─── COUPON REGISTRY ──────────────────────────────────────────────────────────
const COUPONS = {
  FIRST20: {
    code: 'FIRST20',
    discountType: 'percent',
    value: 20,
    maxDiscount: 300,
    minOrder: 499,
  },
  FESTIVE10: {
    code: 'FESTIVE10',
    discountType: 'percent',
    value: 10,
    maxDiscount: 500,
    minOrder: 999,
  },
  FLAT150: { code: 'FLAT150', discountType: 'flat', value: 150, minOrder: 799 },
  WELCOME50: { code: 'WELCOME50', discountType: 'flat', value: 50 },
  SOLE200: {
    code: 'SOLE200',
    discountType: 'flat',
    value: 200,
    minOrder: 4999,
  },
};

function validateCoupon(code, total) {
  const c = COUPONS[code.toUpperCase().trim()];
  if (!c) return { ok: false, error: 'Coupon not found or expired' };
  if (c.minOrder && total < c.minOrder)
    return { ok: false, error: `Min order ₹${c.minOrder} required` };
  return { ok: true, coupon: c };
}

function applyCouponDiscount(coupon, subtotal) {
  if (coupon.discountType === 'flat') return Math.min(coupon.value, subtotal);
  const pct = (subtotal * coupon.value) / 100;
  return coupon.maxDiscount ? Math.min(pct, coupon.maxDiscount) : pct;
}

// ─── IMAGE HELPER ─────────────────────────────────────────────────────────────
const U = (id, w = 600, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const FREE_DELIVERY_THRESHOLD = 499;

// ─── INVENTORY ────────────────────────────────────────────────────────────────
// Apparel carried over from the original catalog + 15 new footwear & clothing entries.
// Shoe sizes expressed as UK sizing strings; apparel uses the usual XS–XXL or waist bands.
const INVENTORY = [
  // ── Women's Ethnic ──────────────────────────────────────────────────────────
  {
    id: 'W-ETH-KRTI-01',
    name: 'Libas Floral Straight Kurti',
    brand: 'Libas',
    description:
      'Breathable rayon with block-print florals. Machine washable. Ships with matching dupatta.',
    gender: 'women',
    category: 'kurti',
    tags: ['ethnic', 'rayon', 'casual'],
    mrp: 1699,
    sellingPrice: 899,
    discountPct: 47,
    gstRate: 0.05,
    images: [
      U('1583391153254-8a5a9a2b8a0d'),
      U('1610030469983-98e550d6193c'),
      U('1595777457583-95e059d581b8'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    stock: { XS: 4, S: 7, M: 2, L: 0, XL: 5, XXL: 1 },
    rating: 4.3,
    reviewCount: 2841,
    isFeatured: true,
    material: 'Rayon',
    fit: 'Straight',
  },
  {
    id: 'W-ETH-KRTI-02',
    name: 'BIBA Anarkali Embroidered Kurti',
    brand: 'BIBA',
    description:
      'Chanderi silk with zari embroidery on yoke. Flared hem, 3/4 sleeves.',
    gender: 'women',
    category: 'kurti',
    tags: ['ethnic', 'chanderi', 'anarkali'],
    mrp: 3499,
    sellingPrice: 1799,
    discountPct: 49,
    gstRate: 0.05,
    images: [
      U('1624204386084-79b5a5e32fb7'),
      U('1583391153254-8a5a9a2b8a0d'),
      U('1610030469983-98e550d6193c'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 0, S: 3, M: 8, L: 6, XL: 2 },
    rating: 4.5,
    reviewCount: 1204,
    material: 'Chanderi Silk',
    fit: 'Flared',
  },
  {
    id: 'W-ETH-KRTI-03',
    name: 'Libas Cotton Ikat A-Line Kurti',
    brand: 'Libas',
    description:
      'Handloom ikat weave in pure cotton. Side slits, round neck with contrast piping.',
    gender: 'women',
    category: 'kurti',
    tags: ['ethnic', 'ikat', 'handloom'],
    mrp: 1299,
    sellingPrice: 749,
    discountPct: 42,
    gstRate: 0.05,
    images: [
      U('1595777457583-95e059d581b8'),
      U('1583391153254-8a5a9a2b8a0d'),
      U('1624204386084-79b5a5e32fb7'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    stock: { XS: 3, S: 9, M: 14, L: 7, XL: 4, XXL: 2 },
    rating: 4.2,
    reviewCount: 893,
    isNewArrival: true,
    material: 'Pure Cotton',
    fit: 'A-Line',
  },
  {
    id: 'W-ETH-SREE-01',
    name: 'Taneira Kanjivaram Pure Silk Saree',
    brand: 'Taneira',
    description:
      'Handwoven Kanjivaram with temple border and zari pallav. 5.5m length, unstitched blouse piece included.',
    gender: 'women',
    category: 'saree',
    tags: ['silk', 'wedding', 'traditional'],
    mrp: 18999,
    sellingPrice: 14499,
    discountPct: 24,
    gstRate: 0.05,
    images: [
      U('1558618666-fcd25c85cd64'),
      U('1609767742140-3a00d3c29e9b'),
      U('1570655652364-2e0a67455ac6'),
    ],
    sizes: ['Free Size'],
    stock: { 'Free Size': 8 },
    rating: 4.7,
    reviewCount: 387,
    isFeatured: true,
    material: 'Pure Silk',
  },
  {
    id: 'W-ETH-LHNG-01',
    name: 'KALKI Bridal Lehenga Choli Set',
    brand: 'KALKI Fashion',
    description:
      'Heavy dupion silk with kundan embroidery. Includes matching choli and heavily embroidered dupatta.',
    gender: 'women',
    category: 'lehenga',
    tags: ['bridal', 'silk', 'festive'],
    mrp: 34999,
    sellingPrice: 24999,
    discountPct: 29,
    gstRate: 0.12,
    images: [
      U('1610030469983-98e550d6193c'),
      U('1624204386084-79b5a5e32fb7'),
      U('1583391153254-8a5a9a2b8a0d'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 1, S: 2, M: 3, L: 1, XL: 0 },
    rating: 4.8,
    reviewCount: 156,
    isFeatured: true,
    material: 'Dupion Silk',
  },
  {
    id: 'W-ETH-BIBA-SUIT-01',
    name: 'BIBA Georgette Printed Suit Set',
    brand: 'BIBA',
    description:
      'Three-piece set in lightweight georgette. Digital floral print. Includes kurta, palazzo, and dupatta.',
    gender: 'women',
    category: 'kurti',
    tags: ['ethnic', 'georgette', 'suit-set'],
    mrp: 4299,
    sellingPrice: 2199,
    discountPct: 49,
    gstRate: 0.05,
    images: [
      U('1624204386084-79b5a5e32fb7'),
      U('1595777457583-95e059d581b8'),
      U('1583391153254-8a5a9a2b8a0d'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    stock: { XS: 2, S: 6, M: 11, L: 8, XL: 3, XXL: 1 },
    rating: 4.4,
    reviewCount: 2107,
    isNewArrival: true,
    material: 'Georgette',
    fit: 'Flared',
  },

  // ── Women's Western ──────────────────────────────────────────────────────────
  {
    id: 'W-WST-FTOP-01',
    name: 'H&M Ruffle-Sleeve Fusion Top',
    brand: 'H&M',
    description:
      'Contemporary Indo-western crop top in viscose crepe. Pairs effortlessly with palazzo or high-waist jeans.',
    gender: 'women',
    category: 'fusion-top',
    tags: ['fusion', 'casual', 'crop'],
    mrp: 1499,
    sellingPrice: 799,
    discountPct: 47,
    gstRate: 0.05,
    images: [
      U('1515886657613-9f3515b0c78f'),
      U('1469334031218-e382a71b716b'),
      U('1581044777550-4cfa5c26c4e8'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 6, S: 12, M: 9, L: 4, XL: 0 },
    rating: 4.0,
    reviewCount: 3201,
    isNewArrival: true,
    material: 'Viscose Crepe',
    fit: 'Crop',
  },
  {
    id: 'W-WST-ZARA-BLAZ-01',
    name: 'Zara Tailored Linen-Blend Blazer',
    brand: 'Zara',
    description:
      'Structured single-breasted blazer in linen-viscose. Padded shoulders, two-button front, interior welt pocket.',
    gender: 'women',
    category: 'fusion-top',
    tags: ['blazer', 'linen', 'office-wear'],
    mrp: 5999,
    sellingPrice: 3799,
    discountPct: 37,
    gstRate: 0.12,
    images: [
      U('1469334031218-e382a71b716b'),
      U('1515886657613-9f3515b0c78f'),
      U('1581044777550-4cfa5c26c4e8'),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 3, S: 5, M: 7, L: 4, XL: 2 },
    rating: 4.5,
    reviewCount: 678,
    isFeatured: true,
    material: 'Linen-Viscose',
    fit: 'Tailored',
  },
  {
    id: 'W-WST-DNIM-01',
    name: "Levi's 711 Skinny Jeans",
    brand: "Levi's",
    description:
      'Mid-rise skinny in 4-way stretch denim. Classic 5-pocket design, zip fly. Runs true to size.',
    gender: 'women',
    category: 'denim',
    tags: ['jeans', 'denim', 'skinny'],
    mrp: 3999,
    sellingPrice: 2399,
    discountPct: 40,
    gstRate: 0.12,
    images: [
      U('1541099649105-f69ad21f3246'),
      U('1542574271-7f3b92e6c821'),
      U('1594938298870-7c60c4f3a2f7'),
    ],
    sizes: ['28', '30', '32', '34'],
    stock: { 28: 5, 30: 8, 32: 3, 34: 1 },
    rating: 4.4,
    reviewCount: 5621,
    material: 'Stretch Denim',
    fit: 'Skinny',
  },

  // ── Men's Formal ─────────────────────────────────────────────────────────────
  {
    id: 'M-FRM-SHRT-01',
    name: 'Peter England Slim-Fit Formal Shirt',
    brand: 'Peter England',
    description:
      'Cotton-rich poplin, solid navy. Anti-crease finish, easy iron. Machine washable at 30°C.',
    gender: 'men',
    category: 'shirt',
    tags: ['formal', 'slim-fit', 'office'],
    mrp: 1899,
    sellingPrice: 999,
    discountPct: 47,
    gstRate: 0.12,
    images: [
      U('1598300042247-d088f8ab3a91'),
      U('1506794778202-cad84cf45f1d'),
      U('1617196034183-421b4040ed20'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 4, M: 1, L: 9, XL: 7, XXL: 3 },
    rating: 4.2,
    reviewCount: 8102,
    material: 'Cotton Poplin',
    fit: 'Slim',
  },
  {
    id: 'M-FRM-SHRT-02',
    name: 'Van Heusen Checkered Casual Shirt',
    brand: 'Van Heusen',
    description:
      'Yarn-dyed check in cotton-linen blend. Relaxed fit, button-down collar. Perfect for smart casual days.',
    gender: 'men',
    category: 'shirt',
    tags: ['casual', 'check', 'weekend'],
    mrp: 2299,
    sellingPrice: 1149,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      U('1602810318383-e386cc2a3ccf'),
      U('1598300042247-d088f8ab3a91'),
      U('1506794778202-cad84cf45f1d'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 2, M: 6, L: 11, XL: 8, XXL: 4 },
    rating: 4.3,
    reviewCount: 4450,
    isNewArrival: true,
    material: 'Cotton-Linen Blend',
    fit: 'Regular',
  },
  {
    id: 'M-FRM-BLZR-01',
    name: 'Raymond Single-Breasted Blazer',
    brand: 'Raymond',
    description:
      'Poly-viscose herringbone weave. Notch lapel, 2-button front, flap pockets with pick stitch. Dry-clean only.',
    gender: 'men',
    category: 'blazer',
    tags: ['formal', 'herringbone', 'corporate'],
    mrp: 8999,
    sellingPrice: 5399,
    discountPct: 40,
    gstRate: 0.12,
    images: [
      U('1507003211169-0a1dd7228f2d'),
      U('1552374196-1ab2a1c593e8'),
      U('1519085360753-af0119f7cbe7'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 2, M: 4, L: 6, XL: 3, XXL: 1 },
    rating: 4.6,
    reviewCount: 891,
    isFeatured: true,
    material: 'Poly-Viscose',
    fit: 'Tailored',
  },
  {
    id: 'M-FRM-BLZR-02',
    name: 'Raymond Pure Wool Suit Blazer',
    brand: 'Raymond',
    description:
      'Super 100s pure wool in charcoal grey. Half-canvassed construction, surgeon cuffs, AMF stitching throughout.',
    gender: 'men',
    category: 'blazer',
    tags: ['formal', 'wool', 'premium'],
    mrp: 14999,
    sellingPrice: 9999,
    discountPct: 33,
    gstRate: 0.12,
    images: [
      U('1552374196-1ab2a1c593e8'),
      U('1507003211169-0a1dd7228f2d'),
      U('1519085360753-af0119f7cbe7'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 1, M: 3, L: 5, XL: 2, XXL: 0 },
    rating: 4.8,
    reviewCount: 342,
    isFeatured: true,
    material: 'Pure Wool',
    fit: 'Tailored',
  },

  // ── Men's Casual ─────────────────────────────────────────────────────────────
  {
    id: 'M-CAS-TSHRT-01',
    name: 'Bewakoof Graphic Oversized Tee',
    brand: 'Bewakoof',
    description:
      '240 GSM 100% combed cotton. Dropped shoulders, boxy silhouette. Pre-shrunk and bio-washed for softness.',
    gender: 'men',
    category: 'tshirt',
    tags: ['graphic', 'oversized', 'streetwear'],
    mrp: 999,
    sellingPrice: 499,
    discountPct: 50,
    gstRate: 0.05,
    images: [
      U('1521572163474-6864f9cf17ab'),
      U('1503342217505-b0a15ec3261c'),
      U('1583743814966-8d4d0ec66c64'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 15, M: 23, L: 18, XL: 9, XXL: 5 },
    rating: 4.1,
    reviewCount: 12403,
    isFeatured: true,
    material: '100% Combed Cotton',
    fit: 'Oversized',
  },
  {
    id: 'M-CAS-CHNO-01',
    name: 'Spykar Slim Tapered Chinos',
    brand: 'Spykar',
    description:
      'Stretch cotton twill with elasticated waistband. Ankle-length tapered leg, garment-washed for a lived-in feel.',
    gender: 'men',
    category: 'chinos',
    tags: ['twill', 'slim', 'smart-casual'],
    mrp: 2799,
    sellingPrice: 1399,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      U('1624378439575-d8705ad01fcd'),
      U('1543087903-f5dfe6e7c284'),
      U('1473966968600-fa4cbed3ef3a'),
    ],
    sizes: ['28', '30', '32', '34', '36'],
    stock: { 28: 3, 30: 7, 32: 5, 34: 2, 36: 0 },
    rating: 4.2,
    reviewCount: 2917,
    material: 'Stretch Cotton Twill',
    fit: 'Slim Tapered',
  },

  // ── Innerwear ────────────────────────────────────────────────────────────────
  {
    id: 'M-INN-TRNK-01',
    name: 'AeroWeave UltraSoft MicroModal Trunk',
    brand: 'AeroWeave',
    description:
      'MicroModal fabric with 4-way stretch, flatlock seams, and a no-ride-up waistband. Ultralight at 58g.',
    gender: 'men',
    category: 'innerwear',
    tags: ['trunk', 'micromodal', 'premium'],
    mrp: 999,
    sellingPrice: 649,
    discountPct: 35,
    gstRate: 0.05,
    images: [
      U('1521572163474-6864f9cf17ab'),
      U('1583743814966-8d4d0ec66c64'),
      U('1503342217505-b0a15ec3261c'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 20, M: 2, L: 14, XL: 9, XXL: 6 },
    rating: 4.5,
    reviewCount: 6720,
    isFeatured: true,
    material: 'MicroModal',
    fit: 'Trunk',
  },
  {
    id: 'M-INN-BOXR-01',
    name: 'BreatheLite Cotton Boxer',
    brand: 'BreatheLite',
    description:
      "Double-mercerised Supima cotton with vented side panels and a comfort-flex waistband that won't dig in.",
    gender: 'men',
    category: 'innerwear',
    tags: ['boxer', 'supima', 'comfortable'],
    mrp: 699,
    sellingPrice: 399,
    discountPct: 43,
    gstRate: 0.05,
    images: [
      U('1624378439575-d8705ad01fcd'),
      U('1543087903-f5dfe6e7c284'),
      U('1473966968600-fa4cbed3ef3a'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 25, M: 31, L: 19, XL: 12, XXL: 4 },
    rating: 4.2,
    reviewCount: 9011,
    isFeatured: true,
    material: 'Supima Cotton',
    fit: 'Boxer',
  },
  {
    id: 'M-INN-TRNK-04',
    name: 'ThreadLux Bamboo Charcoal Trunk',
    brand: 'ThreadLux',
    description:
      'Bamboo charcoal infusion provides natural odour control. Ultra-soft modal-spandex blend, tagless for zero irritation.',
    gender: 'men',
    category: 'innerwear',
    tags: ['trunk', 'bamboo-charcoal', 'odour-control'],
    mrp: 1299,
    sellingPrice: 849,
    discountPct: 35,
    gstRate: 0.05,
    images: [
      U('1583743814966-8d4d0ec66c64'),
      U('1521572163474-6864f9cf17ab'),
      U('1503342217505-b0a15ec3261c'),
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 5, M: 8, L: 3, XL: 0, XXL: 2 },
    rating: 4.6,
    reviewCount: 2187,
    material: 'Modal-Spandex',
    fit: 'Trunk',
  },

  // ── Footwear — Sneakers ───────────────────────────────────────────────────────
  {
    id: 'SHOE-NK-AJ1-01',
    name: 'Nike Air Jordan 1 Low',
    brand: 'Nike',
    description:
      'The icon. Full-grain leather upper with perforations for breathability. Encapsulated Air-Sole unit, rubber cupsole with herringbone traction. Colour: Black/White/Gym Red.',
    gender: 'unisex',
    category: 'sneakers',
    tags: ['sneakers', 'basketball', 'jordan', 'lifestyle'],
    mrp: 11495,
    sellingPrice: 8995,
    discountPct: 21,
    gstRate: 0.12,
    images: [
      U('1542291026-7eec264c27ff', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 2,
      'UK 7': 5,
      'UK 8': 7,
      'UK 9': 4,
      'UK 10': 2,
      'UK 11': 1,
    },
    rating: 4.8,
    reviewCount: 3894,
    isFeatured: true,
    material: 'Full-Grain Leather',
    fit: 'True to Size',
  },
  {
    id: 'SHOE-AD-UB-01',
    name: 'Adidas Ultraboost Light',
    brand: 'Adidas',
    description:
      'Engineered Primeknit+ upper adapts to your foot. LIGHTBOOST midsole is 30% lighter than standard Boost. Continental™ rubber outsole for all-weather grip.',
    gender: 'unisex',
    category: 'sports-shoes',
    tags: ['running', 'boost', 'performance'],
    mrp: 19999,
    sellingPrice: 13999,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      U('1608231387042-66d1773d3028', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 1,
      'UK 7': 3,
      'UK 8': 6,
      'UK 9': 8,
      'UK 10': 5,
      'UK 11': 2,
    },
    rating: 4.7,
    reviewCount: 2210,
    isFeatured: true,
    material: 'Primeknit+ / LIGHTBOOST',
    fit: 'Snug',
  },
  {
    id: 'SHOE-PU-RSX-01',
    name: 'Puma RS-X Efekt',
    brand: 'Puma',
    description:
      'Retro running DNA meets forward design. Mesh and leather overlays, chunky EVA-injected RS foam midsole. Platform height 4cm. Statement colourway.',
    gender: 'unisex',
    category: 'sneakers',
    tags: ['chunky', 'retro', 'platform', 'lifestyle'],
    mrp: 9999,
    sellingPrice: 4999,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 4,
      'UK 7': 9,
      'UK 8': 12,
      'UK 9': 7,
      'UK 10': 3,
      'UK 11': 0,
    },
    rating: 4.3,
    reviewCount: 1876,
    material: 'Mesh + Leather Overlays',
    fit: 'Roomy Toe Box',
  },
  {
    id: 'SHOE-NK-PEG40-01',
    name: 'Nike Air Zoom Pegasus 40',
    brand: 'Nike',
    description:
      'Engineered mesh upper with Flywire cables for a dialled-in lockdown. Air Zoom unit under forefoot delivers explosive energy return. Wider toe box vs previous generation.',
    gender: 'unisex',
    category: 'sports-shoes',
    tags: ['running', 'zoom', 'training'],
    mrp: 11995,
    sellingPrice: 7495,
    discountPct: 37,
    gstRate: 0.12,
    images: [
      U('1542291026-7eec264c27ff', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
    stock: {
      'UK 6': 3,
      'UK 7': 6,
      'UK 8': 9,
      'UK 9': 11,
      'UK 10': 7,
      'UK 11': 4,
      'UK 12': 1,
    },
    rating: 4.6,
    reviewCount: 4512,
    isNewArrival: true,
    material: 'Engineered Mesh',
    fit: 'True to Size',
  },
  {
    id: 'SHOE-AD-FORUM-01',
    name: 'Adidas Originals Forum Low',
    brand: 'Adidas',
    description:
      'Basketball heritage reborn. Smooth leather upper, iconic strap closure with Velcro. EVA cupsole for comfort on hardwood or pavement. White/Gold colourway.',
    gender: 'unisex',
    category: 'sneakers',
    tags: ['lifestyle', 'heritage', 'leather'],
    mrp: 8999,
    sellingPrice: 6299,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      U('1608231387042-66d1773d3028', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 2,
      'UK 7': 4,
      'UK 8': 8,
      'UK 9': 6,
      'UK 10': 3,
      'UK 11': 1,
    },
    rating: 4.5,
    reviewCount: 987,
    isFeatured: true,
    material: 'Leather',
    fit: 'True to Size',
  },
  {
    id: 'SHOE-PU-VN3-01',
    name: 'Puma Velocity Nitro 3',
    brand: 'Puma',
    description:
      'NITRO foam midsole absorbs impact and springs back at 50%+ energy return. PWRTAPE overlay at midfoot for lateral stability during hard cornering. Race-day ready.',
    gender: 'unisex',
    category: 'sports-shoes',
    tags: ['running', 'nitro', 'performance', 'race'],
    mrp: 11999,
    sellingPrice: 8399,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 1,
      'UK 7': 4,
      'UK 8': 7,
      'UK 9': 9,
      'UK 10': 5,
      'UK 11': 2,
    },
    rating: 4.7,
    reviewCount: 1653,
    isNewArrival: true,
    material: 'NITRO Foam / Mesh',
    fit: 'Snug Heel',
  },
  {
    id: 'SHOE-NK-AF1-01',
    name: "Nike Air Force 1 '07 Low",
    brand: 'Nike',
    description:
      'The shoe that started it all. Full-length Air cushioning, perforated leather upper, pivot point rubber sole. Triple-White colourway — a wardrobe essential.',
    gender: 'unisex',
    category: 'sneakers',
    tags: ['lifestyle', 'af1', 'classic'],
    mrp: 9995,
    sellingPrice: 7995,
    discountPct: 20,
    gstRate: 0.12,
    images: [
      U('1542291026-7eec264c27ff', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 5,
      'UK 7': 8,
      'UK 8': 10,
      'UK 9': 7,
      'UK 10': 4,
      'UK 11': 2,
    },
    rating: 4.9,
    reviewCount: 8234,
    isFeatured: true,
    material: 'Full-Grain Leather',
    fit: 'Slightly Wide',
  },
  {
    id: 'SHOE-AD-SAMBA-01',
    name: 'Adidas Originals Samba OG',
    brand: 'Adidas',
    description:
      'Born on futsal courts in the 1950s, perfected by decades of street credibility. Suede overlays, gum outsole, debossed 3-Stripes on the side. Unmatched silhouette.',
    gender: 'unisex',
    category: 'sneakers',
    tags: ['samba', 'classic', 'suede', 'lifestyle'],
    mrp: 10999,
    sellingPrice: 8499,
    discountPct: 23,
    gstRate: 0.12,
    images: [
      U('1608231387042-66d1773d3028', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
      U('1600185365483-26d0a70ac334', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 3,
      'UK 7': 5,
      'UK 8': 9,
      'UK 9': 7,
      'UK 10': 4,
      'UK 11': 1,
    },
    rating: 4.8,
    reviewCount: 5109,
    isFeatured: true,
    material: 'Leather / Suede',
    fit: 'Slim',
  },
  {
    id: 'SHOE-PU-SUEDE-01',
    name: 'Puma Suede Classic XXI',
    brand: 'Puma',
    description:
      "The Suede has been on the streets since '68. Soft suede upper, formstrip branding on the side, EVA outsole. Heritage never looked this affordable.",
    gender: 'unisex',
    category: 'sneakers',
    tags: ['suede', 'heritage', 'lifestyle'],
    mrp: 7999,
    sellingPrice: 3699,
    discountPct: 54,
    gstRate: 0.12,
    images: [
      U('1600185365483-26d0a70ac334', 700, 700),
      U('1608231387042-66d1773d3028', 700, 700),
      U('1542291026-7eec264c27ff', 700, 700),
    ],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    stock: {
      'UK 6': 6,
      'UK 7': 10,
      'UK 8': 14,
      'UK 9': 9,
      'UK 10': 5,
      'UK 11': 2,
    },
    rating: 4.4,
    reviewCount: 3388,
    material: 'Suede',
    fit: 'True to Size',
  },
];

const ALL_BRANDS = [...new Set(INVENTORY.map((p) => p.brand))].sort();

// ─── TAXONOMY NAV TABS ────────────────────────────────────────────────────────
// Each tab defines how it filters the product list.
// `match` is a function so we can express arbitrary logic cleanly.
const NAV_TABS = [
  { id: 'all', label: 'All', match: () => true },
  {
    id: 'women-ethnic',
    label: "Women's Ethnic",
    match: (p) => ['kurti', 'saree', 'lehenga'].includes(p.category),
  },
  {
    id: 'women-western',
    label: "Women's Western",
    match: (p) => ['fusion-top', 'denim'].includes(p.category),
  },
  {
    id: 'men-formal',
    label: "Men's Formal",
    match: (p) => ['shirt', 'blazer'].includes(p.category),
  },
  {
    id: 'men-casual',
    label: "Men's Casual",
    match: (p) => ['tshirt', 'chinos'].includes(p.category),
  },
  {
    id: 'innerwear',
    label: 'Innerwear',
    match: (p) => p.category === 'innerwear',
  },
  {
    id: 'sneakers',
    label: '👟 Sneakers',
    match: (p) => p.category === 'sneakers',
  },
  {
    id: 'sports-shoes',
    label: '🏃 Sports Shoes',
    match: (p) => p.category === 'sports-shoes',
  },
  {
    id: 'new-arrivals',
    label: '✨ New Arrivals',
    match: (p) => !!p.isNewArrival,
  },
  { id: 'deals', label: '🔥 Deals', match: (p) => p.discountPct >= 45 },
];

// ─── FILTER STATE ─────────────────────────────────────────────────────────────
const DEFAULT_FILTER = {
  gender: null,
  categories: [],
  brands: [],
  sizes: [],
  priceRange: [0, 40000],
  minDiscount: 0,
  sortBy: 'relevance',
};

// ─── CART CONTEXT ─────────────────────────────────────────────────────────────
const CartCtx = createContext(null);

function cartReducer(state, action) {
  const key =
    action.productId && action.size ? `${action.productId}|${action.size}` : '';
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => `${i.productId}|${i.size}` === key);
      if (existing)
        return state.map((i) =>
          `${i.productId}|${i.size}` === key ? { ...i, qty: i.qty + 1 } : i
        );
      return [
        ...state,
        {
          productId: action.productId,
          size: action.size,
          qty: 1,
          addedAt: Date.now(),
        },
      ];
    }
    case 'REMOVE':
      return state.filter(
        (i) => !(i.productId === action.productId && i.size === action.size)
      );
    case 'SET_QTY':
      if (action.qty <= 0)
        return state.filter(
          (i) => !(i.productId === action.productId && i.size === action.size)
        );
      return state.map((i) =>
        i.productId === action.productId && i.size === action.size
          ? { ...i, qty: action.qty }
          : i
      );
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addItem = useCallback((productId, size) => {
    const p = INVENTORY.find((x) => x.id === productId);
    cartLog.success(`SKU dispatched → ${productId} [${size}]`, {
      stock: p?.stock[size],
    });
    dispatch({ type: 'ADD', productId, size });
  }, []);

  const removeItem = useCallback((productId, size) => {
    cartLog.info(`Removing ${productId} [${size}]`);
    dispatch({ type: 'REMOVE', productId, size });
  }, []);

  const setQty = useCallback(
    (productId, size, qty) =>
      dispatch({ type: 'SET_QTY', productId, size, qty }),
    []
  );

  const clearCart = useCallback(() => {
    cartLog.warn('Cart cleared by user');
    dispatch({ type: 'CLEAR' });
  }, []);

  const totalItems = useMemo(
    () => items.reduce((s, i) => s + i.qty, 0),
    [items]
  );
  const subtotalRs = useMemo(
    () =>
      items.reduce((s, i) => {
        const p = INVENTORY.find((x) => x.id === i.productId);
        return s + (p ? p.sellingPrice * i.qty : 0);
      }, 0),
    [items]
  );

  return (
    <CartCtx.Provider
      value={{
        items,
        addItem,
        removeItem,
        setQty,
        clearCart,
        totalItems,
        subtotalRs,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

const useCart = () => useContext(CartCtx);

// ─── WISHLIST CONTEXT ─────────────────────────────────────────────────────────
const WishCtx = createContext(null);

function WishProvider({ children }) {
  const [ids, setIds] = useState(new Set());

  const toggle = useCallback(
    (id) =>
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          wishLog.info(`Removed ${id}`);
        } else {
          next.add(id);
          wishLog.success(`Added ${id}`);
        }
        return next;
      }),
    []
  );

  const has = useCallback((id) => ids.has(id), [ids]);

  return (
    <WishCtx.Provider value={{ ids, toggle, has, count: ids.size }}>
      {children}
    </WishCtx.Provider>
  );
}

const useWish = () => useContext(WishCtx);

// ─── CURRENCY FORMAT ──────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

// ─── SHIMMER SKELETON ─────────────────────────────────────────────────────────
function Shimmer({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <Shimmer className="w-full h-72" />
      <div className="p-3 space-y-2">
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="h-4 w-4/5" />
        <Shimmer className="h-3 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Shimmer className="h-5 w-20" />
          <Shimmer className="h-5 w-14" />
        </div>
      </div>
    </div>
  );
}

// ─── RATING BADGE ─────────────────────────────────────────────────────────────
function RatingBadge({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
        {rating} ★
      </span>
      <span className="text-gray-400 text-xs">
        ({count.toLocaleString('en-IN')})
      </span>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, onClick }) {
  const { addItem } = useCart();
  const { toggle, has } = useWish();
  const [imgIdx, setImgIdx] = useState(0);
  const inWish = has(product.id);
  const isShoe = ['sneakers', 'sports-shoes'].includes(product.category);

  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-100 cursor-pointer group relative"
      onClick={() => onClick(product)}
      onMouseEnter={() => product.images[1] && setImgIdx(1)}
      onMouseLeave={() => setImgIdx(0)}
    >
      {/* Wishlist toggle */}
      <button
        className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center transition-transform hover:scale-110"
        onClick={(e) => {
          e.stopPropagation();
          toggle(product.id);
        }}
        aria-label="Toggle wishlist"
      >
        <span
          className={inWish ? 'text-red-500 text-sm' : 'text-gray-300 text-sm'}
        >
          {inWish ? '♥' : '♡'}
        </span>
      </button>

      {/* Badge strip */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {product.discountPct >= 40 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {product.discountPct}% OFF
          </span>
        )}
        {product.isNewArrival && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            NEW
          </span>
        )}
        {product.isFeatured && !product.isNewArrival && (
          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            TOP PICK
          </span>
        )}
        {isShoe && (
          <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            👟
          </span>
        )}
      </div>

      {/* Image */}
      <div
        className="relative overflow-hidden bg-gray-50"
        style={{ paddingBottom: '133%' }}
      >
        <img
          src={product.images[imgIdx] || product.images[0]}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1490481928099-7e05e11d2a6e?auto=format&fit=crop&w=600&h=800&q=80';
          }}
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide truncate">
          {product.brand}
        </p>
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mt-0.5 leading-snug">
          {product.name}
        </h3>
        <div className="mt-1.5">
          <RatingBadge rating={product.rating} count={product.reviewCount} />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold text-gray-900">
            {fmt(product.sellingPrice)}
          </span>
          <span className="text-xs text-gray-400 line-through">
            {fmt(product.mrp)}
          </span>
          <span className="text-xs font-semibold text-green-600">
            {product.discountPct}% off
          </span>
        </div>
        {product.material && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">
            {product.material}
            {product.fit ? ` · ${product.fit}` : ''}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            addItem(product.id, product.sizes[0]);
          }}
          className="mt-2.5 w-full py-1.5 text-xs font-semibold border border-orange-500 text-orange-600 rounded hover:bg-orange-500 hover:text-white transition-colors duration-150 opacity-0 group-hover:opacity-100"
        >
          Quick Add · {product.sizes[0]}
        </button>
      </div>
    </div>
  );
}

// ─── SIZE GRID ────────────────────────────────────────────────────────────────
function SizeGrid({ product, selectedSize, onSelect }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">
        Select Size:{' '}
        {selectedSize && (
          <span className="text-orange-600">{selectedSize}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {product.sizes.map((sz) => {
          const qty = product.stock[sz] ?? 0;
          const oos = qty === 0;
          const low = qty > 0 && qty <= 3;
          return (
            <button
              key={sz}
              disabled={oos}
              onClick={() => onSelect(sz)}
              className={`
                relative min-w-[44px] h-10 px-2 border rounded text-sm font-medium transition-all
                ${
                  oos
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50 line-through'
                    : selectedSize === sz
                    ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-400'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-600'
                }
              `}
            >
              {sz}
              {low && !oos && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {product.sizes.some(
        (s) => (product.stock[s] || 0) > 0 && (product.stock[s] || 0) <= 3
      ) && (
        <p className="text-red-500 text-xs mt-2 font-medium">
          ⚡ Only a few left in selected sizes!
        </p>
      )}
    </div>
  );
}

// ─── PRODUCT DETAIL MODAL ─────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose }) {
  const { addItem } = useCart();
  const { toggle, has } = useWish();
  const [selSize, setSelSize] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [pincode, setPincode] = useState('');
  const [pincodeMsg, setPincodeMsg] = useState(null);
  const [added, setAdded] = useState(false);
  const inWish = has(product.id);

  const handleAdd = () => {
    if (!selSize) return;
    addItem(product.id, selSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const checkPin = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeMsg('Enter a valid 6-digit PIN');
      return;
    }
    const days =
      pincode.startsWith('1') || pincode.startsWith('4') ? '1–2' : '3–5';
    checkoutLog.info(`Pincode lookup — ${pincode}`, { days });
    setPincodeMsg(`✓ Delivery to ${pincode}: ${days} business days`);
  };

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const taxableBase = product.sellingPrice / (1 + product.gstRate);
  const gstAmt = product.sellingPrice - taxableBase;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full md:max-w-3xl md:rounded-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image column */}
          <div className="md:w-2/5 flex-shrink-0">
            <div
              className="relative bg-gray-50"
              style={{ paddingBottom: '100%', minHeight: '280px' }}
            >
              <img
                src={product.images[imgIdx]}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1490481928099-7e05e11d2a6e?auto=format&fit=crop&w=600&h=600&q=80';
                }}
              />
              {product.discountPct >= 40 && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  {product.discountPct}% OFF
                </span>
              )}
            </div>
            <div className="flex gap-2 p-3 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded border-2 overflow-hidden ${
                    i === imgIdx ? 'border-orange-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1490481928099-7e05e11d2a6e?auto=format&fit=crop&w=120&h=120&q=80';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Info column */}
          <div className="md:w-3/5 p-5 space-y-4">
            <div>
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-widest">
                {product.brand}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mt-1 leading-tight">
                {product.name}
              </h2>
              <div className="mt-2">
                <RatingBadge
                  rating={product.rating}
                  count={product.reviewCount}
                />
              </div>
            </div>

            <div className="flex items-baseline gap-3 pb-3 border-b border-gray-100">
              <span className="text-2xl font-extrabold text-gray-900">
                {fmt(product.sellingPrice)}
              </span>
              <span className="text-base text-gray-400 line-through">
                {fmt(product.mrp)}
              </span>
              <span className="text-sm font-bold text-green-600">
                {product.discountPct}% off
              </span>
            </div>

            <p className="text-xs text-gray-400">
              Incl. {product.gstRate === 0.05 ? '5%' : '12%'} GST — Taxable{' '}
              {fmt(Math.round(taxableBase))}, GST {fmt(Math.round(gstAmt))}
            </p>

            <SizeGrid
              product={product}
              selectedSize={selSize}
              onSelect={setSelSize}
            />
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {(product.material || product.fit) && (
              <div className="flex gap-4 text-xs text-gray-500">
                {product.material && (
                  <span>
                    <span className="font-medium text-gray-700">Material:</span>{' '}
                    {product.material}
                  </span>
                )}
                {product.fit && (
                  <span>
                    <span className="font-medium text-gray-700">Fit:</span>{' '}
                    {product.fit}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!selSize}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                  !selSize
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : added
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                }`}
              >
                {!selSize
                  ? 'Select a Size'
                  : added
                  ? '✓ Added to Cart'
                  : 'Add to Cart'}
              </button>
              <button
                onClick={() => toggle(product.id)}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${
                  inWish
                    ? 'border-red-400 text-red-500 bg-red-50'
                    : 'border-gray-200 text-gray-400 hover:border-red-300'
                }`}
              >
                {inWish ? '♥' : '♡'}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📍 Check Delivery
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter PIN code"
                  value={pincode}
                  onChange={(e) =>
                    setPincode(e.target.value.replace(/\D/, '').slice(0, 6))
                  }
                  className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={checkPin}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Check
                </button>
              </div>
              {pincodeMsg && (
                <p
                  className={`text-xs mt-1.5 ${
                    pincodeMsg.startsWith('✓')
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}
                >
                  {pincodeMsg}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Free delivery on orders above ₹499
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                ['🔄', 'Easy Returns', '30-day policy'],
                ['🛡️', 'Authentic', '100% Original'],
                ['🚚', 'Fast Ship', '2–5 business days'],
              ].map(([icon, title, sub]) => (
                <div key={title} className="text-center">
                  <div className="text-lg">{icon}</div>
                  <p className="text-[11px] font-semibold text-gray-700">
                    {title}
                  </p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose }) {
  const { items, removeItem, setQty, clearCart, subtotalRs } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponErr, setCouponErr] = useState(null);

  const applyCoupon = () => {
    const res = validateCoupon(couponCode, subtotalRs);
    if (res.ok) {
      setAppliedCoupon(res.coupon);
      setCouponErr(null);
      checkoutLog.success(`Coupon applied — ${res.coupon.code}`, {
        discount: res.coupon.value,
      });
    } else {
      setCouponErr(res.error);
      setAppliedCoupon(null);
      checkoutLog.warn(`Coupon rejected — ${couponCode}`, {
        reason: res.error,
      });
    }
  };

  const couponDiscount = appliedCoupon
    ? applyCouponDiscount(appliedCoupon, subtotalRs)
    : 0;
  const afterCoupon = subtotalRs - couponDiscount;
  const delivery =
    afterCoupon >= FREE_DELIVERY_THRESHOLD || subtotalRs === 0 ? 0 : 49;
  const grandTotal = afterCoupon + delivery;

  const gstTotal = items.reduce((sum, item) => {
    const p = INVENTORY.find((x) => x.id === item.productId);
    if (!p) return sum;
    return sum + (p.sellingPrice - p.sellingPrice / (1 + p.gstRate)) * item.qty;
  }, 0);

  const handleCheckout = () => {
    checkoutLog.info('Checkout initiated', {
      items: items.length,
      total: grandTotal,
    });
    alert(
      `🎉 Order Placed Successfully!\nTotal: ${fmt(
        grandTotal
      )}\n\nThank you for shopping with Styloverse!`
    );
    clearCart();
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-all ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Shopping Bag ({items.reduce((s, i) => s + i.qty, 0)})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🛍️</div>
              <p className="text-gray-500 font-medium">Your bag is empty</p>
              <p className="text-gray-400 text-sm mt-1">
                Add items to get started
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm"
              >
                Continue Shopping
              </button>
            </div>
          )}
          {items.map((item) => {
            const p = INVENTORY.find((x) => x.id === item.productId);
            if (!p) return null;
            return (
              <div
                key={`${item.productId}|${item.size}`}
                className="flex gap-3 pb-4 border-b border-gray-50"
              >
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-20 h-24 object-cover rounded-lg bg-gray-50 flex-shrink-0"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1490481928099-7e05e11d2a6e?auto=format&fit=crop&w=160&h=192&q=70';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{p.brand}</p>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Size: {item.size}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-gray-200 rounded">
                      <button
                        onClick={() =>
                          setQty(item.productId, item.size, item.qty - 1)
                        }
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.qty}
                      </span>
                      <button
                        onClick={() =>
                          setQty(item.productId, item.size, item.qty + 1)
                        }
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-gray-900">
                      {fmt(p.sellingPrice * item.qty)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.size)}
                    className="text-xs text-red-400 hover:text-red-600 mt-1.5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code…"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={applyCoupon}
                  className="px-3 py-2 bg-orange-500 text-white text-sm font-semibold rounded hover:bg-orange-600"
                >
                  Apply
                </button>
              </div>
              {couponErr && (
                <p className="text-red-500 text-xs mt-1">{couponErr}</p>
              )}
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-green-600 text-xs font-medium">
                    ✓ {appliedCoupon.code} — saving {fmt(couponDiscount)}
                  </p>
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="text-gray-400 text-xs hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Try: FIRST20 · FESTIVE10 · FLAT150 · SOLE200
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>MRP Total</span>
                <span>
                  {fmt(
                    items.reduce((s, i) => {
                      const p = INVENTORY.find((x) => x.id === i.productId);
                      return s + (p ? p.mrp * i.qty : 0);
                    }, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Brand Discount</span>
                <span>
                  −
                  {fmt(
                    items.reduce((s, i) => {
                      const p = INVENTORY.find((x) => x.id === i.productId);
                      return s + (p ? (p.mrp - p.sellingPrice) * i.qty : 0);
                    }, 0)
                  )}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>−{fmt(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 text-xs">
                <span>GST (incl.)</span>
                <span>{fmt(Math.round(gstTotal))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>
                  {delivery === 0 ? (
                    <span className="text-green-600 font-medium">FREE</span>
                  ) : (
                    `₹${delivery}`
                  )}
                </span>
              </div>
              {delivery === 0 && (
                <p className="text-[11px] text-green-600">
                  🎉 You saved ₹49 on delivery!
                </p>
              )}
              <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>{fmt(grandTotal)}</span>
              </div>
              <p className="text-[11px] text-gray-400">
                *Inclusive of all taxes. No hidden charges.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm tracking-wide transition-colors"
            >
              Proceed to Checkout — {fmt(grandTotal)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
function FilterPanel({ filters, setFilters, onClose }) {
  const toggle = (key, val) =>
    setFilters((f) => {
      const arr = f[key];
      const next = arr.includes(val)
        ? arr.filter((x) => x !== val)
        : [...arr, val];
      filterLog.debug(`Toggle ${key}`, { val });
      return { ...f, [key]: next };
    });

  const ALL_SIZES = [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    '28',
    '30',
    '32',
    '34',
    '36',
    'UK 6',
    'UK 7',
    'UK 8',
    'UK 9',
    'UK 10',
    'UK 11',
  ];
  const CATS = [
    { k: 'kurti', l: 'Kurtis' },
    { k: 'saree', l: 'Sarees' },
    { k: 'lehenga', l: 'Lehenga' },
    { k: 'fusion-top', l: 'Fusion Tops' },
    { k: 'denim', l: 'Denim' },
    { k: 'shirt', l: 'Shirts' },
    { k: 'tshirt', l: 'T-Shirts' },
    { k: 'chinos', l: 'Chinos' },
    { k: 'blazer', l: 'Blazers' },
    { k: 'innerwear', l: 'Innerwear' },
    { k: 'sneakers', l: 'Sneakers' },
    { k: 'sports-shoes', l: 'Sports Shoes' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Filters</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setFilters({ ...DEFAULT_FILTER });
              filterLog.warn('Filters reset');
            }}
            className="text-xs text-orange-500 font-medium"
          >
            Clear All
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Gender */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Gender
          </p>
          <div className="flex gap-2">
            {['men', 'women'].map((g) => (
              <button
                key={g}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    gender: f.gender === g ? null : g,
                  }))
                }
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  filters.gender === g
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 text-gray-600 hover:border-orange-300'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Category
          </p>
          <div className="space-y-1.5">
            {CATS.map(({ k, l }) => (
              <label
                key={k}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(k)}
                  onChange={() => toggle('categories', k)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600">
                  {l}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Brand */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Brand
          </p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {ALL_BRANDS.map((b) => (
              <label
                key={b}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.brands.includes(b)}
                  onChange={() => toggle('brands', b)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600">
                  {b}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => toggle('sizes', s)}
                className={`min-w-[40px] h-9 px-2 border rounded text-xs transition-all ${
                  filters.sizes.includes(s)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 text-gray-600 hover:border-orange-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Price Range
          </p>
          {[
            ['Under ₹500', 0, 500],
            ['₹500–₹2,000', 500, 2000],
            ['₹2,000–₹10,000', 2000, 10000],
            ['₹10,000+', 10000, 40000],
          ].map(([label, min, max]) => (
            <label
              key={label}
              className="flex items-center gap-2 cursor-pointer mb-1.5 group"
            >
              <input
                type="radio"
                name="price"
                checked={
                  filters.priceRange[0] === min && filters.priceRange[1] === max
                }
                onChange={() =>
                  setFilters((f) => ({ ...f, priceRange: [min, max] }))
                }
                className="w-4 h-4 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-orange-600">
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Discount */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Min. Discount
          </p>
          {[0, 10, 20, 30, 40, 50].map((d) => (
            <label
              key={d}
              className="flex items-center gap-2 cursor-pointer mb-1.5 group"
            >
              <input
                type="radio"
                name="disc"
                checked={filters.minDiscount === d}
                onChange={() => setFilters((f) => ({ ...f, minDiscount: d }))}
                className="w-4 h-4 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-orange-600">
                {d === 0 ? 'All Discounts' : `${d}% and above`}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN MODAL ──────────────────────────────────────────────────────────────
function LoginModal({ onClose }) {
  const [visible, setVisible] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'otp' | 'success'
  const [otp, setOtp] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const validate = () => {
    const v = identifier.trim();
    const isMobile = /^[6-9]\d{9}$/.test(v);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!v) {
      setError('Please enter your mobile number or email');
      return false;
    }
    if (!isMobile && !isEmail) {
      setError('Enter a valid 10-digit mobile number or email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = () => {
    if (!validate()) return;
    authLog.info(`Login attempt`, {
      identifier: identifier.trim().slice(0, 4) + '****',
    });
    setStep('otp');
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    authLog.success('OTP verified. Session token issued.', { method: 'mock' });
    setStep('success');
    setTimeout(handleDismiss, 1800);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const cardClass = visible
    ? 'scale-100 opacity-100 translate-y-0'
    : 'scale-90 opacity-0 translate-y-4';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />
      <div
        className={`login-modal__card relative w-full max-w-sm transition-all duration-300 ease-out ${cardClass}`}
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: '24px',
          boxShadow:
            '0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.5) inset',
        }}
      >
        {/* Decorative blob */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, #f97316 0%, #fbbf24 60%, transparent 100%)',
          }}
        />

        <div className="relative p-8">
          <button
            onClick={handleDismiss}
            className="absolute top-5 right-5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-sm"
          >
            ✕
          </button>

          <div className="text-center mb-6">
            <p className="text-2xl font-black tracking-tight">
              <span className="text-orange-500">STYLO</span>
              <span className="text-gray-900">VERSE</span>
            </p>
            <p className="text-[10px] text-gray-400 tracking-widest mt-0.5">
              FASHION FOR BHARAT
            </p>
          </div>

          {step === 'input' && (
            <>
              <h2 className="text-lg font-bold text-gray-900 text-center">
                Welcome back 👋
              </h2>
              <p className="text-sm text-gray-500 text-center mt-1 mb-5">
                Sign in to access orders, wishlist & exclusive deals
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                    Mobile or Email
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="9876543210 or you@email.com"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                    className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all ${
                      error
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                    }`}
                  />
                  {error && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">
                      {error}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleContinue}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-sm tracking-wide transition-all shadow-md hover:shadow-lg"
                >
                  Continue →
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or sign in with</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['G', 'Google', '#4285F4'],
                    ['F', 'Facebook', '#1877F2'],
                  ].map(([letter, label, color]) => (
                    <button
                      key={label}
                      onClick={() => authLog.info(`Social login — ${label}`)}
                      className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className="w-5 h-5 rounded-full text-white text-[11px] font-black flex items-center justify-center flex-shrink-0"
                        style={{ background: color }}
                      >
                        {letter}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
                By continuing you agree to our{' '}
                <span className="text-orange-500 cursor-pointer hover:underline">
                  Terms
                </span>{' '}
                &{' '}
                <span className="text-orange-500 cursor-pointer hover:underline">
                  Privacy Policy
                </span>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              <button
                onClick={() => {
                  setStep('input');
                  setOtp('');
                  setError('');
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-4 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-gray-900">Enter OTP</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                6-digit code sent to{' '}
                <span className="font-semibold text-gray-800">
                  {identifier}
                </span>
              </p>
              <div className="space-y-3">
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    className={`w-full px-4 py-3 rounded-xl border text-center text-xl font-bold tracking-[0.5em] focus:outline-none transition-all ${
                      error
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                    }`}
                  />
                  {error && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">
                      {error}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleVerifyOtp}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-sm tracking-wide transition-all shadow-md"
                >
                  Verify OTP
                </button>
                <p className="text-xs text-center text-gray-400">
                  Didn't receive it?{' '}
                  <span
                    onClick={() => authLog.info('OTP resend triggered')}
                    className="text-orange-500 font-semibold cursor-pointer hover:underline"
                  >
                    Resend OTP
                  </span>
                </p>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">You're in!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Redirecting to your account…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FOOTWEAR HERO BANNER ─────────────────────────────────────────────────────
// Asymmetric layout — bold left column with headline + CTA, floating product
// teasers on the right. Background cycles through three sneaker imagery angles.
const HERO_SLIDES = [
  U('1542291026-7eec264c27ff', 1200, 700),
  U('1600185365483-26d0a70ac334', 1200, 700),
  U('1608231387042-66d1773d3028', 1200, 700),
];

function FootwearHeroBanner({ onShopSneakers, onShopSports }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % HERO_SLIDES.length),
      4000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ minHeight: '320px', background: '#0d0d0f' }}
    >
      {/* Background images — cross-fade */}
      {HERO_SLIDES.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none"
          style={{ opacity: i === slide ? 0.45 : 0 }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ))}

      {/* Gradient overlay — heavier on the left so text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(110deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.12) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 px-8 md:px-14 py-12 md:py-16">
        {/* Left — headline */}
        <div className="flex-1 max-w-lg">
          <p className="text-orange-400 text-[11px] font-black tracking-[0.22em] uppercase mb-3">
            2026 Collection · New Drop
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.05] tracking-tight">
            Your Next
            <br />
            <span className="text-orange-400 italic">Obsession</span>
            <br />
            Has Landed.
          </h1>
          <p className="text-gray-300 mt-4 text-sm md:text-base leading-relaxed max-w-sm">
            Nike Air Jordans, Adidas Ultraboost, Puma RS-X — hand-picked drops
            from the biggest houses in footwear. Starting at{' '}
            <span className="text-white font-bold">₹3,699</span>.
          </p>

          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={onShopSneakers}
              className="px-7 py-3.5 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black text-sm rounded-xl transition-all shadow-xl shadow-orange-600/30 tracking-wide"
            >
              Shop Sneakers →
            </button>
            <button
              onClick={onShopSports}
              className="px-5 py-3.5 border border-white/30 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              Sports Shoes
            </button>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              '🔥 15,000+ pairs sold',
              '⭐ 4.7 avg rating',
              '🚀 Same-day dispatch',
            ].map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-gray-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right — floating product teasers (decorative) */}
        <div className="hidden lg:flex flex-col gap-3 flex-shrink-0">
          {[
            { name: 'Air Jordan 1 Low', price: '₹8,995', img: HERO_SLIDES[0] },
            { name: 'Ultraboost Light', price: '₹13,999', img: HERO_SLIDES[1] },
            { name: 'RS-X Efekt', price: '₹4,999', img: HERO_SLIDES[2] },
          ].map(({ name, price, img }) => (
            <button
              key={name}
              onClick={onShopSneakers}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 hover:bg-white/20 transition-colors w-60 text-left"
            >
              <img
                src={img}
                alt={name}
                className="w-12 h-12 rounded-xl object-cover bg-gray-700 flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <p className="text-white text-xs font-bold leading-snug">
                  {name}
                </p>
                <p className="text-orange-400 text-xs font-semibold mt-0.5">
                  {price}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-4 right-6 z-10 flex gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full transition-all ${
              i === slide
                ? 'w-6 h-1.5 bg-orange-400'
                : 'w-1.5 h-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── FASHION HERO CAROUSEL ────────────────────────────────────────────────────
function FashionHeroBanner() {
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      bg: 'from-orange-50 to-rose-100',
      label: 'NEW COLLECTION',
      h: 'Ethnic meets Modern',
      sub: 'Kurtis, Sarees & Lehengas at up to 50% off',
      cta: "Explore Women's Ethnic",
      img: U('1583391153254-8a5a9a2b8a0d', 800, 600),
    },
    {
      bg: 'from-blue-50 to-indigo-100',
      label: "MEN'S FASHION",
      h: 'Dress Sharp, Work Smarter',
      sub: 'Slim-fit shirts, blazers & chinos starting ₹499',
      cta: "Shop Men's Formal",
      img: U('1507003211169-0a1dd7228f2d', 800, 600),
    },
    {
      bg: 'from-emerald-50 to-teal-100',
      label: 'INNERWEAR ESSENTIALS',
      h: "Comfort You Can't See",
      sub: 'MicroModal, Bamboo & Supima — premium innerwear',
      cta: 'Shop Innerwear',
      img: U('1624378439575-d8705ad01fcd', 800, 600),
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);

  const s = slides[slide];
  return (
    <div
      className={`relative bg-gradient-to-br ${s.bg} rounded-2xl overflow-hidden transition-all duration-700`}
      style={{ minHeight: '260px' }}
    >
      <div className="flex items-center justify-between h-full p-8 md:p-12">
        <div className="flex-1 max-w-lg">
          <span className="text-xs font-bold tracking-widest text-orange-500 uppercase">
            {s.label}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 leading-tight">
            {s.h}
          </h1>
          <p className="text-gray-600 mt-2 text-sm">{s.sub}</p>
          <button className="mt-5 px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md text-sm">
            {s.cta} →
          </button>
        </div>
        <div className="hidden md:block w-60 h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-lg ml-8">
          <img
            src={s.img}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full transition-all ${
              i === slide
                ? 'bg-orange-500 w-8 h-1.5'
                : 'bg-gray-300 w-1.5 h-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── BRAND MARQUEE ────────────────────────────────────────────────────────────
// Infinite CSS-keyframe ticker. Hover pauses. Click any card to filter by brand.
const MARQUEE_BRANDS = [
  { name: 'Nike', tagline: 'Just Do It', color: '#000000', bg: '#f1f5f9' },
  {
    name: 'Adidas',
    tagline: 'Impossible is Nothing',
    color: '#000000',
    bg: '#f8fafc',
  },
  { name: 'Puma', tagline: 'Forever Faster', color: '#dc2626', bg: '#fee2e2' },
  { name: 'Zara', tagline: 'Fashion Forward', color: '#1e293b', bg: '#f1f5f9' },
  { name: 'H&M', tagline: 'Fashion for All', color: '#dc2626', bg: '#fef2f2' },
  { name: "Levi's", tagline: 'Denim Legacy', color: '#1d4ed8', bg: '#dbeafe' },
  { name: 'Libas', tagline: 'Ethnic Luxe', color: '#7c3aed', bg: '#ede9fe' },
  { name: 'BIBA', tagline: 'Timeless Ethnic', color: '#db2777', bg: '#fce7f3' },
  {
    name: 'Raymond',
    tagline: 'The Complete Man',
    color: '#1e293b',
    bg: '#f1f5f9',
  },
  { name: 'Taneira', tagline: 'Pure Silks', color: '#0369a1', bg: '#e0f2fe' },
  {
    name: 'KALKI Fashion',
    tagline: 'Bridal Couture',
    color: '#be185d',
    bg: '#fdf2f8',
  },
  {
    name: 'Peter England',
    tagline: 'Formal Authority',
    color: '#0f766e',
    bg: '#ccfbf1',
  },
  {
    name: 'Bewakoof',
    tagline: 'Gen Z Streetwear',
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    name: 'AeroWeave',
    tagline: 'Next-Gen Innerwear',
    color: '#0891b2',
    bg: '#cffafe',
  },
  {
    name: 'BreatheLite',
    tagline: 'Pure Cotton',
    color: '#15803d',
    bg: '#dcfce7',
  },
];

function BrandMarquee({ onBrandClick }) {
  const doubled = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  return (
    <div className="mt-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex-shrink-0">
          Top Brands
        </h3>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 flex-shrink-0">
          Click to filter
        </span>
      </div>
      <div
        className="flex gap-3"
        style={{
          animation: 'marqueeScroll 38s linear infinite',
          width: 'max-content',
          willChange: 'transform',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.animationPlayState = 'paused')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.animationPlayState = 'running')
        }
      >
        {doubled.map((brand, idx) => (
          <button
            key={`${brand.name}-${idx}`}
            onClick={() => {
              filterLog.info(`Brand marquee → ${brand.name}`);
              onBrandClick(brand.name);
            }}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl border transition-all hover:scale-105 hover:shadow-md active:scale-95"
            style={{
              background: brand.bg,
              borderColor: brand.color + '30',
              minWidth: '130px',
            }}
          >
            <span
              className="text-base font-black leading-tight text-center"
              style={{ color: brand.color }}
            >
              {brand.name}
            </span>
            <span className="text-[10px] font-medium text-gray-500">
              {brand.tagline}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TAXONOMY NAVBAR ──────────────────────────────────────────────────────────
// Horizontal scrolling nav with active-underline state. No scrollbars shown.
function TaxonomyNav({ activeTab, onTabChange }) {
  const navRef = useRef(null);

  // Scroll active tab into view on mount / change
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('[data-active="true"]');
    if (active)
      active.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
  }, [activeTab]);

  return (
    <nav
      className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm"
      ref={navRef}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="flex items-center gap-1 overflow-x-auto py-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-active={isActive}
                onClick={() => {
                  filterLog.debug(`Tab selected: ${tab.id}`);
                  onTabChange(tab.id);
                }}
                className={`
                  flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                  ${
                    isActive
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-orange-500 hover:border-orange-200'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ onCartClick, onSearchChange, searchQuery, onLoginClick }) {
  const { totalItems } = useCart();
  const { count: wishCount } = useWish();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="bg-orange-500 text-white text-center text-xs py-1.5 font-medium tracking-wide">
        🎉 Use code <strong>FIRST20</strong> for 20% off your first order · Free
        delivery above ₹499
      </div>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex-shrink-0">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-orange-500">STYLO</span>
            <span className="text-gray-900">VERSE</span>
          </span>
          <p className="text-[10px] text-gray-400 -mt-0.5 tracking-widest">
            FASHION FOR BHARAT
          </p>
        </div>

        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search kurtis, sarees, Nike, Adidas…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 bg-gray-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={onLoginClick}
            className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 transition-colors"
          >
            <span className="text-lg">👤</span>
            <span className="text-[10px]">Account</span>
          </button>
          <button className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 relative transition-colors">
            <span className="text-lg">♡</span>
            <span className="text-[10px]">Wishlist</span>
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishCount}
              </span>
            )}
          </button>
          <button
            onClick={onCartClick}
            className="flex flex-col items-center text-gray-600 hover:text-orange-500 relative transition-colors"
          >
            <span className="text-lg">🛍</span>
            <span className="text-[10px]">Bag</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ ...DEFAULT_FILTER });
  const [activeTab, setActiveTab] = useState('all');
  const [showLogin, setShowLogin] = useState(false);

  // Auto-open login modal once per session
  useEffect(() => {
    if (!sessionStorage.getItem('sv_login_dismissed')) {
      const t = setTimeout(() => setShowLogin(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const handleLoginClose = () => {
    sessionStorage.setItem('sv_login_dismissed', '1');
    setShowLogin(false);
  };

  // Simulate async catalog load
  useEffect(() => {
    const t = setTimeout(() => {
      setProducts(INVENTORY);
      setLoading(false);
      invLog.success('Catalog hydrated', { count: INVENTORY.length });
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setFilters({ ...DEFAULT_FILTER });
    document
      .getElementById('product-grid')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleShopSneakers = useCallback(() => {
    filterLog.info('Hero CTA → Sneakers tab');
    setActiveTab('sneakers');
    setSearchQuery('');
    setFilters({ ...DEFAULT_FILTER });
    document
      .getElementById('product-grid')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleShopSports = useCallback(() => {
    filterLog.info('Hero CTA → Sports Shoes tab');
    setActiveTab('sports-shoes');
    setSearchQuery('');
    setFilters({ ...DEFAULT_FILTER });
    document
      .getElementById('product-grid')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleBrandFilter = useCallback((brandName) => {
    filterLog.info(`Marquee → brand filter: ${brandName}`);
    setFilters((f) => ({ ...DEFAULT_FILTER, brands: [brandName] }));
    setActiveTab('all');
    setSearchQuery('');
    document
      .getElementById('product-grid')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Active tab's match function
  const tabMatcher = useMemo(() => {
    const tab = NAV_TABS.find((t) => t.id === activeTab);
    return tab ? tab.match : () => true;
  }, [activeTab]);

  // Full filter pipeline — tab → search → sidebar filters → sort
  const filtered = useMemo(() => {
    let r = products.filter(tabMatcher);

    const q = searchQuery.toLowerCase().trim();
    if (q)
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q)) ||
          p.category.includes(q)
      );

    if (filters.gender)
      r = r.filter((p) => p.gender === filters.gender || p.gender === 'unisex');
    if (filters.categories.length)
      r = r.filter((p) => filters.categories.includes(p.category));
    if (filters.brands.length)
      r = r.filter((p) => filters.brands.includes(p.brand));
    if (filters.sizes.length)
      r = r.filter((p) => filters.sizes.some((s) => p.sizes.includes(s)));
    if (filters.minDiscount > 0)
      r = r.filter((p) => p.discountPct >= filters.minDiscount);

    const [mn, mx] = filters.priceRange;
    r = r.filter((p) => p.sellingPrice >= mn && p.sellingPrice <= mx);

    switch (filters.sortBy) {
      case 'price_asc':
        r.sort((a, b) => a.sellingPrice - b.sellingPrice);
        break;
      case 'price_desc':
        r.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      case 'discount_desc':
        r.sort((a, b) => b.discountPct - a.discountPct);
        break;
      case 'rating_desc':
        r.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        r.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
        break;
      default:
        r.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return r;
  }, [products, tabMatcher, searchQuery, filters]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.gender) c++;
    c +=
      filters.categories.length + filters.brands.length + filters.sizes.length;
    if (filters.minDiscount > 0) c++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 40000) c++;
    return c;
  }, [filters]);

  return (
    <CartProvider>
      <WishProvider>
        <div className="min-h-screen bg-gray-50 font-sans">
          <style>{`
            /* Utility resets */
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

            /* Shimmer pulse */
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
            .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite; }

            /* Infinite brand marquee */
            @keyframes marqueeScroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }

            /* Spring-scale login modal entrance */
            @keyframes springScale {
              0%   { transform: scale(0.80) translateY(20px); opacity: 0; }
              55%  { transform: scale(1.04) translateY(-3px); opacity: 1; }
              75%  { transform: scale(0.98) translateY(1px);  }
              100% { transform: scale(1)    translateY(0);    opacity: 1; }
            }
            .login-modal__card {
              animation: springScale 0.40s cubic-bezier(0.22, 1, 0.36, 1) both;
            }

            /* Taxonomy nav scrollbar suppression */
            nav div[style*="scrollbar-width"] { scrollbar-width: none; }
            nav div[style*="scrollbar-width"]::-webkit-scrollbar { display: none; }
          `}</style>

          <Header
            onCartClick={() => setCartOpen(true)}
            onSearchChange={(v) => {
              setSearchQuery(v);
              if (activeTab !== 'all') setActiveTab('all');
            }}
            searchQuery={searchQuery}
            onLoginClick={() => setShowLogin(true)}
          />

          <TaxonomyNav activeTab={activeTab} onTabChange={handleTabChange} />

          <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Footwear hero — above the fold */}
            <FootwearHeroBanner
              onShopSneakers={handleShopSneakers}
              onShopSports={handleShopSports}
            />

            {/* Fashion carousel */}
            <FashionHeroBanner />

            {/* Brand marquee */}
            <BrandMarquee onBrandClick={handleBrandFilter} />

            {/* Trust signals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['🚚', 'Free Delivery', 'On orders above ₹499'],
                ['🔄', 'Easy Returns', '30-day hassle-free'],
                ['🛡️', '100% Authentic', 'Genuine brand products'],
                ['💳', 'Secure Pay', 'UPI, Cards, Net Banking'],
              ].map(([icon, title, sub]) => (
                <div
                  key={title}
                  className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm"
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {title}
                    </p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Active brand chip */}
            {filters.brands.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">
                  Filtered by brand:
                </span>
                {filters.brands.map((b) => (
                  <span
                    key={b}
                    className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    {b}
                    <button
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          brands: f.brands.filter((x) => x !== b),
                        }))
                      }
                      className="text-orange-400 hover:text-orange-700 leading-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setFilters({ ...DEFAULT_FILTER })}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product grid with sidebar filter */}
            <div id="product-grid" className="flex gap-6">
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-32">
                  <FilterPanel filters={filters} setFilters={setFilters} />
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                {/* Grid toolbar */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-gray-900">
                      {loading ? (
                        <span className="text-gray-400">Loading…</span>
                      ) : (
                        <>
                          {filtered.length.toLocaleString('en-IN')}{' '}
                          <span className="font-normal text-gray-500">
                            Products
                          </span>
                        </>
                      )}
                    </h2>
                    <button
                      onClick={() => setFilterDrawer(true)}
                      className="lg:hidden flex items-center gap-1.5 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:border-orange-400 hover:text-orange-600"
                    >
                      ⚙ Filters
                      {activeFilterCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => setFilters({ ...DEFAULT_FILTER })}
                        className="hidden lg:inline text-xs text-orange-500 hover:underline"
                      >
                        Clear all ({activeFilterCount})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 hidden sm:inline">
                      Sort:
                    </span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, sortBy: e.target.value }))
                      }
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-white"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="discount_desc">Best Discount</option>
                      <option value="rating_desc">Top Rated</option>
                      <option value="newest">Newest First</option>
                    </select>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {loading ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))
                  ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <div className="text-5xl mb-3">🔍</div>
                      <p className="text-gray-500 font-medium">
                        No products match your filters
                      </p>
                      <button
                        onClick={() => {
                          setFilters({ ...DEFAULT_FILTER });
                          setSearchQuery('');
                          setActiveTab('all');
                        }}
                        className="mt-3 text-orange-500 text-sm font-medium hover:underline"
                      >
                        Reset all filters
                      </button>
                    </div>
                  ) : (
                    filtered.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onClick={setSelectedProduct}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 text-gray-400 mt-16 py-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <p className="text-white font-bold text-lg mb-3">
                    <span className="text-orange-500">STYLO</span>VERSE
                  </p>
                  <p className="text-sm leading-relaxed">
                    Fashion-forward e-commerce built for Bharat. Authentic
                    brands, genuine products, pan-India delivery.
                  </p>
                </div>
                {[
                  ['Company', ['About Us', 'Careers', 'Press', 'Blog']],
                  [
                    'Help',
                    [
                      'My Orders',
                      'Returns & Refunds',
                      'Track Order',
                      'Contact Us',
                    ],
                  ],
                  [
                    'Policies',
                    [
                      'Privacy Policy',
                      'Terms of Use',
                      'GST Invoice',
                      'Shipping Policy',
                    ],
                  ],
                ].map(([title, links]) => (
                  <div key={title}>
                    <p className="text-white font-semibold mb-3">{title}</p>
                    <ul className="space-y-1.5">
                      {links.map((l) => (
                        <li key={l}>
                          <button className="text-sm hover:text-orange-400 transition-colors">
                            {l}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs">
                  © 2026 Styloverse Pvt. Ltd. All rights reserved. CIN:
                  U51909MH2026PTC000000
                </p>
                <div className="flex gap-3 text-xs">
                  {['UPI', 'Visa', 'Mastercard', 'Rupay', 'Net Banking'].map(
                    (m) => (
                      <span
                        key={m}
                        className="bg-gray-800 text-gray-300 px-2 py-1 rounded"
                      >
                        {m}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </footer>

          {/* Overlays */}
          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          )}

          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

          {showLogin && <LoginModal onClose={handleLoginClose} />}

          {/* Mobile filter drawer */}
          {filterDrawer && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setFilterDrawer(false)}
              />
              <div className="relative ml-auto bg-white w-80 h-full overflow-hidden shadow-2xl flex flex-col">
                <FilterPanel
                  filters={filters}
                  setFilters={setFilters}
                  onClose={() => setFilterDrawer(false)}
                />
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => setFilterDrawer(false)}
                    className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg text-sm"
                  >
                    Show {filtered.length} Results
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </WishProvider>
    </CartProvider>
  );
}
