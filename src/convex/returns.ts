import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const returns = await ctx.db.query("returns").collect();
    return returns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("returns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getItems = query({
  args: { returnId: v.id("returns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("returnItems")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("returns").collect();
    return all
      .filter(
        (r) =>
          r.returnNumber.toLowerCase().includes(term) ||
          (r.originalInvoice && r.originalInvoice.toLowerCase().includes(term))
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    returnType: v.string(),
    date: v.string(),
    customerId: v.optional(v.id("customers")),
    supplierId: v.optional(v.id("suppliers")),
    originalInvoice: v.optional(v.string()),
    totalAmount: v.number(),
    subtotal: v.number(),
    totalDiscount: v.optional(v.number()),
    totalTax: v.optional(v.number()),
    reason: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        unit: v.string(),
        quantity: v.number(),
        purchasePrice: v.number(),
        retailPrice: v.number(),
        salePrice: v.number(),
        cost: v.number(),
        margin: v.number(),
        marginPercent: v.number(),
        discount: v.optional(v.number()),
        extraDiscount: v.optional(v.number()),
        taxPercent: v.optional(v.number()),
        taxAmount: v.optional(v.number()),
        netRate: v.number(),
        total: v.number(),
        batchNumber: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        barcode: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { items, ...returnData } = args;
    const now = Date.now();
    const returnCount = await ctx.db.query("returns").collect();
    const seq = returnCount.length + 1;
    const returnNumber = `RET-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(seq).padStart(3, "0")}`;

    const returnId = await ctx.db.insert("returns", {
      ...returnData,
      returnNumber,
      status: "completed",
      createdBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of items) {
      await ctx.db.insert("returnItems", {
        returnId,
        ...item,
      });

      // Update product stock
      const product = await ctx.db.get(item.productId);
      if (product) {
        if (returnData.returnType === "sales_return") {
          // Sales return: stock increases
          await ctx.db.patch(item.productId, {
            currentStock: product.currentStock + item.quantity,
            updatedAt: now,
          });
          await ctx.db.insert("inventory", {
            productId: item.productId,
            type: "sales_return",
            quantity: item.quantity,
            referenceId: returnId,
            referenceType: "sales_return",
            notes: `Sales Return: ${returnNumber}`,
            createdAt: now,
          });
        } else {
          // Purchase return: stock decreases
          await ctx.db.patch(item.productId, {
            currentStock: Math.max(0, product.currentStock - item.quantity),
            updatedAt: now,
          });
          await ctx.db.insert("inventory", {
            productId: item.productId,
            type: "purchase_return",
            quantity: -item.quantity,
            referenceId: returnId,
            referenceType: "purchase_return",
            notes: `Purchase Return: ${returnNumber}`,
            createdAt: now,
          });
        }
      }
    }

    // Adjust customer balance for sales returns (credit)
    if (returnData.returnType === "sales_return" && returnData.customerId) {
      const customer = await ctx.db.get(returnData.customerId);
      if (customer) {
        await ctx.db.patch(returnData.customerId, {
          currentBalance: customer.currentBalance - returnData.totalAmount,
        });
      }
    }

    // Adjust supplier balance for purchase returns
    if (returnData.returnType === "purchase_return" && returnData.supplierId) {
      const supplier = await ctx.db.get(returnData.supplierId);
      if (supplier) {
        await ctx.db.patch(returnData.supplierId, {
          currentBalance: supplier.currentBalance - returnData.totalAmount,
        });
      }
    }

    return returnId;
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
    const all = await ctx.db.query("returns").collect();

    const completed = all.filter((r) => r.status === "completed");
    const todayReturns = completed.filter((r) => r.date === today);
    const monthReturns = completed.filter((r) => r.date >= monthStart);

    return {
      todayTotal: todayReturns.reduce((sum, r) => sum + r.totalAmount, 0),
      monthTotal: monthReturns.reduce((sum, r) => sum + r.totalAmount, 0),
      totalCount: completed.length,
    };
  },
});
