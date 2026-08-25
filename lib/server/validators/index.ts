import { z } from "zod";

// ==========================================
// Authentication Schemas
// ==========================================
export const loginSchema = z.object({
  email: z.string().email("Invalid email address format").optional(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "TAX_OFFICER",
      "MANUFACTURER",
      "IMPORTER",
      "BUSINESS_EMPLOYEE",
      "AUDITOR",
      "CONSUMER",
    ])
    .optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
}).refine((data) => data.email || data.role, {
  message: "Either email or role must be provided for authentication",
});

// ==========================================
// Batch Registration & DPP Minting Schemas
// ==========================================
export const createBatchSchema = z.object({
  productName: z.string().min(2, "Product name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  hsCode: z.string().regex(/^\d{4}\.\d{2}$/, "HS Code must follow standard format (e.g. 1509.10)"),
  description: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit: z.string().optional().default("Units"),
  productionDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  expiryDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  factoryLocation: z.string().min(2, "Factory location is required"),
  baseCost: z.number().positive("Base cost must be positive"),
  standardVatRate: z.number().min(0).max(1).default(0.13),
  exciseRate: z.number().min(0).max(1).default(0.02),
  statutoryMrp: z.number().positive("Statutory MRP must be positive"),
  carbonFootprintKg: z.number().min(0).default(1.2),
  mintDppCount: z.number().int().min(1).max(100).default(5),
});

// ==========================================
// Fiscal E-Invoice & Itemization Schemas
// ==========================================
export const invoiceItemSchema = z.object({
  serialNumber: z.string().optional(),
  batchId: z.string().min(1, "Batch ID is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  productName: z.string().min(1, "Product name is required"),
  hsCode: z.string().min(1, "HS Code is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z.number().positive("Unit price must be greater than 0"),
  mrp: z.number().positive("Statutory MRP is required").optional(),
  discount: z.number().min(0).default(0),
});

export const createInvoiceSchema = z.object({
  invoiceType: z
    .enum(["B2B_SUPPLY", "B2C_RETAIL", "IMPORT_INVOICE", "EXPORT_INVOICE"])
    .default("B2C_RETAIL"),
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerTaxPin: z.string().optional(),
  buyerOrgId: z.string().optional(),
  buyerType: z.enum(["BUSINESS", "INDIVIDUAL_CONSUMER", "GOVERNMENT"]).default("INDIVIDUAL_CONSUMER"),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "DIGITAL_WALLET", "CARD"])
    .default("CARD"),
});

// ==========================================
// Customs Bill of Entry Schemas
// ==========================================
export const createCustomsDeclarationSchema = z.object({
  productSummary: z.string().min(3, "Cargo summary is required"),
  hsCode: z.string().regex(/^\d{4}\.\d{2}$/, "HS Code must follow standard format (e.g. 8517.13)"),
  portOfOrigin: z.string().min(2, "Port of origin is required"),
  portOfEntry: z.string().min(2, "Port of entry is required"),
  declaredValueUsd: z.number().positive("Declared USD CIF value must be greater than 0"),
  batchIds: z.array(z.string()).optional(),
});

export const updateCustomsStatusSchema = z.object({
  declarationId: z.string().min(1, "Declaration ID is required"),
  action: z.enum(["APPROVE_CLEARANCE", "HOLD_INSPECTION", "REJECT"]),
  officerNotes: z.string().min(3, "Officer inspection notes are required"),
});

// ==========================================
// Tax Policy & Simulator Schemas
// ==========================================
export const updateTaxRuleSchema = z.object({
  hsCode: z.string().regex(/^\d{4}\.\d{2}$/, "HS Code must follow format (e.g. 1509.10)"),
  category: z.string().optional(),
  description: z.string().optional(),
  standardVatRate: z.number().min(0).max(1),
  exciseDutyRate: z.number().min(0).max(1).default(0),
  customsDutyRate: z.number().min(0).max(1).default(0),
  luxuryTaxRate: z.number().min(0).max(1).default(0),
  maxProfitMarginCap: z.number().min(0).max(1).default(0.20),
  statutoryPriceCap: z.number().positive().optional(),
});

export const simulateTaxSchema = z.object({
  hsCode: z.string().default("1509.10"),
  baseAmount: z.number().positive().default(1000),
  quantity: z.number().positive().default(1),
  isImport: z.boolean().default(false),
  offeredPrice: z.number().positive().optional(),
  statutoryMrp: z.number().positive().optional(),
});

// ==========================================
// Fraud Alert & Whistleblower Schemas
// ==========================================
export const submitWhistleblowerSchema = z.object({
  serialNumber: z.string().optional(),
  storeName: z.string().min(2, "Store name is required"),
  city: z.string().min(2, "City / Location is required"),
  issueType: z.string().min(2, "Issue category is required"),
  description: z.string().min(5, "Detailed incident description is required"),
  pricePaid: z.number().positive().optional(),
  statutoryMrp: z.number().positive().optional(),
});

export const updateFraudStatusSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
  status: z.enum([
    "OPEN",
    "UNDER_INVESTIGATION",
    "CONFIRMED_FRAUD",
    "RESOLVED_FALSE_POSITIVE",
  ]),
  actionNotes: z.string().min(3, "Resolution notes are required"),
});

// ==========================================
// Inventory Receipt Schemas
// ==========================================
export const receiveInventorySchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().positive().optional(),
  retailPrice: z.number().positive("Retail selling price must be positive"),
});
