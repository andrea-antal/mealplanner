/**
 * Client-side unit conversion and portion scaling for recipe ingredients.
 *
 * Handles:
 * - Parsing quantity strings ("1/2", "1 1/2", "2-3")
 * - Volume <-> weight conversion using ingredient density lookup
 * - Category-based default unit preferences (baking -> weight, spices -> volume)
 * - Portion multiplier scaling (0.5x, 1x, 2x, 3x)
 */

// ── Quantity Parsing ─────────────────────────────────────────────────

/** Parse a quantity string into a numeric value. Returns null if unparseable. */
export function parseQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Range like "2-3" -- use midpoint for scaling
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    return (lo + hi) / 2;
  }

  // Mixed number: "1 1/2"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Fraction: "1/2"
  const fracMatch = s.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // Plain number
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/** Format a number back to a friendly string (fractions where nice). */
export function formatQuantity(n: number): string {
  if (n <= 0) return '0';

  const whole = Math.floor(n);
  const frac = n - whole;

  const fractions: [number, string][] = [
    [0, ''],
    [0.125, '\u215B'],
    [0.25, '\u00BC'],
    [1 / 3, '\u2153'],
    [0.5, '\u00BD'],
    [2 / 3, '\u2154'],
    [0.75, '\u00BE'],
  ];

  const tolerance = 0.04;
  const match = fractions.find(([val]) => Math.abs(frac - val) < tolerance);

  if (match) {
    const [, symbol] = match;
    if (!symbol) return whole.toString();
    return whole > 0 ? `${whole}${symbol}` : symbol;
  }

  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

// ── Unit Normalization ───────────────────────────────────────────────

export type VolumeUnit = 'tsp' | 'tbsp' | 'cup' | 'ml' | 'l' | 'fl_oz';
export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';
export type MeasurementUnit = VolumeUnit | WeightUnit | 'pinch' | 'whole' | 'unknown';

const UNIT_ALIASES: Record<string, MeasurementUnit> = {
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tb: 'tbsp',
  cup: 'cup', cups: 'cup',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  'fl oz': 'fl_oz', 'fluid ounce': 'fl_oz', 'fluid ounces': 'fl_oz', 'fl_oz': 'fl_oz',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  pinch: 'pinch', dash: 'pinch',
};

export function normalizeUnit(raw: string): MeasurementUnit {
  return UNIT_ALIASES[raw.trim().toLowerCase()] ?? 'unknown';
}

export function isVolumeUnit(u: MeasurementUnit): u is VolumeUnit {
  return ['tsp', 'tbsp', 'cup', 'ml', 'l', 'fl_oz'].includes(u);
}

export function isWeightUnit(u: MeasurementUnit): u is WeightUnit {
  return ['g', 'kg', 'oz', 'lb'].includes(u);
}

// ── Volume and Weight conversion factors ────────────────────────────

const ML_PER_UNIT: Record<VolumeUnit, number> = {
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  ml: 1,
  l: 1000,
  fl_oz: 29.574,
};

const G_PER_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

function toML(qty: number, unit: VolumeUnit): number {
  return qty * ML_PER_UNIT[unit];
}

function fromML(ml: number, unit: VolumeUnit): number {
  return ml / ML_PER_UNIT[unit];
}

function toGrams(qty: number, unit: WeightUnit): number {
  return qty * G_PER_UNIT[unit];
}

function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / G_PER_UNIT[unit];
}

// ── Ingredient Density Table (g per mL) ─────────────────────────────

const INGREDIENT_DENSITY: Record<string, number> = {
  // Flours
  'all-purpose flour': 0.529, 'all purpose flour': 0.529, 'ap flour': 0.529, flour: 0.529,
  'bread flour': 0.550, 'cake flour': 0.487, 'whole wheat flour': 0.512,
  'almond flour': 0.423, 'coconut flour': 0.536,
  // Sugars
  sugar: 0.845, 'granulated sugar': 0.845, 'white sugar': 0.845,
  'brown sugar': 0.830, 'light brown sugar': 0.830, 'dark brown sugar': 0.847,
  'powdered sugar': 0.560, 'confectioners sugar': 0.560, 'icing sugar': 0.560,
  // Fats
  butter: 0.959, 'unsalted butter': 0.959, 'salted butter': 0.959,
  oil: 0.920, 'vegetable oil': 0.920, 'olive oil': 0.916, 'canola oil': 0.920, 'coconut oil': 0.925,
  // Dairy and Liquids
  milk: 1.035, 'whole milk': 1.035, 'skim milk': 1.035,
  cream: 1.008, 'heavy cream': 1.008, 'whipping cream': 1.008,
  'sour cream': 1.013, yogurt: 1.030, 'greek yogurt': 1.06, buttermilk: 1.030, water: 1.0,
  // Starches
  cornstarch: 0.541, 'corn starch': 0.541,
  // Leaveners and baking
  'baking powder': 0.921, 'baking soda': 0.921,
  salt: 1.217, 'kosher salt': 0.640, 'table salt': 1.217,
  // Cocoa
  cocoa: 0.440, 'cocoa powder': 0.440, 'unsweetened cocoa': 0.440,
  // Other common
  honey: 1.420, 'maple syrup': 1.320, molasses: 1.420, 'peanut butter': 1.090,
  'vanilla extract': 0.880, vanilla: 0.880,
  oats: 0.390, 'rolled oats': 0.390, rice: 0.750,
};

function findDensity(ingredientName: string): number | null {
  const lower = ingredientName.toLowerCase().trim();

  if (INGREDIENT_DENSITY[lower] !== undefined) {
    return INGREDIENT_DENSITY[lower];
  }

  for (const [key, density] of Object.entries(INGREDIENT_DENSITY)) {
    if (lower.includes(key) || key.includes(lower)) {
      return density;
    }
  }

  return null;
}

// ── Ingredient Categorization ────────────────────────────────────────

export type IngredientCategory = 'baking' | 'spice' | 'liquid' | 'produce' | 'protein' | 'other';

const BAKING_KEYWORDS = [
  'flour', 'sugar', 'butter', 'cocoa', 'baking powder', 'baking soda',
  'cornstarch', 'corn starch', 'powdered sugar', 'confectioners',
  'brown sugar', 'yeast', 'cream of tartar',
];

const SPICE_KEYWORDS = [
  'salt', 'pepper', 'cinnamon', 'cumin', 'paprika', 'turmeric', 'oregano',
  'basil', 'thyme', 'rosemary', 'garlic powder', 'onion powder', 'chili powder',
  'nutmeg', 'cloves', 'cardamom', 'ginger powder', 'cayenne', 'coriander',
  'mustard powder', 'vanilla extract', 'vanilla',
];

const LIQUID_KEYWORDS = [
  'milk', 'water', 'cream', 'oil', 'broth', 'stock', 'juice', 'wine',
  'vinegar', 'soy sauce', 'fish sauce', 'honey', 'maple syrup', 'molasses',
  'buttermilk', 'yogurt',
];

export function categorizeIngredient(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  if (BAKING_KEYWORDS.some(kw => lower.includes(kw))) return 'baking';
  if (SPICE_KEYWORDS.some(kw => lower.includes(kw))) return 'spice';
  if (LIQUID_KEYWORDS.some(kw => lower.includes(kw))) return 'liquid';
  return 'other';
}

export function defaultUnitPreference(
  ingredientName: string,
  unit: MeasurementUnit,
  quantity: number | null,
): 'weight' | 'volume' | 'original' {
  const category = categorizeIngredient(ingredientName);

  // Small quantities of spices always stay as volume
  if (category === 'spice' && unit === 'tsp' && quantity !== null && quantity <= 2) {
    return 'original';
  }

  // Baking ingredients default to weight
  if (category === 'baking' && isVolumeUnit(unit)) {
    return 'weight';
  }

  // Liquids default to volume
  if (category === 'liquid' && isWeightUnit(unit)) {
    return 'volume';
  }

  return 'original';
}

// ── Ingredient Line Parsing ──────────────────────────────────────────

export interface ParsedIngredient {
  raw: string;
  quantity: number | null;
  quantityRaw: string;
  unit: MeasurementUnit;
  unitRaw: string;
  name: string;
  category: IngredientCategory;
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmed = line.trim();

  const qtyPattern = /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*/;
  const qtyMatch = trimmed.match(qtyPattern);

  let quantity: number | null = null;
  let quantityRaw = '';
  let rest = trimmed;

  if (qtyMatch) {
    quantityRaw = qtyMatch[1].trim();
    quantity = parseQuantity(quantityRaw);
    rest = trimmed.slice(qtyMatch[0].length);
  }

  const unitKeys = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
  let unit: MeasurementUnit = 'unknown';
  let unitRaw = '';

  for (const alias of unitKeys) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^(${escaped})\\.?(?:\\s+|$)`, 'i');
    const unitMatch = rest.match(pattern);
    if (unitMatch) {
      unitRaw = unitMatch[1];
      unit = UNIT_ALIASES[alias];
      rest = rest.slice(unitMatch[0].length);
      break;
    }
  }

  const name = rest.trim();
  const category = categorizeIngredient(name || trimmed);

  if (quantity === null && unit === 'unknown') {
    return {
      raw: trimmed, quantity: null, quantityRaw: '', unit: 'whole',
      unitRaw: '', name: trimmed, category,
    };
  }

  return {
    raw: trimmed, quantity, quantityRaw,
    unit: unit === 'unknown' ? 'whole' : unit,
    unitRaw, name: name || trimmed, category,
  };
}

// ── Conversion ───────────────────────────────────────────────────────

export interface ConvertedIngredient {
  display: string;
  quantity: number | null;
  unit: MeasurementUnit;
  wasConverted: boolean;
}

function bestWeightUnit(grams: number): WeightUnit {
  return grams >= 1000 ? 'kg' : 'g';
}

function bestVolumeUnit(ml: number): VolumeUnit {
  if (ml >= 1000) return 'l';
  if (ml >= 200) return 'cup';
  if (ml >= 15) return 'tbsp';
  return 'tsp';
}

function displayUnit(unit: MeasurementUnit): string {
  const labels: Partial<Record<MeasurementUnit, string>> = {
    tsp: 'tsp', tbsp: 'tbsp', cup: 'cup', ml: 'mL', l: 'L',
    fl_oz: 'fl oz', g: 'g', kg: 'kg', oz: 'oz', lb: 'lb', pinch: 'pinch',
  };
  return labels[unit] ?? '';
}

function pluralizeUnit(unit: MeasurementUnit, qty: number): string {
  const label = displayUnit(unit);
  if (!label) return '';
  const pluralizable = ['cup', 'pinch'];
  if (pluralizable.includes(label) && qty > 1) return label + 's';
  return label;
}

export function convertIngredient(
  parsed: ParsedIngredient,
  targetSystem: 'weight' | 'volume',
): ConvertedIngredient | null {
  if (parsed.quantity === null) return null;

  const { quantity, unit, name } = parsed;

  // Already in target system
  if (targetSystem === 'weight' && isWeightUnit(unit)) {
    return {
      display: `${formatQuantity(quantity)} ${pluralizeUnit(unit, quantity)} ${name}`,
      quantity, unit, wasConverted: false,
    };
  }
  if (targetSystem === 'volume' && isVolumeUnit(unit)) {
    return {
      display: `${formatQuantity(quantity)} ${pluralizeUnit(unit, quantity)} ${name}`,
      quantity, unit, wasConverted: false,
    };
  }

  const density = findDensity(name);
  if (!density) return null;

  if (targetSystem === 'weight' && isVolumeUnit(unit)) {
    const ml = toML(quantity, unit);
    const grams = ml * density;
    const best = bestWeightUnit(grams);
    const converted = fromGrams(grams, best);
    return {
      display: `${formatQuantity(converted)} ${pluralizeUnit(best, converted)} ${name}`,
      quantity: converted, unit: best, wasConverted: true,
    };
  }

  if (targetSystem === 'volume' && isWeightUnit(unit)) {
    const grams = toGrams(quantity, unit);
    const ml = grams / density;
    const best = bestVolumeUnit(ml);
    const converted = fromML(ml, best);
    return {
      display: `${formatQuantity(converted)} ${pluralizeUnit(best, converted)} ${name}`,
      quantity: converted, unit: best, wasConverted: true,
    };
  }

  return null;
}

// ── Portion Scaling ──────────────────────────────────────────────────

export function scaleIngredient(
  ingredientLine: string,
  multiplier: number,
  unitOverride?: 'weight' | 'volume' | null,
): string {
  const parsed = parseIngredientLine(ingredientLine);

  if (parsed.quantity === null) return ingredientLine;

  const scaled = parsed.quantity * multiplier;

  if (unitOverride) {
    const scaledParsed = { ...parsed, quantity: scaled };
    const converted = convertIngredient(scaledParsed, unitOverride);
    if (converted) return converted.display;
  }

  const unitLabel = parsed.unitRaw
    ? pluralizeUnit(parsed.unit, scaled) || parsed.unitRaw
    : '';
  const parts = [formatQuantity(scaled), unitLabel, parsed.name].filter(Boolean);
  return parts.join(' ');
}

export function scaleAllIngredients(
  ingredients: string[],
  multiplier: number,
  unitMode: 'original' | 'weight' | 'volume' = 'original',
): string[] {
  return ingredients.map(line => {
    if (unitMode === 'original') {
      return scaleIngredient(line, multiplier, null);
    }
    return scaleIngredient(line, multiplier, unitMode);
  });
}
