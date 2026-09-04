// Peraturan perniagaan teras sistem PPE.
// RUJUK: Spesifikasi Sistem PPE, Bahagian 6.1 & 6.2 — kekalkan tepat.

export type Jawatan = "STAFF & PENYELIA" | "PEMANDU" | "PEKERJA AM";

export const JAWATAN_OPTIONS: Jawatan[] = [
  "STAFF & PENYELIA",
  "PEMANDU",
  "PEKERJA AM",
];

export type Kategori =
  | "Safety Helmet"
  | "Safety Vest"
  | "Safety Shoes"
  | "Uniform";

export const KATEGORI_LIST: Kategori[] = [
  "Safety Helmet",
  "Safety Vest",
  "Safety Shoes",
  "Uniform",
];

/** §6.2 — peraturan saiz & kuantiti setiap kategori. */
export const CATEGORY_RULES: Record<
  Kategori,
  { needsSize: boolean; sizeOptions: string[] | null; qtyEditable: boolean }
> = {
  "Safety Helmet": { needsSize: false, sizeOptions: null, qtyEditable: false },
  "Safety Vest": {
    needsSize: true,
    sizeOptions: ["S", "M", "L", "XL", "XXL"],
    qtyEditable: false,
  },
  "Safety Shoes": {
    needsSize: true,
    sizeOptions: ["5", "6", "7", "8", "9", "10", "11", "12"],
    qtyEditable: false,
  },
  Uniform: {
    needsSize: true,
    sizeOptions: ["S", "M", "L", "XL", "XXL"],
    qtyEditable: true,
  },
};

/** §6.1 — kelayakan PPE mengikut kumpulan jawatan. Setiap entri = { kategori, varian, itemId }. */
export interface EligibleItem {
  itemId: string;
  category: Kategori;
  variant: string;
  name: string;
  unit: string;
}

export const GROUP_ITEMS: Record<Jawatan, EligibleItem[]> = {
  "STAFF & PENYELIA": [
    {
      itemId: "helmet-putih",
      category: "Safety Helmet",
      variant: "Putih",
      name: "Safety Helmet Putih",
      unit: "unit",
    },
    {
      itemId: "vest-staff",
      category: "Safety Vest",
      variant: "Staff",
      name: "Safety Vest Staff",
      unit: "unit",
    },
    {
      itemId: "shoes-black-hammer",
      category: "Safety Shoes",
      variant: "Black Hammer",
      name: "Safety Shoes Black Hammer",
      unit: "pasang",
    },
  ],
  PEMANDU: [
    {
      itemId: "helmet-kuning",
      category: "Safety Helmet",
      variant: "Kuning",
      name: "Safety Helmet Kuning",
      unit: "unit",
    },
    {
      itemId: "vest-am",
      category: "Safety Vest",
      variant: "Pekerja Am",
      name: "Safety Vest Pekerja Am",
      unit: "unit",
    },
    {
      itemId: "shoes-black-hammer",
      category: "Safety Shoes",
      variant: "Black Hammer",
      name: "Safety Shoes Black Hammer",
      unit: "pasang",
    },
    {
      itemId: "uniform-oren",
      category: "Uniform",
      variant: "Oren",
      name: "Uniform Oren",
      unit: "set",
    },
  ],
  "PEKERJA AM": [
    {
      itemId: "helmet-kuning",
      category: "Safety Helmet",
      variant: "Kuning",
      name: "Safety Helmet Kuning",
      unit: "unit",
    },
    {
      itemId: "vest-am",
      category: "Safety Vest",
      variant: "Pekerja Am",
      name: "Safety Vest Pekerja Am",
      unit: "unit",
    },
    {
      itemId: "shoes-safety-king",
      category: "Safety Shoes",
      variant: "Safety King",
      name: "Safety Shoes Safety King",
      unit: "pasang",
    },
    {
      itemId: "uniform-oren",
      category: "Uniform",
      variant: "Oren",
      name: "Uniform Oren",
      unit: "set",
    },
  ],
};

/** Semua item PPE unik (untuk seed data / rujukan stok). */
export const ALL_PPE_ITEMS: EligibleItem[] = Array.from(
  new Map(
    Object.values(GROUP_ITEMS)
      .flat()
      .map((item) => [item.itemId, item])
  ).values()
);

/** Ambang amaran stok rendah — §6.6. */
export const LOW_STOCK_THRESHOLD = 8;

export function eligibleItemsFor(jawatan: Jawatan | string): EligibleItem[] {
  return GROUP_ITEMS[jawatan as Jawatan] ?? [];
}
