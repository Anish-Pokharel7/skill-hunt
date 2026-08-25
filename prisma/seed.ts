import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VERIPRICE database...");

  // 1. Seed Organizations
  const orgGov = await prisma.organization.upsert({
    where: { taxPin: "GOV-TAX-0001" },
    update: {},
    create: {
      id: "org_gov_01",
      name: "National Revenue & Customs Authority (Gov)",
      type: "GOVERNMENT",
      taxPin: "GOV-TAX-0001",
      licenseNumber: "GOV-LIC-2026-X",
      jurisdiction: "Central Federal Revenue Service",
      verified: true,
      address: "Federal Secretariat Complex, Treasury Block",
      contactEmail: "oversight@gov-revenue.org",
    },
  });

  const orgMfg = await prisma.organization.upsert({
    where: { taxPin: "MFG-PAN-9948201" },
    update: {},
    create: {
      id: "org_mfg_01",
      name: "Apex BioTech & Consumer Goods Mfg Ltd",
      type: "MANUFACTURER",
      taxPin: "MFG-PAN-9948201",
      licenseNumber: "MFG-IND-8849-01",
      jurisdiction: "Industrial Manufacturing Zone B",
      verified: true,
      address: "Plot 42, High-Tech Industrial Hub, Sector 9",
      contactEmail: "compliance@apexbiotech.com",
    },
  });

  const orgImp = await prisma.organization.upsert({
    where: { taxPin: "IMP-PAN-4410982" },
    update: {},
    create: {
      id: "org_imp_01",
      name: "Pacific Horizon Logistics & Importers Corp",
      type: "IMPORTER",
      taxPin: "IMP-PAN-4410982",
      licenseNumber: "IMP-CUST-7721-04",
      jurisdiction: "Customs Dry Port Clearance Terminal A",
      verified: true,
      address: "Cargo Terminal Gate 3, International Port Complex",
      contactEmail: "manifest@pacifichorizon.com",
    },
  });

  const orgBiz = await prisma.organization.upsert({
    where: { taxPin: "BIZ-VAT-8823104" },
    update: {},
    create: {
      id: "org_biz_01",
      name: "Metro Retail Distribution & SuperMart Pvt Ltd",
      type: "RETAILER_DISTRIBUTOR",
      taxPin: "BIZ-VAT-8823104",
      licenseNumber: "RET-REG-3391-22",
      jurisdiction: "Metropolitan Commercial District",
      verified: true,
      address: "Avenue Mall, Commercial Plaza 104",
      contactEmail: "accounts@metroretail.com",
    },
  });

  const orgAudit = await prisma.organization.upsert({
    where: { taxPin: "AUD-PAN-1102938" },
    update: {},
    create: {
      id: "org_audit_01",
      name: "Sterling & Vance Independent Fiscal Auditors LLP",
      type: "AUDIT_FIRM",
      taxPin: "AUD-PAN-1102938",
      licenseNumber: "ICAI-AUD-99120",
      jurisdiction: "Chartered Forensic Registry",
      verified: true,
      address: "Financial Tower 8, Suite 1200",
      contactEmail: "audit-desk@sterlingvance.com",
    },
  });

  const orgConsumer = await prisma.organization.upsert({
    where: { taxPin: "CONSUMER-PUBLIC-TAX" },
    update: {},
    create: {
      id: "org_consumer_01",
      name: "Public Consumer Registry",
      type: "CONSUMER",
      taxPin: "CONSUMER-PUBLIC-TAX",
      licenseNumber: "N/A",
      jurisdiction: "National Citizen Portal",
      verified: true,
      address: "Public Domain",
      contactEmail: "public@consumer-protection.gov",
    },
  });

  // 2. Seed Users
  await prisma.user.upsert({
    where: { email: "admin@veriprice.gov" },
    update: {},
    create: {
      id: "usr_super_01",
      email: "admin@veriprice.gov",
      name: "Sarah Vance",
      role: "SUPER_ADMIN",
      orgId: orgGov.id,
      designation: "Director General — National Revenue, Fiscal Policy & Platform Administration",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "taxofficer@veriprice.gov" },
    update: {},
    create: {
      id: "usr_tax_01",
      email: "taxofficer@veriprice.gov",
      name: "Officer Marcus Sterling",
      role: "TAX_OFFICER",
      orgId: orgGov.id,
      designation: "Chief VAT & Anti-Smuggling Enforcement Officer",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "manufacturer@apexbiotech.com" },
    update: {},
    create: {
      id: "usr_mfg_01",
      email: "manufacturer@apexbiotech.com",
      name: "Elena Rostova",
      role: "MANUFACTURER",
      orgId: orgMfg.id,
      designation: "VP of Quality Assurance & Production Operations",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "importer@pacifichorizon.com" },
    update: {},
    create: {
      id: "usr_imp_01",
      email: "importer@pacifichorizon.com",
      name: "David Chen",
      role: "IMPORTER",
      orgId: orgImp.id,
      designation: "Head of Customs Manifests & Cross-Border Logistics",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@metroretail.com" },
    update: {},
    create: {
      id: "usr_biz_emp_01",
      email: "cashier@metroretail.com",
      name: "Rohan Joshi",
      role: "BUSINESS_EMPLOYEE",
      orgId: orgBiz.id,
      employeeCode: "METRO-EMP-504",
      designation: "Senior POS Operator & Inventory Gatekeeper",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "auditor@sterlingvance.com" },
    update: {},
    create: {
      id: "usr_auditor_01",
      email: "auditor@sterlingvance.com",
      name: "Arthur Pendelton",
      role: "AUDITOR",
      orgId: orgAudit.id,
      designation: "Senior Forensic Provenance & Tax Auditor",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "consumer@citizens.org" },
    update: {},
    create: {
      id: "usr_consumer_01",
      email: "consumer@citizens.org",
      name: "Maya Lin",
      role: "CONSUMER",
      orgId: orgConsumer.id,
      designation: "Verified Citizen Consumer",
      status: "ACTIVE",
    },
  });

  // 3. Seed Tax Rules
  const taxRules = [
    {
      hsCode: "3004.90",
      category: "Pharmaceuticals & Healthcare",
      description: "Essential Life-Saving Medicines & Formulations",
      standardVatRate: 0.05,
      exciseDutyRate: 0.0,
      customsDutyRate: 0.05,
      luxuryTaxRate: 0.0,
      maxProfitMarginCap: 0.15,
      statutoryPriceCap: 250,
      updatedByRole: "SUPER_ADMIN",
    },
    {
      hsCode: "1509.10",
      category: "Food & Organic Edibles",
      description: "Virgin & Cold-Pressed Olive Oils",
      standardVatRate: 0.13,
      exciseDutyRate: 0.02,
      customsDutyRate: 0.15,
      luxuryTaxRate: 0.0,
      maxProfitMarginCap: 0.25,
      statutoryPriceCap: 1500,
      updatedByRole: "SUPER_ADMIN",
    },
    {
      hsCode: "2208.30",
      category: "Beverages & Spirits",
      description: "Aged Single Malt & Distilled Spirits",
      standardVatRate: 0.13,
      exciseDutyRate: 0.35,
      customsDutyRate: 0.40,
      luxuryTaxRate: 0.10,
      maxProfitMarginCap: 0.30,
      statutoryPriceCap: 8500,
      updatedByRole: "SUPER_ADMIN",
    },
    {
      hsCode: "8517.13",
      category: "Electronics & Tech",
      description: "Smartphones & Cellular Communication Units",
      standardVatRate: 0.13,
      exciseDutyRate: 0.05,
      customsDutyRate: 0.12,
      luxuryTaxRate: 0.05,
      maxProfitMarginCap: 0.20,
      statutoryPriceCap: 120000,
      updatedByRole: "SUPER_ADMIN",
    },
  ];

  for (const rule of taxRules) {
    await prisma.taxRule.upsert({
      where: { hsCode: rule.hsCode },
      update: rule,
      create: rule,
    });
  }

  // 4. Seed Batches
  const batch1 = await prisma.batchItem.upsert({
    where: { batchNumber: "APX-2026-901B" },
    update: {},
    create: {
      id: "batch_mfg_901",
      batchNumber: "APX-2026-901B",
      productName: "Apex Pure Extra Virgin Olive Oil (1L)",
      category: "Food & Organic Edibles",
      hsCode: "1509.10",
      description: "Cold-pressed extra virgin olive oil certified organic.",
      quantity: 5000,
      availableQuantity: 4200,
      unit: "Bottles (1L)",
      productionDate: new Date("2026-02-01T08:00:00.000Z"),
      expiryDate: new Date("2028-02-01T08:00:00.000Z"),
      manufacturerOrgId: orgMfg.id,
      factoryLocation: "Plant Alpha, Mediterranean Agro-Valley",
      baseCost: 750,
      standardVatRate: 0.13,
      exciseRate: 0.02,
      statutoryMrp: 1500,
      status: "PRODUCED",
      carbonFootprintKg: 0.85,
      provenanceHash: "0x3f8a92b1cd5e6fa029b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5",
      serialPrefix: "APX-OIL-901",
    },
  });

  // 5. Seed Passports
  await prisma.productPassport.upsert({
    where: { serialNumber: "APX-OIL-901-000184" },
    update: {},
    create: {
      id: "dpp_001",
      serialNumber: "APX-OIL-901-000184",
      batchId: batch1.id,
      batchNumber: batch1.batchNumber,
      productName: batch1.productName,
      category: batch1.category,
      hsCode: batch1.hsCode,
      manufacturerOrgId: orgMfg.id,
      currentHolderOrgId: orgBiz.id,
      statutoryMrp: 1500,
      status: "IN_STOCK",
      isAuthentic: true,
      isRecalled: false,
      scanCount: 1,
      lastScannedAt: new Date("2026-02-24T14:15:00.000Z"),
      lastScannedLocation: "Store Terminal 04, Metro SuperMart, Central City",
      digitalSignature: "SIG-ECDSA-SHA256:0x41f8a892b1cd5e6f",
      qrPayload: "https://veriprice.gov/verify/APX-OIL-901-000184?sig=0x41f8a892",
      journey: {
        create: [
          {
            stage: "MANUFACTURED",
            actorRole: "MANUFACTURER",
            actorName: "Elena Rostova",
            actorOrgName: "Apex BioTech & Consumer Goods Mfg Ltd",
            location: "Factory Cleanroom B, Industrial Zone",
            details: "Batch bottled, sealed with tamper-evident digital RFID and minted into DPP Registry.",
            hash: "0x8f9c1e7a4b2d3e5f6a7b8c9d0e1f2a3b4c5d6e7f",
            isVerified: true,
          },
          {
            stage: "RETAIL_RECEIVED",
            actorRole: "BUSINESS_EMPLOYEE",
            actorName: "Rohan Joshi",
            actorOrgName: "Metro Retail Distribution & SuperMart Pvt Ltd",
            location: "Avenue Mall Retail Depot",
            details: "Inbound QR scanning verified against National Ledger; Stocked in Store Inventory.",
            hash: "0x55aa66bb77cc88dd99ee00ff11aa22bb33cc44ee",
            isVerified: true,
          },
        ],
      },
    },
  });

  console.log("✅ VERIPRICE database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
