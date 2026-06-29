import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  createContext,
  useContext,
  useRef,
} from "react";

// ─── LOGGER ───────────────────────────────────────────────────────────────────
const LEVEL_CSS = {
  info:    "color:#60a5fa;font-weight:600",
  warn:    "color:#fbbf24;font-weight:600",
  error:   "color:#f87171;font-weight:700",
  success: "color:#34d399;font-weight:700",
};

function makeLogger(service) {
  const ts   = () => new Date().toISOString().slice(11, 19);
  const emit = (level, msg, payload) => {
    const prefix = `%c[${service}]%c ${msg} %c${ts()}`;
    const styles = [LEVEL_CSS[level], "color:inherit", "color:#475569;font-size:10px"];
    payload !== undefined
      ? (console.groupCollapsed(prefix, ...styles), console.log(payload), console.groupEnd())
      : console.log(prefix, ...styles);
  };
  return {
    info:    (m, p) => emit("info",    m, p),
    warn:    (m, p) => emit("warn",    m, p),
    error:   (m, p) => emit("error",   m, p),
    success: (m, p) => emit("success", m, p),
  };
}

const cartLog     = makeLogger("Cart");
const filterLog   = makeLogger("Filter");
const checkoutLog = makeLogger("Checkout");
const authLog     = makeLogger("Auth");

// ─── COUPON ENGINE ────────────────────────────────────────────────────────────
const COUPONS = {
  FIRST20:   { code: "FIRST20",   type: "percent", value: 20, cap: 300,  min: 499  },
  FESTIVE10: { code: "FESTIVE10", type: "percent", value: 10, cap: 500,  min: 999  },
  FLAT150:   { code: "FLAT150",   type: "flat",    value: 150,           min: 799  },
  WELCOME50: { code: "WELCOME50", type: "flat",    value: 50                       },
  SOLE200:   { code: "SOLE200",   type: "flat",    value: 200,           min: 4999 },
};

function validateCoupon(code, total) {
  const c = COUPONS[code.toUpperCase().trim()];
  if (!c) return { ok: false, error: "Coupon not found or expired" };
  if (c.min && total < c.min) return { ok: false, error: `Min order ₹${c.min} required` };
  return { ok: true, coupon: c };
}

function computeCouponDiscount(coupon, subtotal) {
  if (coupon.type === "flat") return Math.min(coupon.value, subtotal);
  const raw = (subtotal * coupon.value) / 100;
  return coupon.cap ? Math.min(raw, coupon.cap) : raw;
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────
// Each product owns exactly its own `images` array.
// Images are sourced per-category so a saree never shows a sneaker thumbnail.
const INVENTORY = [
  // ── Women's Ethnic ──────────────────────────────────────────────────────────
  {
    id: "W-ETH-KRTI-LIBAS-FLR-01",
    name: "Libas Floral Straight Kurti",
    brand: "Libas",
    description: "Breathable rayon with block-print florals. Machine washable. Ships with matching dupatta.",
    gender: "women",
    category: "kurti",
    tags: ["ethnic", "rayon", "casual"],
    mrp: 1699,
    sellingPrice: 899,
    discountPct: 47,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1583391153254-8a5a9a2b8a0d?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    stock: { XS: 4, S: 7, M: 2, L: 0, XL: 5, XXL: 1 },
    rating: 4.3,
    reviewCount: 2841,
    isFeatured: true,
    material: "Rayon",
    fit: "Straight",
  },
  {
    id: "W-ETH-KRTI-BIBA-ANK-02",
    name: "BIBA Anarkali Embroidered Kurti",
    brand: "BIBA",
    description: "Chanderi silk with zari embroidery on yoke. Flared hem, 3/4 sleeves.",
    gender: "women",
    category: "kurti",
    tags: ["ethnic", "chanderi", "anarkali"],
    mrp: 3499,
    sellingPrice: 1799,
    discountPct: 49,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1624204386084-79b5a5e32fb7?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1583391153254-8a5a9a2b8a0d?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: { XS: 0, S: 3, M: 8, L: 6, XL: 2 },
    rating: 4.5,
    reviewCount: 1204,
    material: "Chanderi Silk",
    fit: "Flared",
  },
  {
    id: "W-ETH-KRTI-LIBAS-IKT-03",
    name: "Libas Cotton Ikat A-Line Kurti",
    brand: "Libas",
    description: "Handloom ikat weave in pure cotton. Side slits, round neck with contrast piping.",
    gender: "women",
    category: "kurti",
    tags: ["ethnic", "ikat", "handloom"],
    mrp: 1299,
    sellingPrice: 749,
    discountPct: 42,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1624204386084-79b5a5e32fb7?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1583391153254-8a5a9a2b8a0d?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    stock: { XS: 3, S: 9, M: 14, L: 7, XL: 4, XXL: 2 },
    rating: 4.2,
    reviewCount: 893,
    isNewArrival: true,
    material: "Pure Cotton",
    fit: "A-Line",
  },
  {
    id: "W-ETH-SAREE-TANEIRA-KNJ-01",
    name: "Taneira Kanjivaram Pure Silk Saree",
    brand: "Taneira",
    description: "Handwoven Kanjivaram with temple border and zari pallav. 5.5m length, unstitched blouse piece included.",
    gender: "women",
    category: "saree",
    tags: ["silk", "wedding", "traditional"],
    mrp: 18999,
    sellingPrice: 14499,
    discountPct: 24,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1609767742140-3a00d3c29e9b?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1570655652364-2e0a67455ac6?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["Free Size"],
    stock: { "Free Size": 8 },
    rating: 4.7,
    reviewCount: 387,
    isFeatured: true,
    material: "Pure Silk",
    fit: "Drape",
  },
  {
    id: "W-ETH-LHNG-KALKI-BRD-01",
    name: "KALKI Bridal Lehenga Choli Set",
    brand: "KALKI Fashion",
    description: "Heavy dupion silk with kundan embroidery. Includes matching choli and heavily embroidered dupatta.",
    gender: "women",
    category: "lehenga",
    tags: ["bridal", "silk", "festive"],
    mrp: 34999,
    sellingPrice: 24999,
    discountPct: 29,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1624204386084-79b5a5e32fb7?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1583391153254-8a5a9a2b8a0d?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: { XS: 1, S: 2, M: 3, L: 1, XL: 0 },
    rating: 4.8,
    reviewCount: 156,
    isFeatured: true,
    material: "Dupion Silk",
    fit: "Flared",
  },
  {
    id: "W-ETH-SUIT-BIBA-GEO-01",
    name: "BIBA Georgette Printed Suit Set",
    brand: "BIBA",
    description: "Three-piece set in lightweight georgette. Digital floral print. Includes kurta, palazzo, and dupatta.",
    gender: "women",
    category: "kurti",
    tags: ["ethnic", "georgette", "suit-set"],
    mrp: 4299,
    sellingPrice: 2199,
    discountPct: 49,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1624204386084-79b5a5e32fb7?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    stock: { XS: 2, S: 6, M: 11, L: 8, XL: 3, XXL: 1 },
    rating: 4.4,
    reviewCount: 2107,
    isNewArrival: true,
    material: "Georgette",
    fit: "Flared",
  },

  // ── Women's Western ──────────────────────────────────────────────────────────
  {
    id: "W-WST-TOP-HM-RFL-01",
    name: "H&M Ruffle-Sleeve Fusion Top",
    brand: "H&M",
    description: "Contemporary Indo-western crop top in viscose crepe. Pairs effortlessly with palazzo or high-waist jeans.",
    gender: "women",
    category: "fusion-top",
    tags: ["fusion", "casual", "crop"],
    mrp: 1499,
    sellingPrice: 799,
    discountPct: 47,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1581044777550-4cfa5c26c4e8?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: { XS: 6, S: 12, M: 9, L: 4, XL: 0 },
    rating: 4.0,
    reviewCount: 3201,
    isNewArrival: true,
    material: "Viscose Crepe",
    fit: "Crop",
  },
  {
    id: "W-WST-BLZR-ZARA-LNN-01",
    name: "Zara Tailored Linen-Blend Blazer",
    brand: "Zara",
    description: "Structured single-breasted blazer in linen-viscose. Padded shoulders, two-button front, interior welt pocket.",
    gender: "women",
    category: "fusion-top",
    tags: ["blazer", "linen", "office-wear"],
    mrp: 5999,
    sellingPrice: 3799,
    discountPct: 37,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1581044777550-4cfa5c26c4e8?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: { XS: 3, S: 5, M: 7, L: 4, XL: 2 },
    rating: 4.5,
    reviewCount: 678,
    isFeatured: true,
    material: "Linen-Viscose",
    fit: "Tailored",
  },
  {
    id: "W-WST-DNIM-LEVIS-711-01",
    name: "Levi's 711 Skinny Jeans",
    brand: "Levi's",
    description: "Mid-rise skinny in 4-way stretch denim. Classic 5-pocket design, zip fly. Runs true to size.",
    gender: "women",
    category: "denim",
    tags: ["jeans", "denim", "skinny"],
    mrp: 3999,
    sellingPrice: 2399,
    discountPct: 40,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1542574271-7f3b92e6c821?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1594938298870-7c60c4f3a2f7?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["28", "30", "32", "34"],
    stock: { "28": 5, "30": 8, "32": 3, "34": 1 },
    rating: 4.4,
    reviewCount: 5621,
    material: "Stretch Denim",
    fit: "Skinny",
  },

  // ── Men's Formal ────────────────────────────────────────────────────────────
  {
    id: "M-FRM-SHRT-PE-NVY-01",
    name: "Peter England Slim-Fit Formal Shirt",
    brand: "Peter England",
    description: "Cotton-rich poplin, solid navy. Anti-crease finish, easy iron. Machine washable at 30°C.",
    gender: "men",
    category: "shirt",
    tags: ["formal", "slim-fit", "office"],
    mrp: 1899,
    sellingPrice: 999,
    discountPct: 47,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 4, M: 1, L: 9, XL: 7, XXL: 3 },
    rating: 4.2,
    reviewCount: 8102,
    material: "Cotton Poplin",
    fit: "Slim",
  },
  {
    id: "M-FRM-SHRT-VH-CHK-01",
    name: "Van Heusen Checkered Casual Shirt",
    brand: "Van Heusen",
    description: "Yarn-dyed check in cotton-linen blend. Relaxed fit, button-down collar. Perfect for smart casual days.",
    gender: "men",
    category: "shirt",
    tags: ["casual", "check", "weekend"],
    mrp: 2299,
    sellingPrice: 1149,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 2, M: 6, L: 11, XL: 8, XXL: 4 },
    rating: 4.3,
    reviewCount: 4450,
    isNewArrival: true,
    material: "Cotton-Linen Blend",
    fit: "Regular",
  },
  {
    id: "M-FRM-BLZR-RAY-HRB-01",
    name: "Raymond Single-Breasted Blazer",
    brand: "Raymond",
    description: "Poly-viscose herringbone weave. Notch lapel, 2-button front, flap pockets with pick stitch. Dry-clean only.",
    gender: "men",
    category: "blazer",
    tags: ["formal", "herringbone", "corporate"],
    mrp: 8999,
    sellingPrice: 5399,
    discountPct: 40,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 2, M: 4, L: 6, XL: 3, XXL: 1 },
    rating: 4.6,
    reviewCount: 891,
    isFeatured: true,
    material: "Poly-Viscose",
    fit: "Tailored",
  },
  {
    id: "M-FRM-BLZR-RAY-WL-02",
    name: "Raymond Pure Wool Suit Blazer",
    brand: "Raymond",
    description: "Super 100s pure wool in charcoal grey. Half-canvassed construction, surgeon cuffs, AMF stitching throughout.",
    gender: "men",
    category: "blazer",
    tags: ["formal", "wool", "premium"],
    mrp: 14999,
    sellingPrice: 9999,
    discountPct: 33,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 1, M: 3, L: 5, XL: 2, XXL: 0 },
    rating: 4.8,
    reviewCount: 342,
    isFeatured: true,
    material: "Pure Wool",
    fit: "Tailored",
  },

  // ── Men's Casual ────────────────────────────────────────────────────────────
  {
    id: "M-CAS-TEE-BW-GFX-01",
    name: "Bewakoof Graphic Oversized Tee",
    brand: "Bewakoof",
    description: "240 GSM 100% combed cotton. Dropped shoulders, boxy silhouette. Pre-shrunk and bio-washed for softness.",
    gender: "men",
    category: "tshirt",
    tags: ["graphic", "oversized", "streetwear"],
    mrp: 999,
    sellingPrice: 499,
    discountPct: 50,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1583743814966-8d4d0ec66c64?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 15, M: 23, L: 18, XL: 9, XXL: 5 },
    rating: 4.1,
    reviewCount: 12403,
    isFeatured: true,
    material: "100% Combed Cotton",
    fit: "Oversized",
  },
  {
    id: "M-CAS-CHNO-SPY-SLM-01",
    name: "Spykar Slim Tapered Chinos",
    brand: "Spykar",
    description: "Stretch cotton twill with elasticated waistband. Ankle-length tapered leg, garment-washed for a lived-in feel.",
    gender: "men",
    category: "chinos",
    tags: ["twill", "slim", "smart-casual"],
    mrp: 2799,
    sellingPrice: 1399,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad01fcd?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1543087903-f5dfe6e7c284?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1473966968600-fa4cbed3ef3a?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["28", "30", "32", "34", "36"],
    stock: { "28": 3, "30": 7, "32": 5, "34": 2, "36": 0 },
    rating: 4.2,
    reviewCount: 2917,
    material: "Stretch Cotton Twill",
    fit: "Slim Tapered",
  },

  // ── Innerwear ────────────────────────────────────────────────────────────────
  {
    id: "M-INN-TRNK-AW-MDL-01",
    name: "AeroWeave UltraSoft MicroModal Trunk",
    brand: "AeroWeave",
    description: "MicroModal fabric with 4-way stretch, flatlock seams, and a no-ride-up waistband. Ultralight at 58g.",
    gender: "men",
    category: "innerwear",
    tags: ["trunk", "micromodal", "premium"],
    mrp: 999,
    sellingPrice: 649,
    discountPct: 35,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1583743814966-8d4d0ec66c64?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 20, M: 2, L: 14, XL: 9, XXL: 6 },
    rating: 4.5,
    reviewCount: 6720,
    isFeatured: true,
    material: "MicroModal",
    fit: "Trunk",
  },
  {
    id: "M-INN-BOXR-BL-SPC-01",
    name: "BreatheLite Cotton Boxer",
    brand: "BreatheLite",
    description: "Double-mercerised Supima cotton with vented side panels and a comfort-flex waistband that won't dig in.",
    gender: "men",
    category: "innerwear",
    tags: ["boxer", "supima", "comfortable"],
    mrp: 699,
    sellingPrice: 399,
    discountPct: 43,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad01fcd?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1543087903-f5dfe6e7c284?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1473966968600-fa4cbed3ef3a?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 25, M: 31, L: 19, XL: 12, XXL: 4 },
    rating: 4.2,
    reviewCount: 9011,
    isFeatured: true,
    material: "Supima Cotton",
    fit: "Boxer",
  },
  {
    id: "M-INN-TRNK-TL-BMB-01",
    name: "ThreadLux Bamboo Charcoal Trunk",
    brand: "ThreadLux",
    description: "Bamboo charcoal infusion provides natural odour control. Ultra-soft modal-spandex blend, tagless for zero irritation.",
    gender: "men",
    category: "innerwear",
    tags: ["trunk", "bamboo-charcoal", "odour-control"],
    mrp: 1299,
    sellingPrice: 849,
    discountPct: 35,
    gstRate: 0.05,
    images: [
      "https://images.unsplash.com/photo-1583743814966-8d4d0ec66c64?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&h=800&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&h=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 5, M: 8, L: 3, XL: 0, XXL: 2 },
    rating: 4.6,
    reviewCount: 2187,
    material: "Modal-Spandex",
    fit: "Trunk",
  },

  // ── Footwear — Sneakers ──────────────────────────────────────────────────────
  {
    id: "SHOE-NK-AJ1-LOW-BWR-01",
    name: "Nike Air Jordan 1 Low",
    brand: "Nike",
    description: "The icon. Full-grain leather upper with perforations for breathability. Encapsulated Air-Sole unit, rubber cupsole with herringbone traction. Colour: Black/White/Gym Red.",
    gender: "unisex",
    category: "sneakers",
    tags: ["sneakers", "basketball", "jordan", "lifestyle"],
    mrp: 11495,
    sellingPrice: 8995,
    discountPct: 21,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 2, "UK 7": 5, "UK 8": 7, "UK 9": 4, "UK 10": 2, "UK 11": 1 },
    rating: 4.8,
    reviewCount: 3894,
    isFeatured: true,
    material: "Full-Grain Leather",
    fit: "True to Size",
  },
  {
    id: "SHOE-AD-UBL-PKN-01",
    name: "Adidas Ultraboost Light",
    brand: "Adidas",
    description: "Engineered Primeknit+ upper adapts to your foot. LIGHTBOOST midsole is 30% lighter than standard Boost. Continental™ rubber outsole for all-weather grip.",
    gender: "unisex",
    category: "sports-shoes",
    tags: ["running", "boost", "performance"],
    mrp: 19999,
    sellingPrice: 13999,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 1, "UK 7": 3, "UK 8": 6, "UK 9": 8, "UK 10": 5, "UK 11": 2 },
    rating: 4.7,
    reviewCount: 2210,
    isFeatured: true,
    material: "Primeknit+ / LIGHTBOOST",
    fit: "Snug",
  },
  {
    id: "SHOE-PU-RSX-EFT-01",
    name: "Puma RS-X Efekt",
    brand: "Puma",
    description: "Retro running DNA meets forward design. Mesh and leather overlays, chunky EVA-injected RS foam midsole. Platform height 4cm. Statement colourway.",
    gender: "unisex",
    category: "sneakers",
    tags: ["chunky", "retro", "platform", "lifestyle"],
    mrp: 9999,
    sellingPrice: 4999,
    discountPct: 50,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 4, "UK 7": 9, "UK 8": 12, "UK 9": 7, "UK 10": 3, "UK 11": 0 },
    rating: 4.3,
    reviewCount: 1876,
    material: "Mesh + Leather Overlays",
    fit: "Roomy Toe Box",
  },
  {
    id: "SHOE-NK-PEG40-MSH-01",
    name: "Nike Air Zoom Pegasus 40",
    brand: "Nike",
    description: "Engineered mesh upper with Flywire cables for a dialled-in lockdown. Air Zoom unit under forefoot delivers explosive energy return. Wider toe box vs previous generation.",
    gender: "unisex",
    category: "sports-shoes",
    tags: ["running", "zoom", "training"],
    mrp: 11995,
    sellingPrice: 7495,
    discountPct: 37,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"],
    stock: { "UK 6": 3, "UK 7": 6, "UK 8": 9, "UK 9": 11, "UK 10": 7, "UK 11": 4, "UK 12": 1 },
    rating: 4.6,
    reviewCount: 4512,
    isNewArrival: true,
    material: "Engineered Mesh",
    fit: "True to Size",
  },
  {
    id: "SHOE-AD-FRM-LOW-WGD-01",
    name: "Adidas Originals Forum Low",
    brand: "Adidas",
    description: "Basketball heritage reborn. Smooth leather upper, iconic strap closure with Velcro. EVA cupsole for comfort on hardwood or pavement. White/Gold colourway.",
    gender: "unisex",
    category: "sneakers",
    tags: ["lifestyle", "heritage", "leather"],
    mrp: 8999,
    sellingPrice: 6299,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 2, "UK 7": 4, "UK 8": 8, "UK 9": 6, "UK 10": 3, "UK 11": 1 },
    rating: 4.5,
    reviewCount: 987,
    isFeatured: true,
    material: "Leather",
    fit: "True to Size",
  },
  {
    id: "SHOE-PU-VN3-NTR-01",
    name: "Puma Velocity Nitro 3",
    brand: "Puma",
    description: "NITRO foam midsole absorbs impact and springs back at 50%+ energy return. PWRTAPE overlay at midfoot for lateral stability during hard cornering. Race-day ready.",
    gender: "unisex",
    category: "sports-shoes",
    tags: ["running", "nitro", "performance", "race"],
    mrp: 11999,
    sellingPrice: 8399,
    discountPct: 30,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 1, "UK 7": 4, "UK 8": 7, "UK 9": 9, "UK 10": 5, "UK 11": 2 },
    rating: 4.7,
    reviewCount: 1653,
    isNewArrival: true,
    material: "NITRO Foam / Mesh",
    fit: "Snug Heel",
  },
  {
    id: "SHOE-NK-AF1-TRW-01",
    name: "Nike Air Force 1 '07 Low",
    brand: "Nike",
    description: "The shoe that started it all. Full-length Air cushioning, perforated leather upper, pivot point rubber sole. Triple-White colourway — a wardrobe essential.",
    gender: "unisex",
    category: "sneakers",
    tags: ["lifestyle", "af1", "classic"],
    mrp: 9995,
    sellingPrice: 7995,
    discountPct: 20,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 5, "UK 7": 8, "UK 8": 10, "UK 9": 7, "UK 10": 4, "UK 11": 2 },
    rating: 4.9,
    reviewCount: 8234,
    isFeatured: true,
    material: "Full-Grain Leather",
    fit: "Slightly Wide",
  },
  {
    id: "SHOE-AD-SMB-OG-GUM-01",
    name: "Adidas Originals Samba OG",
    brand: "Adidas",
    description: "Born on futsal courts in the 1950s, perfected by decades of street credibility. Suede overlays, gum outsole, debossed 3-Stripes on the side. Unmatched silhouette.",
    gender: "unisex",
    category: "sneakers",
    tags: ["samba", "classic", "suede", "lifestyle"],
    mrp: 10999,
    sellingPrice: 8499,
    discountPct: 23,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 3, "UK 7": 5, "UK 8": 9, "UK 9": 7, "UK 10": 4, "UK 11": 1 },
    rating: 4.8,
    reviewCount: 5109,
    isFeatured: true,
    material: "Leather / Suede",
    fit: "Slim",
  },
  {
    id: "SHOE-PU-SDE-XXI-68-01",
    name: "Puma Suede Classic XXI",
    brand: "Puma",
    description: "The Suede has been on the streets since '68. Soft suede upper, formstrip branding on the side, EVA outsole. Heritage never looked this affordable.",
    gender: "unisex",
    category: "sneakers",
    tags: ["suede", "heritage", "lifestyle"],
    mrp: 7999,
    sellingPrice: 3699,
    discountPct: 54,
    gstRate: 0.12,
    images: [
      "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=700&h=700&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=700&q=80",
    ],
    sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    stock: { "UK 6": 6, "UK 7": 10, "UK 8": 14, "UK 9": 9, "UK 10": 5, "UK 11": 2 },
    rating: 4.4,
    reviewCount: 3388,
    material: "Suede",
    fit: "True to Size",
  },
];

// Deduplicate and validate at module load — runs once, never per render.
const SAFE_INVENTORY = (() => {
  const seenIds = new Set();
  return INVENTORY.filter((product) => {
    if (!product.id || !product.name || !Array.isArray(product.images) || product.images.length === 0) return false;
    if (seenIds.has(product.id)) return false;
    seenIds.add(product.id);
    return true;
  });
})();

const ALL_BRANDS = [...new Set(SAFE_INVENTORY.map((p) => p.brand))].sort();

// ─── NAV TABS ─────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "all",           label: "All",                match: () => true },
  { id: "women-ethnic",  label: "Women's Ethnic",     match: (p) => ["kurti", "saree", "lehenga"].includes(p.category) },
  { id: "women-western", label: "Women's Western",    match: (p) => ["fusion-top", "denim"].includes(p.category) },
  { id: "men-formal",    label: "Men's Formal",       match: (p) => ["shirt", "blazer"].includes(p.category) },
  { id: "men-casual",    label: "Men's Casual",       match: (p) => ["tshirt", "chinos"].includes(p.category) },
  { id: "innerwear",     label: "Innerwear",          match: (p) => p.category === "innerwear" },
  { id: "sneakers",      label: "👟 Sneakers",        match: (p) => p.category === "sneakers" },
  { id: "sports-shoes",  label: "🏃 Sports Shoes",    match: (p) => p.category === "sports-shoes" },
  { id: "new-arrivals",  label: "✨ New Arrivals",    match: (p) => !!p.isNewArrival },
  { id: "deals",         label: "🔥 Deals",           match: (p) => p.discountPct >= 45 },
];

const DEFAULT_FILTERS = {
  gender: null,
  categories: [],
  brands: [],
  sizes: [],
  priceRange: [0, 40000],
  minDiscount: 0,
  sortBy: "relevance",
};

const FREE_DELIVERY_THRESHOLD = 499;

// ─── CART CONTEXT ─────────────────────────────────────────────────────────────
const CartCtx = createContext(null);

function cartReducer(state, action) {
  const matchesItem = (i) => i.productId === action.productId && i.size === action.size;

  switch (action.type) {
    case "ADD": {
      const existing = state.find(matchesItem);
      if (existing) return state.map((i) => matchesItem(i) ? { ...i, qty: i.qty + 1 } : i);
      return [...state, { productId: action.productId, size: action.size, qty: 1, addedAt: Date.now() }];
    }
    case "REMOVE":
      return state.filter((i) => !matchesItem(i));
    case "SET_QTY":
      if (action.qty <= 0) return state.filter((i) => !matchesItem(i));
      return state.map((i) => matchesItem(i) ? { ...i, qty: action.qty } : i);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addItem    = useCallback((productId, size) => { cartLog.success(`Added: ${productId} [${size}]`); dispatch({ type: "ADD",     productId, size }); }, []);
  const removeItem = useCallback((productId, size) => {                                                    dispatch({ type: "REMOVE",  productId, size }); }, []);
  const setQty     = useCallback((productId, size, qty) =>                                                 dispatch({ type: "SET_QTY", productId, size, qty }), []);
  const clearCart  = useCallback(() => { cartLog.warn("Cart cleared"); dispatch({ type: "CLEAR" }); }, []);

  const totalItems  = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotalRs  = useMemo(() => items.reduce((sum, i) => {
    const product = SAFE_INVENTORY.find((p) => p.id === i.productId);
    return sum + (product ? product.sellingPrice * i.qty : 0);
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

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const has = useCallback((id) => ids.has(id), [ids]);

  return (
    <WishCtx.Provider value={{ ids, toggle, has, count: ids.size }}>
      {children}
    </WishCtx.Provider>
  );
}

const useWish = () => useContext(WishCtx);

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const FALLBACK_IMG = "https://images.unsplash.com/photo-1490481928099-7e05e11d2a6e?auto=format&fit=crop&w=600&h=800&q=70";

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────
function RatingBadge({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
        {rating} ★
      </span>
      <span className="text-gray-400 text-xs">({count.toLocaleString("en-IN")})</span>
    </div>
  );
}

// ─── PRODUCT CARD SKELETON ────────────────────────────────────────────────────
function ProductCardSkeleton({ index }) {
  return (
    <div key={`skeleton-${index}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="w-full pt-[133%] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-14 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, onSelect }) {
  const { toggle, has } = useWish();
  const [isHovered, setIsHovered]   = useState(false);
  const inWishlist = has(product.id);

  // Explicitly reference this product's own images — never shared pools.
  const heroImage  = product.images[0];
  const hoverImage = product.images[1] ?? product.images[0];

  return (
    <article
      onClick={() => onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 cursor-pointer group relative flex flex-col h-full"
    >
      <button
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => { e.stopPropagation(); toggle(product.id); }}
        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md transition-transform active:scale-95 text-gray-600 hover:text-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={inWishlist ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-5 h-5 ${inWishlist ? "text-red-500" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>

      <div className="relative pt-[133%] overflow-hidden bg-gray-50">
        <img
          src={isHovered ? hoverImage : heroImage}
          alt={product.name}
          onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.discountPct >= 45 && (
          <span className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-sm">
            🔥 {product.discountPct}% OFF
          </span>
        )}
        {product.isNewArrival && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
            NEW
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-900 truncate">
              {product.brand}
            </span>
            <RatingBadge rating={product.rating} count={product.reviewCount} />
          </div>
          <h3 className="text-sm text-gray-600 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-base font-bold text-gray-900">
            ₹{product.sellingPrice.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-gray-400 line-through">
            ₹{product.mrp.toLocaleString("en-IN")}
          </span>
          <span className="text-xs font-semibold text-green-600">
            ({product.discountPct}% off)
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── SIZE SELECTOR ────────────────────────────────────────────────────────────
function SizeGrid({ product, selectedSize, onSelect }) {
  const lowStockSizes = product.sizes.filter((sz) => {
    const qty = product.stock[sz] ?? 0;
    return qty > 0 && qty <= 3;
  });

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">
        Select Size:{" "}
        {selectedSize && <span className="text-orange-600">{selectedSize}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {product.sizes.map((sz) => {
          const qty        = product.stock[sz] ?? 0;
          const isOutOfStock = qty === 0;
          const isLowStock   = qty > 0 && qty <= 3;
          const isSelected   = selectedSize === sz;

          return (
            <button
              key={sz}
              disabled={isOutOfStock}
              onClick={() => onSelect(sz)}
              className={`
                relative min-w-[44px] h-10 px-2 border rounded text-sm font-medium transition-all
                ${isOutOfStock
                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50 line-through"
                  : isSelected
                    ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-400"
                    : "border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-600"
                }
              `}
            >
              {sz}
              {isLowStock && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {lowStockSizes.length > 0 && (
        <p className="text-red-500 text-xs mt-2 font-medium">
          ⚡ Only a few left in some sizes!
        </p>
      )}
    </div>
  );
}

// ─── PRODUCT DETAIL MODAL ─────────────────────────────────────────────────────
// Owns its own `activeImg` state and resets it cleanly whenever `product.id` changes.
// Every image element is keyed by `{productId}-{imgIndex}` to prevent React from
// reusing a stale DOM node across different products.
function ProductDetailModal({ product, onClose }) {
  const { addItem }      = useCart();
  const { toggle, has }  = useWish();
  const [activeImg, setActiveImg]   = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [pincode, setPincode]       = useState("");
  const [pincodeMsg, setPincodeMsg] = useState(null);
  const [justAdded, setJustAdded]   = useState(false);
  const inWishlist = has(product.id);

  // Reset all modal-local state whenever the selected product changes.
  useEffect(() => {
    setActiveImg(0);
    setSelectedSize("");
    setPincode("");
    setPincodeMsg(null);
    setJustAdded(false);
  }, [product.id]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem(product.id, selectedSize);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const checkPincode = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeMsg({ ok: false, text: "Enter a valid 6-digit PIN code" });
      return;
    }
    const etaDays = pincode.startsWith("1") || pincode.startsWith("4") ? "1–2" : "3–5";
    setPincodeMsg({ ok: true, text: `✓ Delivery to ${pincode}: ${etaDays} business days` });
  };

  const taxableBase = product.sellingPrice / (1 + product.gstRate);
  const gstAmount   = product.sellingPrice - taxableBase;
  const gstLabel    = product.gstRate === 0.05 ? "5%" : "12%";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full md:max-w-3xl md:rounded-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          aria-label="Close modal"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image gallery — strictly scoped to this product's own images array */}
          <div className="md:w-2/5 flex-shrink-0">
            <div className="relative bg-gray-50 overflow-hidden" style={{ paddingBottom: "100%", minHeight: "280px" }}>
              <img
                key={`${product.id}-hero-${activeImg}`}
                src={product.images[activeImg]}
                alt={`${product.name} — view ${activeImg + 1}`}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
              {product.discountPct >= 40 && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  {product.discountPct}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail row — keyed per product+index to prevent cross-product DOM reuse */}
            <div className="flex gap-2 p-3 overflow-x-auto">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={`${product.id}-thumb-${idx}`}
                  onClick={() => setActiveImg(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`flex-shrink-0 w-14 h-14 rounded border-2 overflow-hidden transition-all ${
                    idx === activeImg
                      ? "border-orange-500 ring-1 ring-orange-300"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product details */}
          <div className="md:w-3/5 p-5 space-y-4">
            <div>
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-widest">
                {product.brand}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mt-1 leading-tight">
                {product.name}
              </h2>
              <div className="mt-2">
                <RatingBadge rating={product.rating} count={product.reviewCount} />
              </div>
            </div>

            <div className="flex items-baseline gap-3 pb-3 border-b border-gray-100">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatINR(product.sellingPrice)}
              </span>
              <span className="text-base text-gray-400 line-through">
                {formatINR(product.mrp)}
              </span>
              <span className="text-sm font-bold text-green-600">
                {product.discountPct}% off
              </span>
            </div>

            <p className="text-xs text-gray-400">
              Incl. {gstLabel} GST — Taxable {formatINR(Math.round(taxableBase))}, GST {formatINR(Math.round(gstAmount))}
            </p>

            <SizeGrid product={product} selectedSize={selectedSize} onSelect={setSelectedSize} />

            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>

            {(product.material || product.fit) && (
              <div className="flex gap-4 text-xs text-gray-500">
                {product.material && <span><span className="font-medium text-gray-700">Material:</span> {product.material}</span>}
                {product.fit      && <span><span className="font-medium text-gray-700">Fit:</span> {product.fit}</span>}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                  !selectedSize
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : justAdded
                      ? "bg-green-500 text-white"
                      : "bg-orange-500 text-white hover:bg-orange-600 active:scale-95"
                }`}
              >
                {!selectedSize ? "Select a Size" : justAdded ? "✓ Added to Cart" : "Add to Cart"}
              </button>
              <button
                onClick={() => toggle(product.id)}
                aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${
                  inWishlist ? "border-red-400 text-red-500 bg-red-50" : "border-gray-200 text-gray-400 hover:border-red-300"
                }`}
              >
                {inWishlist ? "♥" : "♡"}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">📍 Check Delivery</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter PIN code"
                  value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "").slice(0, 6)); setPincodeMsg(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") checkPincode(); }}
                  className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={checkPincode}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Check
                </button>
              </div>
              {pincodeMsg && (
                <p className={`text-xs mt-1.5 ${pincodeMsg.ok ? "text-green-600" : "text-red-500"}`}>
                  {pincodeMsg.text}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">Free delivery on orders above ₹499</p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                ["🔄", "Easy Returns", "30-day policy"],
                ["🛡️", "Authentic",    "100% Original"],
                ["🚚", "Fast Ship",    "2–5 business days"],
              ].map(([icon, title, sub]) => (
                <div key={title} className="text-center">
                  <div className="text-lg">{icon}</div>
                  <p className="text-[11px] font-semibold text-gray-700">{title}</p>
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

// ─── PRODUCT GRID ─────────────────────────────────────────────────────────────
// Uses product.id as the sole React key — never indexes.
// Renders skeletons during loading, empty-state on zero results.
function ProductGrid({ products, isLoading, onSelectProduct }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <ProductCardSkeleton key={`skeleton-${i}`} index={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <p className="text-gray-500 font-medium">No products match your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose }) {
  const { items, removeItem, setQty, clearCart, subtotalRs } = useCart();
  const [couponCode, setCouponCode]       = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError]     = useState(null);

  const applyCoupon = () => {
    const result = validateCoupon(couponCode, subtotalRs);
    if (result.ok) {
      setAppliedCoupon(result.coupon);
      setCouponError(null);
      checkoutLog.success(`Coupon applied: ${result.coupon.code}`);
    } else {
      setCouponError(result.error);
      setAppliedCoupon(null);
    }
  };

  const couponDiscount = appliedCoupon ? computeCouponDiscount(appliedCoupon, subtotalRs) : 0;
  const afterCoupon    = subtotalRs - couponDiscount;
  const delivery       = afterCoupon >= FREE_DELIVERY_THRESHOLD || subtotalRs === 0 ? 0 : 49;
  const grandTotal     = afterCoupon + delivery;

  const gstTotal = items.reduce((sum, item) => {
    const product = SAFE_INVENTORY.find((p) => p.id === item.productId);
    if (!product) return sum;
    return sum + (product.sellingPrice - product.sellingPrice / (1 + product.gstRate)) * item.qty;
  }, 0);

  const mrpTotal     = items.reduce((sum, item) => {
    const product = SAFE_INVENTORY.find((p) => p.id === item.productId);
    return sum + (product ? product.mrp * item.qty : 0);
  }, 0);
  const brandDiscount = mrpTotal - subtotalRs;

  const handleCheckout = () => {
    checkoutLog.info("Order placed", { items: items.length, total: grandTotal });
    alert(`🎉 Order Placed!\nTotal: ${formatINR(grandTotal)}\n\nThank you for shopping at Styloverse!`);
    clearCart();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-all ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`relative bg-white w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Shopping Bag ({items.reduce((s, i) => s + i.qty, 0)})
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🛍️</div>
              <p className="text-gray-500 font-medium">Your bag is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add items to get started</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm">
                Continue Shopping
              </button>
            </div>
          )}
          {items.map((item) => {
            const product = SAFE_INVENTORY.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={`${item.productId}|${item.size}`} className="flex gap-3 pb-4 border-b border-gray-50">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  className="w-20 h-24 object-cover rounded-lg bg-gray-50 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{product.brand}</p>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-gray-200 rounded">
                      <button onClick={() => setQty(item.productId, item.size, item.qty - 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100">−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                      <button onClick={() => setQty(item.productId, item.size, item.qty + 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100">+</button>
                    </div>
                    <span className="font-bold text-gray-900">{formatINR(product.sellingPrice * item.qty)}</span>
                  </div>
                  <button onClick={() => removeItem(item.productId, item.size)} className="text-xs text-red-400 hover:text-red-600 mt-1.5">
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
                <button onClick={applyCoupon} className="px-3 py-2 bg-orange-500 text-white text-sm font-semibold rounded hover:bg-orange-600">
                  Apply
                </button>
              </div>
              {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-green-600 text-xs font-medium">✓ {appliedCoupon.code} — saving {formatINR(couponDiscount)}</p>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-gray-400 text-xs hover:text-red-500">✕</button>
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-1">Try: FIRST20 · FESTIVE10 · FLAT150 · SOLE200</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>MRP Total</span><span>{formatINR(mrpTotal)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Brand Discount</span><span>−{formatINR(brandDiscount)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({appliedCoupon.code})</span><span>−{formatINR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 text-xs">
                <span>GST (incl.)</span><span>{formatINR(Math.round(gstTotal))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>{delivery === 0 ? <span className="text-green-600 font-medium">FREE</span> : `₹${delivery}`}</span>
              </div>
              {delivery === 0 && subtotalRs > 0 && (
                <p className="text-[11px] text-green-600">🎉 You saved ₹49 on delivery!</p>
              )}
              <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>{formatINR(grandTotal)}</span>
              </div>
              <p className="text-[11px] text-gray-400">*Inclusive of all taxes. No hidden charges.</p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm tracking-wide transition-colors"
            >
              Proceed to Checkout — {formatINR(grandTotal)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
function FilterPanel({ filters, setFilters, onClose }) {
  const toggleMultiSelect = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];

  const CATEGORIES = [
    { value: "kurti",        label: "Kurtis"       },
    { value: "saree",        label: "Sarees"        },
    { value: "lehenga",      label: "Lehenga"       },
    { value: "fusion-top",   label: "Fusion Tops"   },
    { value: "denim",        label: "Denim"         },
    { value: "shirt",        label: "Shirts"        },
    { value: "tshirt",       label: "T-Shirts"      },
    { value: "chinos",       label: "Chinos"        },
    { value: "blazer",       label: "Blazers"       },
    { value: "innerwear",    label: "Innerwear"     },
    { value: "sneakers",     label: "Sneakers"      },
    { value: "sports-shoes", label: "Sports Shoes"  },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Filters</h3>
        <div className="flex gap-3">
          <button
            onClick={() => { setFilters({ ...DEFAULT_FILTERS }); filterLog.warn("Filters reset"); }}
            className="text-xs text-orange-500 font-medium"
          >
            Clear All
          </button>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Gender</p>
          <div className="flex gap-2">
            {["men", "women"].map((g) => (
              <button
                key={g}
                onClick={() => setFilters((f) => ({ ...f, gender: f.gender === g ? null : g }))}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  filters.gender === g
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-gray-300 text-gray-600 hover:border-orange-300"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</p>
          <div className="space-y-1.5">
            {CATEGORIES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(value)}
                  onChange={() => toggleMultiSelect("categories", value)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {ALL_BRANDS.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleMultiSelect("brands", brand)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => toggleMultiSelect("sizes", sz)}
                className={`min-w-[40px] h-9 px-2 border rounded text-xs transition-all ${
                  filters.sizes.includes(sz)
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-gray-300 text-gray-600 hover:border-orange-300"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Price Range</p>
          {[
            ["Under ₹500",      0,      500],
            ["₹500–₹2,000",    500,    2000],
            ["₹2,000–₹10,000", 2000,  10000],
            ["₹10,000+",       10000, 40000],
          ].map(([label, min, max]) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer mb-1.5 group">
              <input
                type="radio"
                name="price"
                checked={filters.priceRange[0] === min && filters.priceRange[1] === max}
                onChange={() => setFilters((f) => ({ ...f, priceRange: [min, max] }))}
                className="w-4 h-4 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-orange-600">{label}</span>
            </label>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Min. Discount</p>
          {[0, 10, 20, 30, 40, 50].map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer mb-1.5 group">
              <input
                type="radio"
                name="discount"
                checked={filters.minDiscount === d}
                onChange={() => setFilters((f) => ({ ...f, minDiscount: d }))}
                className="w-4 h-4 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-orange-600">
                {d === 0 ? "All Discounts" : `${d}% and above`}
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
  const [step, setStep]           = useState("input");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp]             = useState("");
  const [error, setError]         = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const validateIdentifier = () => {
    const v = identifier.trim();
    if (!v) { setError("Please enter your mobile number or email"); return false; }
    if (!/^[6-9]\d{9}$/.test(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("Enter a valid 10-digit mobile number or email");
      return false;
    }
    setError("");
    return true;
  };

  const handleContinue = () => {
    if (!validateIdentifier()) return;
    authLog.info("Login attempt");
    setStep("otp");
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    authLog.success("OTP verified");
    setStep("success");
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="login-modal__card relative w-full max-w-sm"
        style={{
          background:     "rgba(255,255,255,0.90)",
          backdropFilter: "blur(24px) saturate(180%)",
          border:         "1px solid rgba(255,255,255,0.6)",
          borderRadius:   "24px",
          boxShadow:      "0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.5) inset",
        }}
      >
        <div className="relative p-8">
          <button onClick={onClose} className="absolute top-5 right-5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>

          <div className="text-center mb-6">
            <p className="text-2xl font-black tracking-tight">
              <span className="text-orange-500">STYLO</span><span className="text-gray-900">VERSE</span>
            </p>
            <p className="text-[10px] text-gray-400 tracking-widest mt-0.5">FASHION FOR BHARAT</p>
          </div>

          {step === "input" && (
            <>
              <h2 className="text-lg font-bold text-gray-900 text-center">Welcome back 👋</h2>
              <p className="text-sm text-gray-500 text-center mt-1 mb-5">Sign in to access orders, wishlist & exclusive deals</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">Mobile or Email</label>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="9876543210 or you@email.com"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all ${
                      error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    }`}
                  />
                  {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
                </div>
                <button onClick={handleContinue} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-sm tracking-wide transition-all shadow-md">
                  Continue →
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or sign in with</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[["G", "Google", "#4285F4"], ["F", "Facebook", "#1877F2"]].map(([letter, label, color]) => (
                    <button key={label} onClick={() => authLog.info(`Social login — ${label}`)} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="w-5 h-5 rounded-full text-white text-[11px] font-black flex items-center justify-center flex-shrink-0" style={{ background: color }}>{letter}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              <button onClick={() => { setStep("input"); setOtp(""); setError(""); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-4">← Back</button>
              <h2 className="text-lg font-bold text-gray-900">Enter OTP</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">6-digit code sent to <span className="font-semibold text-gray-800">{identifier}</span></p>
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className={`w-full px-4 py-3 rounded-xl border text-center text-xl font-bold tracking-[0.5em] focus:outline-none transition-all ${
                    error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  }`}
                />
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                <button onClick={handleVerifyOtp} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-sm tracking-wide transition-all shadow-md">
                  Verify OTP
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">You're in!</h2>
              <p className="text-sm text-gray-500 mt-1">Redirecting to your account…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HERO BANNERS ─────────────────────────────────────────────────────────────
const SNEAKER_SLIDES = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&h=700&q=80",
  "https://images.unsplash.com/photo-1600185365483-26d0a70ac334?auto=format&fit=crop&w=1200&h=700&q=80",
  "https://images.unsplash.com/photo-1608231387042-66d1773d3028?auto=format&fit=crop&w=1200&h=700&q=80",
];

function FootwearHeroBanner({ onShopSneakers, onShopSports }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((s) => (s + 1) % SNEAKER_SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "320px", background: "#0d0d0f" }}>
      {SNEAKER_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none"
          style={{ opacity: i === activeSlide ? 0.45 : 0 }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(110deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.12) 100%)", zIndex: 1 }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 px-8 md:px-14 py-12 md:py-16">
        <div className="flex-1 max-w-lg">
          <p className="text-orange-400 text-[11px] font-black tracking-[0.22em] uppercase mb-3">2026 Collection · New Drop</p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.05] tracking-tight">
            Your Next<br /><span className="text-orange-400 italic">Obsession</span><br />Has Landed.
          </h1>
          <p className="text-gray-300 mt-4 text-sm md:text-base leading-relaxed max-w-sm">
            Nike Air Jordans, Adidas Ultraboost, Puma RS-X — hand-picked drops from the biggest houses in footwear. Starting at <span className="text-white font-bold">₹3,699</span>.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button onClick={onShopSneakers} className="px-7 py-3.5 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black text-sm rounded-xl transition-all shadow-xl shadow-orange-600/30 tracking-wide">
              Shop Sneakers →
            </button>
            <button onClick={onShopSports} className="px-5 py-3.5 border border-white/30 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-colors">
              Sports Shoes
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {["🔥 15,000+ pairs sold", "⭐ 4.7 avg rating", "🚀 Same-day dispatch"].map((tag) => (
              <span key={tag} className="text-[11px] text-gray-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-6 z-10 flex gap-1.5">
        {SNEAKER_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setActiveSlide(i)} className={`rounded-full transition-all ${i === activeSlide ? "w-6 h-1.5 bg-orange-400" : "w-1.5 h-1.5 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
}

function FashionHeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = [
    { bg: "from-orange-50 to-rose-100",   label: "NEW COLLECTION",     headline: "Ethnic meets Modern",         sub: "Kurtis, Sarees & Lehengas at up to 50% off",        cta: "Explore Women's Ethnic", img: "https://images.unsplash.com/photo-1583391153254-8a5a9a2b8a0d?auto=format&fit=crop&w=800&h=600&q=80" },
    { bg: "from-blue-50 to-indigo-100",   label: "MEN'S FASHION",      headline: "Dress Sharp, Work Smarter",   sub: "Slim-fit shirts, blazers & chinos starting ₹499",   cta: "Shop Men's Formal",      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&h=600&q=80" },
    { bg: "from-emerald-50 to-teal-100",  label: "INNERWEAR ESSENTIALS",headline: "Comfort You Can't See",       sub: "MicroModal, Bamboo & Supima — premium innerwear",   cta: "Shop Innerwear",         img: "https://images.unsplash.com/photo-1624378439575-d8705ad01fcd?auto=format&fit=crop&w=800&h=600&q=80" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((s) => (s + 1) % slides.length), 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];
  return (
    <div className={`relative bg-gradient-to-br ${slide.bg} rounded-2xl overflow-hidden transition-all duration-700`} style={{ minHeight: "260px" }}>
      <div className="flex items-center justify-between h-full p-8 md:p-12">
        <div className="flex-1 max-w-lg">
          <span className="text-xs font-bold tracking-widest text-orange-500 uppercase">{slide.label}</span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 leading-tight">{slide.headline}</h1>
          <p className="text-gray-600 mt-2 text-sm">{slide.sub}</p>
          <button className="mt-5 px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md text-sm">
            {slide.cta} →
          </button>
        </div>
        <div className="hidden md:block w-60 h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-lg ml-8">
          <img src={slide.img} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActiveSlide(i)} className={`rounded-full transition-all ${i === activeSlide ? "bg-orange-500 w-8 h-1.5" : "bg-gray-300 w-1.5 h-1.5"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── BRAND MARQUEE ────────────────────────────────────────────────────────────
const MARQUEE_BRANDS = [
  { name: "Nike",          tagline: "Just Do It",            color: "#000000", bg: "#f1f5f9" },
  { name: "Adidas",        tagline: "Impossible is Nothing", color: "#000000", bg: "#f8fafc" },
  { name: "Puma",          tagline: "Forever Faster",        color: "#dc2626", bg: "#fee2e2" },
  { name: "Zara",          tagline: "Fashion Forward",       color: "#1e293b", bg: "#f1f5f9" },
  { name: "H&M",           tagline: "Fashion for All",       color: "#dc2626", bg: "#fef2f2" },
  { name: "Levi's",        tagline: "Denim Legacy",          color: "#1d4ed8", bg: "#dbeafe" },
  { name: "Libas",         tagline: "Ethnic Luxe",           color: "#7c3aed", bg: "#ede9fe" },
  { name: "BIBA",          tagline: "Timeless Ethnic",       color: "#db2777", bg: "#fce7f3" },
  { name: "Raymond",       tagline: "The Complete Man",      color: "#1e293b", bg: "#f1f5f9" },
  { name: "Taneira",       tagline: "Pure Silks",            color: "#0369a1", bg: "#e0f2fe" },
  { name: "KALKI Fashion", tagline: "Bridal Couture",        color: "#be185d", bg: "#fdf2f8" },
  { name: "Peter England", tagline: "Formal Authority",      color: "#0f766e", bg: "#ccfbf1" },
  { name: "Bewakoof",      tagline: "Gen Z Streetwear",      color: "#d97706", bg: "#fef3c7" },
  { name: "AeroWeave",     tagline: "Next-Gen Innerwear",    color: "#0891b2", bg: "#cffafe" },
  { name: "BreatheLite",   tagline: "Pure Cotton",           color: "#15803d", bg: "#dcfce7" },
];

function BrandMarquee({ onBrandClick }) {
  const doubled = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  return (
    <div className="mt-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex-shrink-0">Top Brands</h3>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 flex-shrink-0">Click to filter</span>
      </div>
      <div
        className="flex gap-3"
        style={{ animation: "marqueeScroll 38s linear infinite", width: "max-content", willChange: "transform" }}
        onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
        onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
      >
        {doubled.map((brand, idx) => (
          <button
            key={`${brand.name}-${idx}`}
            onClick={() => onBrandClick(brand.name)}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl border transition-all hover:scale-105 hover:shadow-md active:scale-95"
            style={{ background: brand.bg, borderColor: `${brand.color}30`, minWidth: "130px" }}
          >
            <span className="text-base font-black leading-tight text-center" style={{ color: brand.color }}>{brand.name}</span>
            <span className="text-[10px] font-medium text-gray-500">{brand.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TAXONOMY NAV ─────────────────────────────────────────────────────────────
function TaxonomyNav({ activeTab, onTabChange }) {
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeEl = nav.querySelector("[data-active='true']");
    activeEl?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeTab]);

  return (
    <nav className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-active={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-600 hover:text-orange-500 hover:border-orange-200"
                }`}
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
        🎉 Use code <strong>FIRST20</strong> for 20% off your first order · Free delivery above ₹499
      </div>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex-shrink-0">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-orange-500">STYLO</span><span className="text-gray-900">VERSE</span>
          </span>
          <p className="text-[10px] text-gray-400 -mt-0.5 tracking-widest">FASHION FOR BHARAT</p>
        </div>

        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
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
          <button onClick={onLoginClick} className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 transition-colors">
            <span className="text-lg">👤</span>
            <span className="text-[10px]">Account</span>
          </button>
          <button className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 relative transition-colors">
            <span className="text-lg">♡</span>
            <span className="text-[10px]">Wishlist</span>
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{wishCount}</span>
            )}
          </button>
          <button onClick={onCartClick} className="flex flex-col items-center text-gray-600 hover:text-orange-500 relative transition-colors">
            <span className="text-lg">🛍</span>
            <span className="text-[10px]">Bag</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isLoading, setIsLoading]           = useState(true);
  const [products, setProducts]             = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen]             = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [filters, setFilters]               = useState({ ...DEFAULT_FILTERS });
  const [activeTab, setActiveTab]           = useState("all");
  const [showLogin, setShowLogin]           = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("sv_login_dismissed")) {
      const timer = setTimeout(() => setShowLogin(true), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLoginClose = () => {
    sessionStorage.setItem("sv_login_dismissed", "1");
    setShowLogin(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setProducts(SAFE_INVENTORY);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const scrollToGrid = () => {
    document.getElementById("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchQuery("");
    setFilters({ ...DEFAULT_FILTERS });
    scrollToGrid();
  }, []);

  const handleShopSneakers = useCallback(() => { setActiveTab("sneakers");     setSearchQuery(""); setFilters({ ...DEFAULT_FILTERS }); scrollToGrid(); }, []);
  const handleShopSports   = useCallback(() => { setActiveTab("sports-shoes"); setSearchQuery(""); setFilters({ ...DEFAULT_FILTERS }); scrollToGrid(); }, []);

  const handleBrandFilter = useCallback((brandName) => {
    filterLog.info(`Brand filter: ${brandName}`);
    setFilters({ ...DEFAULT_FILTERS, brands: [brandName] });
    setActiveTab("all");
    setSearchQuery("");
    scrollToGrid();
  }, []);

  const tabMatcher = useMemo(
    () => NAV_TABS.find((t) => t.id === activeTab)?.match ?? (() => true),
    [activeTab]
  );

  const filteredProducts = useMemo(() => {
    let results = products.filter(tabMatcher);

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query)     ||
        p.brand.toLowerCase().includes(query)    ||
        p.tags.some((t) => t.includes(query))    ||
        p.category.includes(query)
      );
    }

    if (filters.gender)            results = results.filter((p) => p.gender === filters.gender || p.gender === "unisex");
    if (filters.categories.length) results = results.filter((p) => filters.categories.includes(p.category));
    if (filters.brands.length)     results = results.filter((p) => filters.brands.includes(p.brand));
    if (filters.sizes.length)      results = results.filter((p) => filters.sizes.some((s) => p.sizes.includes(s)));
    if (filters.minDiscount > 0)   results = results.filter((p) => p.discountPct >= filters.minDiscount);

    const [minPrice, maxPrice] = filters.priceRange;
    results = results.filter((p) => p.sellingPrice >= minPrice && p.sellingPrice <= maxPrice);

    switch (filters.sortBy) {
      case "price_asc":     results.sort((a, b) => a.sellingPrice - b.sellingPrice); break;
      case "price_desc":    results.sort((a, b) => b.sellingPrice - a.sellingPrice); break;
      case "discount_desc": results.sort((a, b) => b.discountPct  - a.discountPct);  break;
      case "rating_desc":   results.sort((a, b) => b.rating       - a.rating);       break;
      case "newest":        results.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0)); break;
      default:              results.sort((a, b) => (b.isFeatured   ? 1 : 0) - (a.isFeatured   ? 1 : 0));
    }

    return results;
  }, [products, tabMatcher, searchQuery, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.gender) count++;
    count += filters.categories.length + filters.brands.length + filters.sizes.length;
    if (filters.minDiscount > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 40000) count++;
    return count;
  }, [filters]);

  return (
    <CartProvider>
      <WishProvider>
        <div className="min-h-screen bg-gray-50 font-sans">
          <style>{`
            @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:.45; } }
            .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite; }
            @keyframes marqueeScroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
            .line-clamp-1 { overflow:hidden; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
            .line-clamp-2 { overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
            @keyframes springIn {
              0%   { transform:scale(0.80) translateY(20px); opacity:0; }
              55%  { transform:scale(1.04) translateY(-3px); opacity:1; }
              75%  { transform:scale(0.98) translateY(1px);              }
              100% { transform:scale(1)    translateY(0);    opacity:1; }
            }
            .login-modal__card { animation: springIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          `}</style>

          <Header
            onCartClick={() => setCartOpen(true)}
            onSearchChange={(v) => { setSearchQuery(v); if (activeTab !== "all") setActiveTab("all"); }}
            searchQuery={searchQuery}
            onLoginClick={() => setShowLogin(true)}
          />

          <TaxonomyNav activeTab={activeTab} onTabChange={handleTabChange} />

          <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <FootwearHeroBanner onShopSneakers={handleShopSneakers} onShopSports={handleShopSports} />
            <FashionHeroBanner />
            <BrandMarquee onBrandClick={handleBrandFilter} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["🚚", "Free Delivery",    "On orders above ₹499"],
                ["🔄", "Easy Returns",     "30-day hassle-free"   ],
                ["🛡️", "100% Authentic",   "Genuine brand products"],
                ["💳", "Secure Pay",       "UPI, Cards, Net Banking"],
              ].map(([icon, title, sub]) => (
                <div key={title} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {filters.brands.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">Filtered by brand:</span>
                {filters.brands.map((b) => (
                  <span key={b} className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    {b}
                    <button onClick={() => setFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== b) }))} className="text-orange-400 hover:text-orange-700">✕</button>
                  </span>
                ))}
                <button onClick={() => setFilters({ ...DEFAULT_FILTERS })} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
              </div>
            )}

            <div id="product-grid" className="flex gap-6">
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-32">
                  <FilterPanel filters={filters} setFilters={setFilters} />
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-gray-900">
                      {isLoading ? (
                        <span className="text-gray-400">Loading…</span>
                      ) : (
                        <>{filteredProducts.length.toLocaleString("en-IN")} <span className="font-normal text-gray-500">Products</span></>
                      )}
                    </h2>
                    <button
                      onClick={() => setFilterDrawerOpen(true)}
                      className="lg:hidden flex items-center gap-1.5 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:border-orange-400 hover:text-orange-600"
                    >
                      ⚙ Filters
                      {activeFilterCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                      )}
                    </button>
                    {activeFilterCount > 0 && (
                      <button onClick={() => setFilters({ ...DEFAULT_FILTERS })} className="hidden lg:inline text-xs text-orange-500 hover:underline">
                        Clear all ({activeFilterCount})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 hidden sm:inline">Sort:</span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
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

                <ProductGrid
                  products={filteredProducts}
                  isLoading={isLoading}
                  onSelectProduct={setSelectedProduct}
                />

                {!isLoading && filteredProducts.length === 0 && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => { setFilters({ ...DEFAULT_FILTERS }); setSearchQuery(""); setActiveTab("all"); }}
                      className="text-orange-500 text-sm font-medium hover:underline"
                    >
                      Reset all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>

          <footer className="bg-gray-900 text-gray-400 mt-16 py-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <p className="text-white font-bold text-lg mb-3">
                    <span className="text-orange-500">STYLO</span>VERSE
                  </p>
                  <p className="text-sm leading-relaxed">Fashion-forward e-commerce built for Bharat. Authentic brands, genuine products, pan-India delivery.</p>
                </div>
                {[
                  ["Company",  ["About Us",    "Careers",          "Press",          "Blog"]],
                  ["Help",     ["My Orders",   "Returns & Refunds","Track Order",    "Contact Us"]],
                  ["Policies", ["Privacy Policy","Terms of Use",   "GST Invoice",    "Shipping Policy"]],
                ].map(([title, links]) => (
                  <div key={title}>
                    <p className="text-white font-semibold mb-3">{title}</p>
                    <ul className="space-y-1.5">
                      {links.map((l) => (
                        <li key={l}><button className="text-sm hover:text-orange-400 transition-colors">{l}</button></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs">© 2026 Styloverse Pvt. Ltd. All rights reserved. CIN: U51909MH2026PTC000000</p>
                <div className="flex gap-3 text-xs">
                  {["UPI", "Visa", "Mastercard", "Rupay", "Net Banking"].map((m) => (
                    <span key={m} className="bg-gray-800 text-gray-300 px-2 py-1 rounded">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </footer>

          {selectedProduct && (
            <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          )}

          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

          {showLogin && <LoginModal onClose={handleLoginClose} />}

          {filterDrawerOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setFilterDrawerOpen(false)} />
              <div className="relative ml-auto bg-white w-80 h-full overflow-hidden shadow-2xl flex flex-col">
                <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setFilterDrawerOpen(false)} />
                <div className="p-4 border-t border-gray-100">
                  <button onClick={() => setFilterDrawerOpen(false)} className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg text-sm">
                    Show {filteredProducts.length} Results
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
