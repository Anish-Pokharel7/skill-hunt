import { z } from "zod";

// ==========================================
// Authentication Schemas
// ==========================================
export const userRolesEnum = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "GOVERNMENT_OFFICIAL",
  "SELLER",
  "CONSUMER",
  "TAX_OFFICER",
  "MANUFACTURER",
  "IMPORTER",
  "BUSINESS_EMPLOYEE",
  "AUDITOR",
]);

export const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: userRolesEnum.default("CONSUMER"),
  orgId: z.string().optional(),
  organizationName: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
});

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email address format").optional(),
    role: userRolesEnum.optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  })

  .refine((data) => data.email || data.role, {
    message: "Either email or role must be provided for authentication",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address format"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Verification token is required"),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]),
  reason: z.string().min(5, "Reason for status change must be at least 5 characters"),
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

// ==========================================
// Phase 2 — Category Management Schemas
// ==========================================
export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

// ==========================================
// Phase 2 — Seller Registration Schemas
// ==========================================
export const createSellerSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200),
  registrationNumber: z
    .string()
    .min(5, "Business registration number is required"),
  panVatNumber: z
    .string()
    .min(9, "PAN/VAT number must be at least 9 characters")
    .max(20),
  contactEmail: z.string().email("Valid contact email is required"),
  contactPhone: z.string().optional(),
  address: z.string().min(5, "Full business address is required").max(300),
});

export const updateSellerSchema = createSellerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export const verifySellerSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
  verificationNotes: z
    .string()
    .min(10, "Verification notes must be at least 10 characters"),
});

// ==========================================
// Phase 2 — Product Management Schemas
// ==========================================
export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required").max(300),
  description: z.string().max(2000).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  categoryId: z.string().min(1, "Category is required"),
  manufacturerName: z.string().max(200).optional(),
  countryOfOrigin: z.string().default("Nepal"),
  originType: z.enum(["IMPORTED", "DOMESTIC_MANUFACTURED"]).default("DOMESTIC_MANUFACTURED"),
  isNepalManufactured: z.boolean().default(true),
  isVatApplicable: z.boolean().default(true),
  vatRate: z.number().min(0).max(1).default(0.13),
  actualCost: z.number().positive("Actual cost must be positive"),
  consumerPrice: z.number().positive("Consumer/MRP price must be positive"),
  currency: z.string().default("NPR"),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export const verifyProductSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "FLAGGED"]),
  verificationNotes: z
    .string()
    .min(10, "Verification notes must be at least 10 characters"),
  rejectionReason: z.string().optional(),
});

export const uploadProductDocumentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  documentType: z.enum([
    "LAB_CERTIFICATE",
    "BILL_OF_ENTRY",
    "TAX_CLEARANCE",
    "INVOICE_COPY",
    "MANUFACTURER_AUTHORIZATION",
    "OTHER",
  ]),
  filename: z.string().min(1, "Filename is required"),
  storageReference: z.string().min(1, "Storage reference (URL/path) is required"),
});
