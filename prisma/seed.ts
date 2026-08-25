import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VERIPRICE database with Phase 2 core models and Phase 3 secure credentials...");

  const defaultPasswordHash = await hashPassword("VeriPrice2026!");

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
      address: "Federal Secretariat Complex, Treasury Block, Kathmandu",
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
      jurisdiction: "Industrial Manufacturing Zone B, Biratnagar",
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
      jurisdiction: "Birgunj Dry Port Customs Terminal",
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
      jurisdiction: "Kathmandu Valley Commercial Zone",
      verified: true,
      address: "Avenue Mall, Commercial Plaza 104, New Road",
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
      address: "Financial Tower 8, Suite 1200, Naxal",
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
  const userGov = await prisma.user.upsert({
    where: { email: "admin@veriprice.gov" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_super_01",
      email: "admin@veriprice.gov",
      name: "Sarah Vance",
      role: "SUPER_ADMIN",
      passwordHash: defaultPasswordHash,
      orgId: orgGov.id,
      designation: "Director General — National Revenue, Fiscal Policy & Platform Administration",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "taxofficer@veriprice.gov" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_tax_01",
      email: "taxofficer@veriprice.gov",
      name: "Officer Marcus Sterling",
      role: "TAX_OFFICER",
      passwordHash: defaultPasswordHash,
      orgId: orgGov.id,
      designation: "Chief VAT & Anti-Smuggling Enforcement Officer",
      status: "ACTIVE",
    },
  });

  const userMfg = await prisma.user.upsert({
    where: { email: "manufacturer@apexbiotech.com" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_mfg_01",
      email: "manufacturer@apexbiotech.com",
      name: "Elena Rostova",
      role: "MANUFACTURER",
      passwordHash: defaultPasswordHash,
      orgId: orgMfg.id,
      designation: "VP of Quality Assurance & Production Operations",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "importer@pacifichorizon.com" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_imp_01",
      email: "importer@pacifichorizon.com",
      name: "David Chen",
      role: "IMPORTER",
      passwordHash: defaultPasswordHash,
      orgId: orgImp.id,
      designation: "Head of Customs Manifests & Cross-Border Logistics",
      status: "ACTIVE",
    },
  });

  const userRetail = await prisma.user.upsert({
    where: { email: "cashier@metroretail.com" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_biz_emp_01",
      email: "cashier@metroretail.com",
      name: "Rohan Joshi",
      role: "BUSINESS_EMPLOYEE",
      passwordHash: defaultPasswordHash,
      orgId: orgBiz.id,
      employeeCode: "METRO-EMP-504",
      designation: "Store Manager & Retail Operations Lead",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "auditor@sterlingvance.com" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_auditor_01",
      email: "auditor@sterlingvance.com",
      name: "Arthur Pendelton",
      role: "AUDITOR",
      passwordHash: defaultPasswordHash,
      orgId: orgAudit.id,
      designation: "Senior Forensic Provenance & Tax Auditor",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "consumer@citizens.org" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: "usr_consumer_01",
      email: "consumer@citizens.org",
      name: "Maya Lin",
      role: "CONSUMER",
      passwordHash: defaultPasswordHash,
      orgId: orgConsumer.id,
      designation: "Verified Citizen Consumer",
      status: "ACTIVE",
    },
  });

  // 3. Seed Categories (Phase 2)
  const catFood = await prisma.category.upsert({
    where: { slug: "food-organic-edibles" },
    update: {},
    create: {
      id: "cat_food_01",
      name: "Food & Organic Edibles",
      slug: "food-organic-edibles",
      description: "Essential staple foods, oils, grains, and organic consumables.",
      isActive: true,
    },
  });

  const catPharma = await prisma.category.upsert({
    where: { slug: "pharmaceuticals-healthcare" },
    update: {},
    create: {
      id: "cat_pharma_01",
      name: "Pharmaceuticals & Healthcare",
      slug: "pharmaceuticals-healthcare",
      description: "Essential life-saving medicines, OTC products, and medical devices.",
      isActive: true,
    },
  });

  const catElectronics = await prisma.category.upsert({
    where: { slug: "electronics-hardware" },
    update: {},
    create: {
      id: "cat_elec_01",
      name: "Electronics & Tech Hardware",
      slug: "electronics-hardware",
      description: "Smartphones, computers, telecom equipment, and smart devices.",
      isActive: true,
    },
  });

  const catBeverages = await prisma.category.upsert({
    where: { slug: "beverages-spirits" },
    update: {},
    create: {
      id: "cat_bev_01",
      name: "Beverages & Spirits",
      slug: "beverages-spirits",
      description: "Bottled beverages, packaged tea/coffee, and distilled spirits.",
      isActive: true,
    },
  });

  // 4. Seed Sellers (Phase 2)
  const sellerRetail = await prisma.seller.upsert({
    where: { registrationNumber: "REG-METRO-2024-889" },
    update: {},
    create: {
      id: "seller_metro_01",
      userId: userRetail.id,
      businessName: "Metro Retail Distribution & SuperMart Pvt Ltd",
      registrationNumber: "REG-METRO-2024-889",
      panVatNumber: "601982734",
      contactEmail: "compliance@metroretail.com",
      contactPhone: "+977-1-4239841",
      address: "Avenue Mall, Commercial Plaza 104, New Road, Kathmandu",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified by Department of Commerce and Inland Revenue Department.",
    },
  });

  const sellerMfg = await prisma.seller.upsert({
    where: { registrationNumber: "REG-APEX-2021-304" },
    update: {},
    create: {
      id: "seller_apex_01",
      userId: userMfg.id,
      businessName: "Apex BioTech & Consumer Goods Mfg Ltd",
      registrationNumber: "REG-APEX-2021-304",
      panVatNumber: "302819475",
      contactEmail: "sales@apexbiotech.com",
      contactPhone: "+977-21-523190",
      address: "Plot 42, High-Tech Industrial Hub, Sector 9, Biratnagar",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified manufacturing license and GMP compliance certified.",
    },
  });

  // 5. Seed Products (Phase 2)
  const productOliveOil = await prisma.product.upsert({
    where: { id: "prod_oil_001" },
    update: {},
    create: {
      id: "prod_oil_001",
      name: "Apex Pure Cold-Pressed Virgin Olive Oil 1L",
      description: "100% natural cold-pressed virgin olive oil, fortified with Vitamin E and essential Omega-3 fatty acids.",
      brand: "Apex Pure",
      model: "EVOO-1000ML",
      categoryId: catFood.id,
      sellerId: sellerMfg.id,
      manufacturerName: "Apex BioTech & Consumer Goods Mfg Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      vatPaid: 97.50,
      actualCost: 750.00,
      consumerPrice: 1500.00,
      currency: "NPR",
      verificationStatus: "VERIFIED",
      verificationNotes: "Complies with statutory maximum retail price cap (NPR 1,500) and Food Quality Standard #84/2080.",
      verifiedAt: new Date("2026-01-15T10:00:00.000Z"),
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800",
            metadata: JSON.stringify({ alt: "Apex Olive Oil Bottle Packaging", resolution: "1920x1080", isHero: true }),
          },
        ],
      },
      documents: {
        create: [
          {
            documentType: "LAB_CERTIFICATE",
            filename: "lab_purity_test_dftqc_882.pdf",
            storageReference: "secure://dftqc-nepal.gov/cert/882-EVOO-2026.pdf",
            status: "VERIFIED",
          },
          {
            documentType: "TAX_CLEARANCE",
            filename: "vat_clearance_ird_2080_q3.pdf",
            storageReference: "secure://ird.gov.np/clearance/2080-Q3-302819475.pdf",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  const productParacetamol = await prisma.product.upsert({
    where: { id: "prod_med_002" },
    update: {},
    create: {
      id: "prod_med_002",
      name: "Paracetamol IP 500mg Fast-Action Tablets (100 Tabs)",
      description: "Statutory essential antipyretic and analgesic oral tablets manufactured under strict GMP compliance.",
      brand: "Apex PharmaCare",
      model: "PCM-500-100T",
      categoryId: catPharma.id,
      sellerId: sellerMfg.id,
      manufacturerName: "Apex BioTech & Consumer Goods Mfg Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: false, // Essential medicine exempt or 0%
      vatRate: 0.00,
      vatPaid: 0.00,
      actualCost: 120.00,
      consumerPrice: 200.00,
      currency: "NPR",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified with Department of Drug Administration (DDA) registry code DDA-REG-98214.",
      verifiedAt: new Date("2026-01-20T11:30:00.000Z"),
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
            metadata: JSON.stringify({ alt: "Paracetamol 500mg Blister Packaging", resolution: "1200x800", isHero: true }),
          },
        ],
      },
      documents: {
        create: [
          {
            documentType: "LAB_CERTIFICATE",
            filename: "dda_approval_cert_98214.pdf",
            storageReference: "secure://dda.gov.np/licenses/DDA-98214.pdf",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  const productPhone = await prisma.product.upsert({
    where: { id: "prod_elec_003" },
    update: {},
    create: {
      id: "prod_elec_003",
      name: "Horizon X9 Pro 5G Smartphone (256GB / 12GB RAM)",
      description: "Flagship 5G smartphone with official NTA IMEI type approval, customs duty cleared with cryptographic DPP passport.",
      brand: "Horizon Tech",
      model: "HX-9PRO-5G",
      categoryId: catElectronics.id,
      sellerId: sellerRetail.id,
      manufacturerName: "Pacific Horizon Electronics Corp",
      countryOfOrigin: "Vietnam",
      originType: "IMPORTED",
      isNepalManufactured: false,
      isVatApplicable: true,
      vatRate: 0.13,
      vatPaid: 11050.00,
      actualCost: 65000.00,
      consumerPrice: 85000.00,
      currency: "NPR",
      verificationStatus: "VERIFIED",
      verificationNotes: "Customs declaration #CUST-2026-7892 cleared at Birgunj Dry Port; NTA Type Approval verified.",
      verifiedAt: new Date("2026-02-02T14:00:00.000Z"),
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800",
            metadata: JSON.stringify({ alt: "Horizon X9 Pro Smartphone", resolution: "1920x1080", isHero: true }),
          },
        ],
      },
      documents: {
        create: [
          {
            documentType: "BILL_OF_ENTRY",
            filename: "customs_boe_birgunj_7892.pdf",
            storageReference: "secure://customs.gov.np/boe/2026-7892.pdf",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  // 6. Seed Tax Rules
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
      category: "Electronics & Tech Hardware",
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

  // 7. Seed Batches
  const batch1 = await prisma.batchItem.upsert({
    where: { batchNumber: "APX-2026-901B" },
    update: {},
    create: {
      id: "batch_mfg_901",
      batchNumber: "APX-2026-901B",
      productName: "Apex Pure Cold-Pressed Virgin Olive Oil 1L",
      category: "Food & Organic Edibles",
      hsCode: "1509.10",
      description: "Cold-pressed extra virgin olive oil certified organic.",
      quantity: 5000,
      availableQuantity: 4200,
      unit: "Bottles (1L)",
      productionDate: new Date("2026-02-01T08:00:00.000Z"),
      expiryDate: new Date("2028-02-01T08:00:00.000Z"),
      manufacturerOrgId: orgMfg.id,
      factoryLocation: "Plant Alpha, Biratnagar Agro-Valley",
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

  // 8. Seed Passports
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
      lastScannedLocation: "Store Terminal 04, Metro SuperMart, New Road Kathmandu",
      digitalSignature: "SIG-ECDSA-SHA256:0x41f8a892b1cd5e6f",
      qrPayload: "https://veriprice.gov/verify/APX-OIL-901-000184?sig=0x41f8a892",
      journey: {
        create: [
          {
            stage: "MANUFACTURED",
            actorRole: "MANUFACTURER",
            actorName: "Elena Rostova",
            actorOrgName: "Apex BioTech & Consumer Goods Mfg Ltd",
            location: "Factory Cleanroom B, Industrial Zone Biratnagar",
            details: "Batch bottled, sealed with tamper-evident digital RFID and minted into DPP Registry.",
            hash: "0x8f9c1e7a4b2d3e5f6a7b8c9d0e1f2a3b4c5d6e7f",
            isVerified: true,
          },
          {
            stage: "RETAIL_RECEIVED",
            actorRole: "BUSINESS_EMPLOYEE",
            actorName: "Rohan Joshi",
            actorOrgName: "Metro Retail Distribution & SuperMart Pvt Ltd",
            location: "Avenue Mall Retail Depot, Kathmandu",
            details: "Inbound QR scanning verified against National Ledger; Stocked in Store Inventory.",
            hash: "0x55aa66bb77cc88dd99ee00ff11aa22bb33cc44ee",
            isVerified: true,
          },
        ],
      },
    },
  });

  console.log("✅ VERIPRICE database seeded successfully with all Phase 2 models!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
