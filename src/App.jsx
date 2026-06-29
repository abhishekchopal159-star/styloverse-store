import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  createContext,
  useContext,
  useRef,
  // ... upar ke imports (useState, useEffect, etc.)

import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from './firebase'; 

// ...
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
  // ── Footwear — Sneakers ───────────────────────────────────────────────────────
  {
    id: 'SHOE-NK-AJ1-01',
    name: 'Nike Air Jordan 1 Low',
    brand: 'Nike',
    description:
      'The icon. Full-grain leather upper with perforations for breathability. Encapsulated Air-Sole unit, rubber cupsole with herringbone traction.',
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
    stock: { 'UK 6': 2, 'UK 7': 5, 'UK 8': 7, 'UK 9': 4, 'UK 10': 2, 'UK 11': 1 },
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
      'Engineered Primeknit+ upper adapts to your foot. LIGHTBOOST midsole is 30% lighter than standard Boost.',
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
    stock: { 'UK 6': 1, 'UK 7': 3, 'UK 8': 6, 'UK 9': 8, 'UK 10': 5, 'UK 11': 2 },
    rating: 4.7,
    reviewCount: 2210,
    isFeatured: true,
    material: 'Primeknit+ / LIGHTBOOST',
    fit: 'Snug',
  }
];

const ALL_BRANDS = [...new Set(INVENTORY.map((p) => p.brand))].sort();

// ─── TAXONOMY NAV TABS ────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'women-ethnic', label: "Women's Ethnic", match: (p) => ['kurti', 'saree', 'lehenga'].includes(p.category) },
  { id: 'women-western', label: "Women's Western", match: (p) => ['fusion-top', 'denim'].includes(p.category) },
  { id: 'men-formal', label: "Men's Formal", match: (p) => ['shirt', 'blazer'].includes(p.category) },
  { id: 'men-casual', label: "Men's Casual", match: (p) => ['tshirt', 'chinos'].includes(p.category) },
  { id: 'sneakers', label: '👟 Sneakers', match: (p) => p.category === 'sneakers' },
  { id: 'sports-shoes', label: '🏃 Sports Shoes', match: (p) => p.category === 'sports-shoes' },
  { id: 'deals', label: '🔥 Deals', match: (p) => p.discountPct >= 45 },
];

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
  const key = action.productId && action.size ? `${action.productId}|${action.size}` : '';
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => `${i.productId}|${i.size}` === key);
      if (existing)
        return state.map((i) => `${i.productId}|${i.size}` === key ? { ...i, qty: i.qty + 1 } : i);
      return [...state, { productId: action.productId, size: action.size, qty: 1, addedAt: Date.now() }];
    }
    case 'REMOVE':
      return state.filter((i) => !(i.productId === action.productId && i.size === action.size));
    case 'SET_QTY':
      if (action.qty <= 0) return state.filter((i) => !(i.productId === action.productId && i.size === action.size));
      return state.map((i) => i.productId === action.productId && i.size === action.size ? { ...i, qty: action.qty } : i);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addItem = useCallback((productId, size) => {
    cartLog.success(`SKU dispatched → ${productId} [${size}]`);
    dispatch({ type: 'ADD', productId, size });
  }, []);

  const removeItem = useCallback((productId, size) => {
    dispatch({ type: 'REMOVE', productId, size });
  }, []);

  const setQty = useCallback((productId, size, qty) => dispatch({ type: 'SET_QTY', productId, size, qty }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotalRs = useMemo(() => items.reduce((s, i) => {
    const p = INVENTORY.find((x) => x.id === i.productId);
    return s + (p ? p.sellingPrice * i.qty : 0);
  }, 0), [items]);

  return (
    <CartCtx.Provider value={{ items, addItem, removeItem, setQty, clearCart, totalItems, subtotalRs }}>
      {children}
    </CartCtx.Provider>
  );
}
const useCart = () => useContext(CartCtx);

// ─── WISHLIST CONTEXT ─────────────────────────────────────────────────────────
const WishCtx = createContext(null);
function WishProvider({ children }) {
  const [ids, setIds] = useState(new Set());
  const toggle = useCallback((id) => setIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const has = useCallback((id) => ids.has(id), [ids]);
  return <WishCtx.Provider value={{ ids, toggle, has, count: ids.size }}>{children}</WishCtx.Provider>;
}
const useWish = () => useContext(WishCtx);

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function RatingBadge({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
        {rating} ★
      </span>
      <span className="text-gray-400 text-xs">({count})</span>
    </div>
  );
}

// ─── NEW FEATURE 1: PRODUCT DETAIL MODAL ──────────────────────────────────────
function ProductDetailModal({ product, onClose }) {
  const { addItem } = useCart();
  const { toggle, has } = useWish();
  const [activeImg, setActiveImg] = useState(product.images[0]);
  const [selectedSize, setSelectedSize] = useState('');
  const inWish = has(product.id);

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row animate-fade-in">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg transition-colors z-10">✕</button>
        
        {/* Left Side: Images Section */}
        <div className="md:w-1/2 bg-gray-50 p-6 flex flex-col justify-between">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white shadow-inner flex items-center justify-center">
            <img src={activeImg} alt={product.name} className="w-full h-full object-cover transition-all duration-300" />
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setActive
