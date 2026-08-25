#!/usr/bin/env bun
/**
 * Reads a text file of product names (one per line, or space-separated)
 * and generates a Convex seed function.
 */

import { readFileSync, writeFileSync } from "fs";

const inputPath = process.argv[2] || "scripts/inventory_products.txt";
const outputPath = "src/convex/seedInventoryProducts.ts";

const raw = readFileSync(inputPath, "utf-8");

// Split by newlines, trim each line, filter empty
let names = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

// Deduplicate (case-insensitive), preserving first occurrence
const seen = new Set<string>();
const unique: string[] = [];
for (const name of names) {
  const key = name.toLowerCase();
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(name);
  }
}

console.log(`Input lines: ${names.length}`);
console.log(`Unique names: ${unique.length}`);

// Generate TypeScript array string
const arrayStr = unique.map((n) => `  ${JSON.stringify(n)},`).join("\n");

const tsCode = `import { internalMutation } from "./_generated/server";

const INVENTORY_NAMES = [
${arrayStr}
];

export const seedInventoryProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").collect();
    const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < INVENTORY_NAMES.length; i++) {
      const name = INVENTORY_NAMES[i];
      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }

      const code = \`INV-\${String(i + 1).padStart(4, "0")}\`;
      await ctx.db.insert("products", {
        code,
        name,
        unit: "pcs",
        purchasePrice: 0,
        retailPrice: 0,
        currentStock: 0,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      added++;
    }

    return { added, skipped, total: INVENTORY_NAMES.length };
  },
});
`;

writeFileSync(outputPath, tsCode);
console.log(`Wrote ${outputPath} with ${unique.length} product names`);
