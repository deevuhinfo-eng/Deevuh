import prisma from '../../config/database.js';

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let cache: { data: Record<string, string>; expiry: number } | null = null;

export interface CODSettings {
  enabled: boolean;
  maxOrderAmount: number;
  bookingAmount: number;
  freeAbove: number;
  maxPerCustomer: number;
  blacklistEnabled: boolean;
  allowSaleItems: boolean;
  requirePhoneVerification: boolean;
  autoCancelHours: number;
  allowedStates: string[];
}

/**
 * Fetch all site settings from DB. Results are cached in-memory with a 60-second TTL.
 */
export const getSettings = async (): Promise<Record<string, string>> => {
  if (cache && Date.now() < cache.expiry) {
    return cache.data;
  }

  const rows = await prisma.siteSettings.findMany();
  const data: Record<string, string> = {};
  for (const row of rows) {
    data[row.key] = row.value;
  }

  cache = { data, expiry: Date.now() + CACHE_TTL_MS };
  console.log(`[Settings] Cache refreshed with ${rows.length} setting(s).`);
  return data;
};

/**
 * Return a single setting value by key (uses cached data).
 */
export const getSetting = async (key: string): Promise<string | undefined> => {
  const all = await getSettings();
  return all[key];
};

/**
 * Bulk upsert settings and invalidate the in-memory cache.
 */
export const updateSettings = async (
  updates: Record<string, string>
): Promise<void> => {
  const entries = Object.entries(updates);
  if (entries.length === 0) return;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  // Invalidate cache so the next read fetches fresh data
  cache = null;
  console.log(`[Settings] Updated ${entries.length} setting(s) and invalidated cache.`);
};

/**
 * Return a fully-typed COD configuration object derived from site settings.
 * Missing keys fall back to safe defaults.
 */
export const getCODSettings = async (): Promise<CODSettings> => {
  const s = await getSettings();

  return {
    enabled: s['cod_enabled'] === 'true',
    maxOrderAmount: Number(s['cod_max_order_amount'] || '10000'),
    bookingAmount: Number(s['cod_booking_amount'] || '0'),
    freeAbove: Number(s['cod_free_above'] || '0'),
    maxPerCustomer: Number(s['cod_max_per_customer'] || '5'),
    blacklistEnabled: s['cod_blacklist_enabled'] !== 'false', // default true
    allowSaleItems: s['cod_allow_sale_items'] === 'true',
    requirePhoneVerification: s['cod_require_phone_verification'] === 'true',
    autoCancelHours: Number(s['cod_auto_cancel_hours'] || '24'),
    allowedStates: s['cod_allowed_states']
      ? s['cod_allowed_states'].split(',').map((st) => st.trim()).filter(Boolean)
      : [],
  };
};
