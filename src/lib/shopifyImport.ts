// Minimal Shopify product CSV importer (client-side).
// Parses standard Shopify "Products" export and writes to `products` +
// `product_variants` via the Supabase client. Sizes are taken from whichever
// Option column is named like "Size" (case-insensitive); otherwise Option1
// Value is used as-is. The `size` column accepts arbitrary text.

import { supabase } from "@/integrations/supabase/client";

/** RFC-4180-ish CSV parser supporting quoted fields and escaped quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        // ignore — handle \n
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  // Trailing field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ImportResult = {
  productsCreated: number;
  variantsCreated: number;
  productsSkipped: number;
  errors: string[];
};

type ParsedProduct = {
  handle: string;
  title: string;
  description: string;
  category: string;
  image: string;
  variants: { size: string; price: number; stock_count: number }[];
};

export function groupShopifyRows(rows: string[][]): ParsedProduct[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iHandle = idx("Handle");
  const iTitle = idx("Title");
  const iBody = idx("Body (HTML)");
  const iType = idx("Type");
  const iImage = idx("Image Src");
  const iVariantImage = idx("Variant Image");
  const iPrice = idx("Variant Price");
  const iQty = idx("Variant Inventory Qty");

  const optionNameIdx = [idx("Option1 Name"), idx("Option2 Name"), idx("Option3 Name")];
  const optionValueIdx = [idx("Option1 Value"), idx("Option2 Value"), idx("Option3 Value")];

  if (iHandle < 0) throw new Error("CSV is missing required 'Handle' column.");

  const stripHtml = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  const map = new Map<string, ParsedProduct>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const handle = (row[iHandle] || "").trim();
    if (!handle) continue;

    let p = map.get(handle);
    if (!p) {
      const title = (iTitle >= 0 && row[iTitle]?.trim()) || handle;
      p = {
        handle,
        title,
        description: iBody >= 0 ? stripHtml(row[iBody] || "") : "",
        category: iType >= 0 ? (row[iType] || "").trim() : "",
        image: iImage >= 0 ? (row[iImage] || "").trim() : "",
        variants: [],
      };
      map.set(handle, p);
    }

    // Fill missing parent fields from subsequent rows if needed
    if (!p.image && iImage >= 0 && row[iImage]?.trim()) p.image = row[iImage].trim();
    if (!p.description && iBody >= 0 && row[iBody]?.trim()) p.description = stripHtml(row[iBody]);

    // Determine the "size" value: prefer the option column named like "size",
    // otherwise fall back to Option1 Value if present.
    let size = "";
    for (let k = 0; k < 3; k++) {
      const ni = optionNameIdx[k];
      const vi = optionValueIdx[k];
      if (vi < 0) continue;
      const optName = ni >= 0 ? (row[ni] || "").trim() : "";
      const optVal = (row[vi] || "").trim();
      if (!optVal) continue;
      if (/size|volume|ml/i.test(optName) || /\d+\s*ml\b/i.test(optVal)) {
        size = optVal;
        break;
      }
      if (!size) size = optVal; // fallback to first non-empty value
    }
    if (!size) continue; // not a variant row

    const priceStr = iPrice >= 0 ? (row[iPrice] || "").trim() : "";
    const price = parseFloat(priceStr);
    if (Number.isNaN(price)) continue;

    const qty = iQty >= 0 ? parseInt((row[iQty] || "0").trim(), 10) : 0;

    // Deduplicate sizes per product (keep first)
    if (p.variants.some((v) => v.size.toLowerCase() === size.toLowerCase())) continue;

    p.variants.push({ size, price, stock_count: Number.isNaN(qty) ? 0 : qty });
  }

  return [...map.values()].filter((p) => p.variants.length > 0);
}

export async function importShopifyCSV(
  text: string,
  onProgress?: (done: number, total: number, currentTitle: string) => void
): Promise<ImportResult> {
  const rows = parseCSV(text);
  const products = groupShopifyRows(rows);
  const result: ImportResult = {
    productsCreated: 0,
    variantsCreated: 0,
    productsSkipped: 0,
    errors: [],
  };

  // Preload existing handles to skip duplicates.
  const { data: existing } = await supabase.from("products").select("handle");
  const existingHandles = new Set((existing ?? []).map((p) => p.handle));

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    onProgress?.(i, products.length, p.title);

    const handle = slugify(p.handle) || slugify(p.title);
    if (existingHandles.has(handle)) {
      result.productsSkipped++;
      continue;
    }

    const basePrice = Math.min(...p.variants.map((v) => v.price));
    const totalInventory = p.variants.reduce((s, v) => s + v.stock_count, 0);

    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        title: p.title,
        handle,
        price: basePrice,
        description: p.description,
        image: p.image,
        image_url: p.image,
        category: p.category,
        inventory_count: totalInventory,
        available: totalInventory > 0,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      result.errors.push(`${p.title}: ${error?.message ?? "insert failed"}`);
      continue;
    }

    const variantRows = p.variants.map((v, idx) => ({
      product_id: inserted.id,
      size: v.size,
      price: v.price,
      stock_count: v.stock_count,
      sort_order: idx,
    }));
    const { error: vErr } = await supabase.from("product_variants").insert(variantRows);
    if (vErr) {
      result.errors.push(`${p.title} variants: ${vErr.message}`);
      continue;
    }

    result.productsCreated++;
    result.variantsCreated += variantRows.length;
    existingHandles.add(handle);
  }

  onProgress?.(products.length, products.length, "");
  return result;
}
