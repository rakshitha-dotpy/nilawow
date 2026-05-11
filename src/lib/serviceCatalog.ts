/** Salon / jewellery POS catalog — grouped for fast entry on Add Record. */

export type ServiceCategory = {
  id: string;
  label: string;
  items: readonly string[];
};

/** Jewellery — full list (Browse full catalog). Order matches business spec. */
export const JEWELLERY_ITEMS = [
  "Aaram",
  "Bangle",
  "Bracelet",
  "Dollar",
  "Ear ring",
  "Kada",
  "Kolusu",
  "Long chain",
  "Long chain with dollar",
  "Nose pin",
  "Nadhiya Ear ring",
  "Ring",
  "Saradu",
  "Saradu with moppu",
  "Short chain",
  "Short chain with dollar",
  "Necklace",
] as const;

/** Impon — full list (Browse full catalog). */
export const IMPON_ITEMS = [
  "Impon aaram",
  "Impon necklace",
  "Impon attigai",
  "Impon ring",
  "Impon chain",
  "Impon bangle",
  "Impon dollar chain",
] as const;

/** Other — full list (Browse full catalog). */
export const OTHER_ITEMS = ["Fancy & Cosmetics"] as const;

export const SERVICE_CATALOG: ServiceCategory[] = [
  { id: "jewellery", label: "Jewellery", items: JEWELLERY_ITEMS },
  { id: "impon", label: "Impon", items: IMPON_ITEMS },
  { id: "other", label: "Other", items: OTHER_ITEMS },
];

/** Flat list for search / validation (25 items). */
export const ALL_SERVICE_ITEMS: string[] = SERVICE_CATALOG.flatMap((c) => [...c.items]);

/** Expected catalog size — if this fails, a row was dropped or duplicated. */
export const CATALOG_ITEM_TOTAL =
  JEWELLERY_ITEMS.length + IMPON_ITEMS.length + OTHER_ITEMS.length;

/**
 * Quick chips only (subset). Full catalog lives in SERVICE_CATALOG / Browse picker.
 * Keep this short to avoid visual clutter.
 */
export const QUICK_SERVICE_CHIPS: readonly string[] = [
  "Aaram",
  "Bangle",
  "Ring",
  "Short chain",
  "Necklace",
  "Ear ring",
  "Impon necklace",
  "Impon ring",
  "Fancy & Cosmetics",
];
