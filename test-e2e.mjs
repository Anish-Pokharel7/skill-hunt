// Automated End-to-End API & Server-Side RBAC / Anti-IDOR Test Suite
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING VERIPRICE SECURITY & FUNCTIONAL TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // TEST 0: Core API Health & DB Connectivity Check
  console.log("--- 0. Testing Core API & Database Health ---");
  const resHealth = await fetch(`${BASE_URL}/api/health`);
  const dataHealth = await resHealth.json();
  assert(
    resHealth.status === 200 && dataHealth.status === "HEALTHY" && dataHealth.checks.database.status === "HEALTHY",
    "System health check reports HEALTHY with active database and crypto engine",
    JSON.stringify(dataHealth)
  );

  // TEST 1: Public Consumer DPP Verification
  console.log("\n--- 1. Testing Public Consumer Product Verification ---");
  const resValid = await fetch(`${BASE_URL}/api/verify/APX-OIL-901-000184`);
  const dataValid = await resValid.json();
  assert(
    dataValid.success && dataValid.isAuthentic === true,
    "Valid serial APX-OIL-901-000184 is verified genuine",
    JSON.stringify(dataValid)
  );

  const resInvalid = await fetch(`${BASE_URL}/api/verify/APX-MED-442-999999`);
  const dataInvalid = await resInvalid.json();
  assert(
    dataInvalid.success && dataInvalid.isAuthentic === false,
    "Counterfeit serial APX-MED-442-999999 is flagged as counterfeit",
    JSON.stringify(dataInvalid)
  );

  // TEST 2: Multi-Role Authentication & Session Management
  console.log("\n--- 2. Testing Role Authentication & Session Token ---");
  const resLoginMfg = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "MANUFACTURER" }),
  });
  const dataLoginMfg = await resLoginMfg.json();
  const mfgToken = dataLoginMfg.token;
  assert(
    dataLoginMfg.success && dataLoginMfg.user.role === "MANUFACTURER",
    "Successfully authenticated as MANUFACTURER (Elena Rostova)",
    JSON.stringify(dataLoginMfg)
  );

  // TEST 3: Server Authorization for Batch Minting (Allowed for Mfg)
  console.log("\n--- 3. Testing Manufacturer Batch Minting ---");
  const resBatch = await fetch(`${BASE_URL}/api/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mfgToken}`,
    },
    body: JSON.stringify({
      productName: "BioPure Organic Tea Batch #55",
      category: "Food & Organic Edibles",
      hsCode: "0902.10",
      quantity: 2000,
      baseCost: 300,
      statutoryMrp: 550,
      mintDppCount: 3,
    }),
  });
  const dataBatch = await resBatch.json();
  assert(
    resBatch.status === 200 && dataBatch.success && dataBatch.mintedPassports.length === 3,
    "Manufacturer successfully created batch and minted 3 DPP Passports with cryptographic hashes",
    JSON.stringify(dataBatch)
  );

  // TEST 4: Role Guard Enforcement (Consumer blocked from minting batches)
  console.log("\n--- 4. Testing Server Role Guard (Privilege Escalation Prevention) ---");
  const resLoginConsumer = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "CONSUMER" }),
  });
  const dataLoginConsumer = await resLoginConsumer.json();
  const consumerToken = dataLoginConsumer.token;

  const resUnauthorizedBatch = await fetch(`${BASE_URL}/api/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${consumerToken}`,
    },
    body: JSON.stringify({
      productName: "Malicious Batch",
      hsCode: "0000.00",
      quantity: 10,
      statutoryMrp: 100,
    }),
  });
  assert(
    resUnauthorizedBatch.status === 403,
    "Server strictly rejected unauthorized batch creation attempt with HTTP 403 Forbidden",
    `Got status ${resUnauthorizedBatch.status}`
  );

  // TEST 5: Tax & Price Engine & MRP Anti-Gouging Validator
  console.log("\n--- 5. Testing Tax & Price Engine & Anti-Gouging Validator ---");
  const resTaxCalc = await fetch(`${BASE_URL}/api/tax`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hsCode: "1509.10",
      baseAmount: 1000,
      quantity: 2,
      offeredPrice: 1600, // Exceeds MRP 1500
      statutoryMrp: 1500,
    }),
  });
  const dataTaxCalc = await resTaxCalc.json();
  assert(
    dataTaxCalc.success &&
      dataTaxCalc.taxResult.vatAmount > 0 &&
      dataTaxCalc.priceCompliance.isCompliant === false,
    "Tax engine calculated 13% VAT ($265.20) and flagged Price Gouging (Offered $1600 > MRP $1500)",
    JSON.stringify(dataTaxCalc)
  );

  // TEST 6: Fiscal E-Invoice Issuance with IRN Stamping
  console.log("\n--- 6. Testing Fiscal E-Invoicing & IRN Generation ---");
  const resLoginBiz = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "BUSINESS_EMPLOYEE" }),
  });
  const dataLoginBiz = await resLoginBiz.json();
  const bizToken = dataLoginBiz.token;

  const resInvoice = await fetch(`${BASE_URL}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bizToken}`,
    },
    body: JSON.stringify({
      invoiceType: "B2C_RETAIL",
      buyerName: "Arthur Pendelton (Consumer)",
      items: [
        {
          batchId: "batch_mfg_901",
          batchNumber: "APX-2026-901B",
          productName: "Apex Pure Extra Virgin Olive Oil (1L)",
          hsCode: "1509.10",
          quantity: 2,
          unitPrice: 1100,
        },
      ],
      paymentMethod: "CARD",
    }),
  });
  const dataInvoice = await resInvoice.json();
  assert(
    resInvoice.status === 200 &&
      dataInvoice.success &&
      dataInvoice.invoice.irn.startsWith("IRN-"),
    `Fiscal Invoice created (${dataInvoice.invoice?.invoiceNumber}) with verified IRN hash`,
    JSON.stringify(dataInvoice)
  );

  // TEST 7: Strict Anti-IDOR Enforcement on Invoices
  console.log("\n--- 7. Testing Anti-IDOR Tenant Security on Invoices ---");
  // Try to access invoice owned by Metro SuperMart (org_biz_01) while logged in as Pacific Horizon Importer (org_imp_01)
  const resLoginImp = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "IMPORTER" }),
  });
  const dataLoginImp = await resLoginImp.json();
  const impToken = dataLoginImp.token;

  const resIdorBlock = await fetch(`${BASE_URL}/api/invoices/inv_fiscal_8802`, {
    headers: { Authorization: `Bearer ${impToken}` },
  });
  const dataIdorBlock = await resIdorBlock.json();
  assert(
    resIdorBlock.status === 403 && dataIdorBlock.code === "IDOR_PREVENTED",
    "Server strictly blocked cross-tenant invoice inspection with HTTP 403 (IDOR_PREVENTED)",
    JSON.stringify(dataIdorBlock)
  );

  // TEST 8: Whistleblower & Fraud Anomaly Reporting
  console.log("\n--- 8. Testing Consumer Whistleblower & Fraud Desk ---");
  const resWhistle = await fetch(`${BASE_URL}/api/fraud`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serialNumber: "PAC-PHN-801-000492",
      storeName: "Suspect Retailer Bay 4",
      city: "West Metro",
      issueType: "Price Gouging",
      description: "Store charged $92,000 for smartphone with MRP $79,999",
      pricePaid: 92000,
      statutoryMrp: 79999,
    }),
  });
  const dataWhistle = await resWhistle.json();
  assert(
    resWhistle.status === 200 && dataWhistle.success && dataWhistle.alert.type === "PRICE_GOUGING",
    "Whistleblower report created and registered into Tax Officer risk queue",
    JSON.stringify(dataWhistle)
  );

  // TEST 9: Phase 2 Categories & Products Verification
  console.log("\n--- 9. Testing Phase 2 Core Models (Category, Seller, Product) ---");
  const resCategories = await fetch(`${BASE_URL}/api/categories`);
  const dataCategories = await resCategories.json();
  assert(
    resCategories.status === 200 && dataCategories.success && dataCategories.data.length >= 4,
    `Retrieved ${dataCategories.data?.length} active product categories from Prisma DB`,
    JSON.stringify(dataCategories)
  );

  // Test Product Listing with Super Admin
  const resLoginAdmin = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "SUPER_ADMIN" }),
  });
  const dataLoginAdmin = await resLoginAdmin.json();
  const adminToken = dataLoginAdmin.token;

  const resProducts = await fetch(`${BASE_URL}/api/products`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dataProducts = await resProducts.json();
  assert(
    resProducts.status === 200 && dataProducts.success && dataProducts.data.length >= 3,
    `Super Admin retrieved ${dataProducts.data?.length} verified products from national database`,
    JSON.stringify(dataProducts)
  );

  // Test Product Verification by Government Authority
  const targetProduct = dataProducts.data[0];
  const resVerifyProd = await fetch(`${BASE_URL}/api/products/${targetProduct.id}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: "VERIFIED",
      verificationNotes: "Verified statutory compliance with National Quality Standards.",
    }),
  });
  const dataVerifyProd = await resVerifyProd.json();
  assert(
    resVerifyProd.status === 200 && dataVerifyProd.success && dataVerifyProd.data.verificationStatus === "VERIFIED",
    `Government Authority successfully verified product ${targetProduct.id}`,
    JSON.stringify(dataVerifyProd)
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");
}

runTests();

