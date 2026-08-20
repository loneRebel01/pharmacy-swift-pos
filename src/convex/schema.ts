import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.PHARMACIST),
  v.literal(ROLES.CASHIER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      permissions: v.optional(
        v.object({
          canDelete: v.optional(v.boolean()),
          canModifyPrice: v.optional(v.boolean()),
          canApplyDiscount: v.optional(v.boolean()),
          canApplyExtraDiscount: v.optional(v.boolean()),
          canCreditSale: v.optional(v.boolean()),
          canEditPurchase: v.optional(v.boolean()),
          canAdjustStock: v.optional(v.boolean()),
          canViewReports: v.optional(v.boolean()),
          canManageUsers: v.optional(v.boolean()),
        })
      ),
      isActive: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
    }).index("email", ["email"]),

    products: defineTable({
      code: v.string(),
      barcode: v.optional(v.string()),
      name: v.string(),
      genericName: v.optional(v.string()),
      brand: v.optional(v.string()),
      manufacturer: v.optional(v.string()),
      category: v.optional(v.string()),
      subcategory: v.optional(v.string()),
      batchNumber: v.optional(v.string()),
      rackNumber: v.optional(v.string()),
      unit: v.string(),
      purchasePrice: v.number(),
      retailPrice: v.number(),
      wholesalePrice: v.optional(v.number()),
      tax: v.optional(v.number()),
      discount: v.optional(v.number()),
      expiryDate: v.optional(v.string()),
      manufacturingDate: v.optional(v.string()),
      minimumStock: v.optional(v.number()),
      maximumStock: v.optional(v.number()),
      supplierId: v.optional(v.id("suppliers")),
      imageUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      currentStock: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_code", ["code"])
      .index("by_barcode", ["barcode"])
      .index("by_name", ["name"])
      .index("by_generic", ["genericName"])
      .index("by_brand", ["brand"])
      .index("by_batch", ["batchNumber"])
      .index("by_category", ["category"])
      .index("by_supplier", ["supplierId"]),

    suppliers: defineTable({
      name: v.string(),
      companyName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      ntn: v.optional(v.string()),
      email: v.optional(v.string()),
      previousBalance: v.optional(v.number()),
      currentBalance: v.number(),
      notes: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_name", ["name"])
      .index("by_phone", ["phone"]),

    customers: defineTable({
      name: v.string(),
      mobile: v.optional(v.string()),
      address: v.optional(v.string()),
      creditLimit: v.optional(v.number()),
      previousBalance: v.optional(v.number()),
      currentBalance: v.number(),
      notes: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_name", ["name"])
      .index("by_mobile", ["mobile"]),

    purchases: defineTable({
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
      status: v.string(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_date", ["date"])
      .index("by_supplier", ["supplierId"])
      .index("by_status", ["status"]),

    purchaseItems: defineTable({
      purchaseId: v.id("purchases"),
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
      .index("by_purchase", ["purchaseId"])
      .index("by_product", ["productId"]),

    sales: defineTable({
      customerId: v.optional(v.id("customers")),
      invoiceNumber: v.string(),
      date: v.string(),
      paymentMethod: v.string(),
      subtotal: v.number(),
      totalDiscount: v.optional(v.number()),
      totalTax: v.optional(v.number()),
      totalAmount: v.number(),
      cashReceived: v.optional(v.number()),
      changeReturned: v.optional(v.number()),
      status: v.string(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_date", ["date"])
      .index("by_customer", ["customerId"])
      .index("by_status", ["status"]),

    saleItems: defineTable({
      saleId: v.id("sales"),
      productId: v.id("products"),
      productName: v.string(),
      unit: v.string(),
      quantity: v.number(),
      retailPrice: v.number(),
      salePrice: v.number(),
      discount: v.optional(v.number()),
      extraDiscount: v.optional(v.number()),
      taxPercent: v.optional(v.number()),
      taxAmount: v.optional(v.number()),
      margin: v.optional(v.number()),
      marginPercent: v.optional(v.number()),
      total: v.number(),
      netRate: v.number(),
      batchNumber: v.optional(v.string()),
      expiryDate: v.optional(v.string()),
    })
      .index("by_sale", ["saleId"])
      .index("by_product", ["productId"]),

    inventory: defineTable({
      productId: v.id("products"),
      type: v.string(),
      quantity: v.number(),
      referenceId: v.optional(v.string()),
      referenceType: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_product", ["productId"])
      .index("by_type", ["type"])
      .index("by_date", ["createdAt"]),

    activityLogs: defineTable({
      userId: v.optional(v.id("users")),
      action: v.string(),
      module: v.string(),
      details: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_date", ["createdAt"]),

    heldTransactions: defineTable({
      type: v.string(),
      data: v.any(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_type", ["type"]),

    returns: defineTable({
      returnNumber: v.string(),
      returnType: v.string(), // "sales_return" or "purchase_return"
      date: v.string(),
      customerId: v.optional(v.id("customers")),
      supplierId: v.optional(v.id("suppliers")),
      originalInvoice: v.optional(v.string()),
      subtotal: v.number(),
      totalDiscount: v.optional(v.number()),
      totalTax: v.optional(v.number()),
      totalAmount: v.number(),
      reason: v.optional(v.string()),
      status: v.string(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_type", ["returnType"])
      .index("by_date", ["date"])
      .index("by_customer", ["customerId"])
      .index("by_supplier", ["supplierId"]),

    returnItems: defineTable({
      returnId: v.id("returns"),
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
      .index("by_return", ["returnId"])
      .index("by_product", ["productId"]),
  },
  {
    schemaValidation: false,
  }
);

export default schema;
