export type UserRole =
  | "SUPER_ADMIN"
  | "TAX_OFFICER"
  | "MANUFACTURER"
  | "IMPORTER"
  | "BUSINESS_EMPLOYEE"
  | "AUDITOR"
  | "CONSUMER";

export type OrgType =
  | "GOVERNMENT"
  | "TAX_AUTHORITY"
  | "MANUFACTURER"
  | "IMPORTER"
  | "RETAILER_DISTRIBUTOR"
  | "AUDIT_FIRM"
  | "CONSUMER";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  taxPin: string; // PAN / VAT Registration Number
  licenseNumber: string;
  jurisdiction: string;
  verified: boolean;
  address: string;
  contactEmail: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
  organizationName: string;
  phone?: string;
  avatarUrl?: string;
  employeeCode?: string;
  designation?: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export type ProductStatus = "DRAFT" | "PRODUCED" | "IN_CUSTOMS" | "CLEARED" | "IN_TRANSIT" | "IN_STOCK" | "SOLD" | "RECALLED";

export interface BatchItem {
  id: string;
  batchNumber: string;
  productName: string;
  category: string;
  hsCode: string; // Harmonized System Code for Customs & Tax
  description: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  productionDate: string;
  expiryDate: string;
  manufacturerOrgId: string;
  manufacturerName: string;
  factoryLocation: string;
  baseCost: number; // Ex-factory cost
  standardVatRate: number; // e.g., 0.13 (13%)
  exciseRate: number; // e.g., 0.05 (5%)
  statutoryMrp: number; // Maximum Retail Price set by Gov/Mfg
  status: ProductStatus;
  carbonFootprintKg: number;
  provenanceHash: string;
  serialPrefix: string;
  createdAt: string;
}

export interface ProductPassport {
  id: string;
  serialNumber: string; // Unique cryptographic product identity
  batchId: string;
  batchNumber: string;
  productName: string;
  category: string;
  hsCode: string;
  manufacturerOrgId: string;
  manufacturerName: string;
  currentHolderOrgId: string;
  currentHolderName: string;
  statutoryMrp: number;
  status: ProductStatus;
  isAuthentic: boolean;
  isRecalled: boolean;
  scanCount: number;
  lastScannedAt?: string;
  lastScannedLocation?: string;
  digitalSignature: string;
  qrPayload: string; // Encrypted / signed payload URL
  journey: PassportJourneyEvent[];
  createdAt: string;
}

export interface PassportJourneyEvent {
  id: string;
  timestamp: string;
  stage: "MANUFACTURED" | "CUSTOMS_CLEARED" | "DISTRIBUTED" | "RETAIL_RECEIVED" | "POINT_OF_SALE" | "CONSUMER_VERIFIED" | "SUSPICIOUS_FLAG";
  actorRole: UserRole;
  actorName: string;
  actorOrgName: string;
  location: string;
  details: string;
  hash: string;
  isVerified: boolean;
}

export interface CustomsDeclaration {
  id: string;
  consignmentId: string;
  billOfEntryNo: string;
  importerOrgId: string;
  importerName: string;
  portOfOrigin: string;
  portOfEntry: string;
  arrivalDate: string;
  hsCode: string;
  batchIds: string[];
  productSummary: string;
  declaredValueUsd: number;
  declaredValueLocal: number;
  customsDutyRate: number; // e.g. 0.10 (10%)
  customsDutyAmount: number;
  importVatAmount: number;
  totalCustomsDutyPaid: number;
  clearanceStatus: "PENDING_DUTY" | "DUTY_PAID" | "CLEARED" | "HELD_FOR_INSPECTION";
  officerNotes?: string;
  clearedByTaxOfficerId?: string;
  clearanceTimestamp?: string;
  createdAt: string;
}

export interface BusinessInventoryItem {
  id: string;
  businessOrgId: string;
  batchId: string;
  batchNumber: string;
  productName: string;
  category: string;
  hsCode: string;
  sku: string;
  stockQuantity: number;
  unitCost: number;
  retailPrice: number; // Must be <= statutoryMrp
  statutoryMrp: number;
  isPriceCompliant: boolean;
  lastRestockedAt: string;
  supplierOrgName: string;
}

export interface InvoiceLineItem {
  id: string;
  serialNumber?: string;
  batchId: string;
  batchNumber: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discount: number;
  taxableAmount: number;
  vatRate: number; // 0.13
  vatAmount: number;
  exciseRate: number;
  exciseAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  irn: string; // Invoice Reference Number (Cryptographic Hash)
  invoiceType: "B2B_SUPPLY" | "B2C_RETAIL" | "IMPORT_INVOICE" | "EXPORT_INVOICE";
  sellerOrgId: string;
  sellerName: string;
  sellerTaxPin: string;
  sellerAddress: string;
  buyerOrgId?: string;
  buyerName: string;
  buyerTaxPin?: string;
  buyerType: "BUSINESS" | "INDIVIDUAL_CONSUMER" | "GOVERNMENT";
  items: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalExcise: number;
  totalVat: number;
  grandTotal: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "DIGITAL_WALLET" | "CARD";
  fiscalStatus: "VALIDATED" | "PENDING_RECONCILIATION" | "FLAGGED_DISCREPANCY" | "VOIDED";
  issuedByUserId: string;
  issuedByName: string;
  qrCodeUrl: string;
  fiscalStampHash: string;
  isPriceGougingDetected: boolean;
  createdAt: string;
}

export interface TaxRule {
  id: string;
  hsCode: string;
  category: string;
  description: string;
  standardVatRate: number;
  exciseDutyRate: number;
  customsDutyRate: number;
  luxuryTaxRate: number;
  maxProfitMarginCap: number; // e.g. 0.20 (20%)
  statutoryPriceCap?: number;
  updatedByRole: UserRole;
  updatedAt: string;
}

export interface TaxReturnSummary {
  id: string;
  orgId: string;
  orgName: string;
  taxPin: string;
  taxPeriod: string; // e.g., "2026-Q1" or "2026-AUG"
  totalOutputVat: number; // Collected from Sales
  totalInputVat: number; // Paid on Purchases (ITC)
  netVatPayable: number; // Output VAT - Input VAT
  totalExcisePayable: number;
  customsDutyClaimed: number;
  reconciliationStatus: "MATCHED" | "AUDIT_REQUIRED" | "DISCREPANCY_FLAGGED" | "CLEARED";
  filedAt: string;
}

export interface FraudAlert {
  id: string;
  type:
    | "DUPLICATE_SCAN"
    | "PRICE_GOUGING"
    | "UNREGISTERED_SERIAL"
    | "TAX_CAROUSEL_MISMATCH"
    | "SUSPICIOUS_VELOCITY"
    | "CONSUMER_WHISTLEBLOWER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  targetSerialNumber?: string;
  targetBatchId?: string;
  targetOrgId?: string;
  targetOrgName?: string;
  targetInvoiceId?: string;
  riskScore: number; // 0 to 100
  status: "OPEN" | "UNDER_INVESTIGATION" | "CONFIRMED_FRAUD" | "RESOLVED_FALSE_POSITIVE";
  reportedBy: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  actionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  orgId: string;
  orgName: string;
  action: string;
  resourceType: "BATCH" | "PASSPORT" | "INVOICE" | "TAX_RULE" | "CUSTOMS" | "USER" | "FRAUD_ALERT";
  resourceId: string;
  ipAddress: string;
  status: "SUCCESS" | "BLOCKED_UNAUTHORIZED" | "BLOCKED_IDOR" | "FLAGGED_ANOMALY";
  details: string;
}
