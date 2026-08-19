import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const purchases = await ctx.db.query("purchases").collect();
    return purchases.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getItems = query({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchaseItems")
      .withIndex("by_purchase", (q) => q.eq("purchaseId", args.purchaseId))
      .collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("purchases").collect();
    return all
      .filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(term) ||
          (p.billNumber && p.billNumber.toLowerCase().includes(term))
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    supplierId: v.optional(v.id("suppliers")),
    invoiceNumber: v.string(),
    invoiceAmount: v.optional(v.number()),
    billNumber: v.optional(v.string()),
    date: v.string(),
    dueDate: v.optional(v.string()),
    billDate: v.optional(v.string()),
    paymentMode: v.string(),
    purchaseTax: v.optional(v.number()),
    loadingExpense: v.optional(v.number()),
    freightExpense: v.optional(v.number()),
    otherExpense: v.optional(v.number()),
    additionalAmount: v.optional(v.number()),
    additionalDiscount: v.optional(v.number()),
    advanceTax: v.optional(v.number()),
    advanceTaxPercent: v.optional(v.number()),
    advanceTaxValue: v.optional(v.number()),
    totalAmount: v.number(),
    comments: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        unit: v.string(),
        quantity: v.number(),
        purchasePrice: v.number(),
        retailPrice: v.number(),
        cost: v.number(),
        margin: v.number(),
        marginPercent: v.number(),
        discount: v.optional(v.number()),
        extraDiscount: v.optional(v.number()),
        taxPercent: v.optional(v.number()),
        taxAmount: v.optional(v.number()),
        netRate: v.number(),
        total: v.number(),
        finalTotal: v.number(),
        batchNumber: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        pack: v.optional(v.number()),
        unitQuantity: v.optional(v.number()),
        commission: v.optional(v.number()),
        barcode: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { items, ...purchaseData } = args;
    const now = Date.now();
    const purchaseId = await ctx.db.insert("purchases", {
      ...purchaseData,
      status: "completed",
      createdBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of items) {
      await ctx.db.insert("purchaseItems", {
        purchaseId,
        ...item,
      });

      // Update product stock
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          currentStock: product.currentStock + item.quantity,
          updatedAt: now,
        });
      }

      // Log inventory
      await ctx.db.insert("inventory", {
        productId: item.productId,
        type: "purchase",
        quantity: item.quantity,
        referenceId: purchaseId,
        referenceType: "purchase",
        notes: `Purchase: ${purchaseData.invoiceNumber}`,
        createdAt: now,
      });
    }

    // Update supplier balance
    if (purchaseData.supplierId) {
      const supplier = await ctx.db.get(purchaseData.supplierId);
      if (supplier) {
        await ctx.db.patch(purchaseData.supplierId, {
          currentBalance:
            supplier.currentBalance + purchaseData.totalAmount,
        });
      }
    }

    return purchaseId;
  },
});

export const remove = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "deleted" });
  },
});

export const hold = mutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("heldTransactions", {
      type: "purchase",
      data: args.data,
      createdAt: Date.now(),
    });
  },
});

export const getHeld = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("heldTransactions")
      .withIndex("by_type", (q) => q.eq("type", "purchase"))
      .collect();
  },
});

export const removeHeld = mutation({
  args: { id: v.id("heldTransactions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];
    const all = await ctx.db.query("purchases").collect();

    const todayPurchases = all.filter(
      (p) => p.date === today && p.status === "completed"
    );
    const monthPurchases = all.filter(
      (p) => p.date >= monthStart && p.status === "completed"
    );

    return {
      todayTotal: todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
      monthTotal: monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
      totalCount: all.filter((p) => p.status === "completed").length,
    };
  },
});
