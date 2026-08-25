// Phase 6 — Product Submission System Automated Test Suite
// Verifies: DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED workflow, Required-field check, Required-document check, Status transitions, Timestamps, and Submission History

const BASE_URL = "http://localhost:3000";

async function runPhase6Tests() {
  console.log("==================================================");
  console.log("RUNNING PHASE 6 — PRODUCT SUBMISSION SYSTEM TESTS");
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

  // Helper: Login as Role
  async function loginAsRole(role) {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    return data.token;
  }

  const adminToken = await loginAsRole("SUPER_ADMIN");
  const govToken = await loginAsRole("GOVERNMENT_OFFICIAL");
  const sellerAToken = await loginAsRole("MANUFACTURER"); // Elena (seller_apex_01)
  const sellerBToken = await loginAsRole("BUSINESS_EMPLOYEE"); // Rohan (seller_metro_01)

  // 0. Fetch Category
  console.log("--- 0. Fetching Category ---");
  const resCat = await fetch(`${BASE_URL}/api/categories`);
  const dataCat = await resCat.json();
  const validCategoryId = dataCat.data[0]?.id;
  assert(validCategoryId, "Retrieved valid category ID");

  // TEST 1: Seller A creates a new draft product
  console.log("\n--- 1. Creating Draft Product ---");
  const resCreate = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
    body: JSON.stringify({
      name: "Apex Bio-Herbal Tonic 200ml",
      description: "Standardized herbal immunity booster tonic certified for statutory distribution.",
      brand: "Apex Herbal",
      model: "TONIC-200ML",
      categoryId: validCategoryId,
      manufacturerName: "Apex BioTech & Consumer Goods Mfg Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 150,
      consumerPrice: 320,
      currency: "NPR",
    }),
  });
  const dataCreate = await resCreate.json();
  const product = dataCreate.data;
  assert(
    resCreate.status === 201 && product?.id,
    `Draft product created '${product?.name}' (${product?.id})`,
    JSON.stringify(dataCreate)
  );

  // TEST 2: Required-Document Verification - Submission without document MUST be rejected
  console.log("\n--- 2. Testing Required-Document Verification ---");
  const resSubmitNoDoc = await fetch(`${BASE_URL}/api/products/${product.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
    body: JSON.stringify({
      submissionNotes: "Attempting submission without compliance documentation.",
    }),
  });
  const dataSubmitNoDoc = await resSubmitNoDoc.json();
  assert(
    resSubmitNoDoc.status === 422 && dataSubmitNoDoc.code === "DOCUMENTS_REQUIRED",
    "Submission without compliance documents rejected with HTTP 422 (DOCUMENTS_REQUIRED)",
    JSON.stringify(dataSubmitNoDoc)
  );

  // TEST 3: Attach Mandatory Statutory Compliance Document
  console.log("\n--- 3. Attaching Compliance Document ---");
  const resAddDoc = await fetch(`${BASE_URL}/api/products/${product.id}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
    body: JSON.stringify({
      documentType: "LAB_CERTIFICATE",
      filename: "Apex_Bio_Lab_Safety_Certificate_2026.pdf",
      storageReference: "https://documents.veriprice.gov.np/cert/lab_apex_2026_9948.pdf",
    }),
  });
  const dataAddDoc = await resAddDoc.json();
  assert(
    resAddDoc.status === 201 && dataAddDoc.success,
    "Attached LAB_CERTIFICATE compliance document to product",
    JSON.stringify(dataAddDoc)
  );

  // TEST 4: Anti-IDOR: Seller B attempting to submit Seller A's product
  console.log("\n--- 4. Testing Anti-IDOR: Cross-Seller Submission Prevention ---");
  const resTamperSubmit = await fetch(`${BASE_URL}/api/products/${product.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerBToken}`, // Seller B
    },
    body: JSON.stringify({ submissionNotes: "Unauthorized cross-seller submission" }),
  });
  assert(
    resTamperSubmit.status === 403,
    "CRITICAL: Seller B strictly blocked from submitting Seller A's product with HTTP 403 Forbidden",
    `Status: ${resTamperSubmit.status}`
  );

  // TEST 5: Successful Product Submission by Owner Seller A
  console.log("\n--- 5. Testing Successful Product Submission ---");
  const resSubmitSuccess = await fetch(`${BASE_URL}/api/products/${product.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
    body: JSON.stringify({
      submissionNotes: "Formal submission for national quality and tax classification verification.",
    }),
  });
  const dataSubmitSuccess = await resSubmitSuccess.json();
  const submittedProduct = dataSubmitSuccess.data?.product;
  const submissionEntry = dataSubmitSuccess.data?.submission;

  assert(
    resSubmitSuccess.status === 200 &&
      submittedProduct?.verificationStatus === "SUBMITTED" &&
      submittedProduct?.submittedAt &&
      submissionEntry?.toStatus === "SUBMITTED",
    `Product successfully transitioned to SUBMITTED status with timestamp (${submittedProduct?.submittedAt})`,
    JSON.stringify(dataSubmitSuccess)
  );

  // TEST 6: Status Transition Validation - Cannot re-submit already SUBMITTED product
  console.log("\n--- 6. Testing Status Transition Validation (Re-submission Blocking) ---");
  const resResubmitBlocked = await fetch(`${BASE_URL}/api/products/${product.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
  });
  const dataResubmitBlocked = await resResubmitBlocked.json();
  assert(
    resResubmitBlocked.status === 409 && dataResubmitBlocked.code === "ALREADY_SUBMITTED",
    "Duplicate submission of already SUBMITTED product rejected with HTTP 409 Conflict",
    JSON.stringify(dataResubmitBlocked)
  );

  // TEST 7: Government Official Workflow: Transition to UNDER_REVIEW
  console.log("\n--- 7. Testing Government Reviewer: SUBMITTED -> UNDER_REVIEW ---");
  const resUnderReview = await fetch(`${BASE_URL}/api/products/${product.id}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      status: "UNDER_REVIEW",
      verificationNotes: "Officer Prashant Sharma initiated statutory laboratory & price cap verification.",
    }),
  });
  const dataUnderReview = await resUnderReview.json();
  assert(
    resUnderReview.status === 200 && dataUnderReview.data?.verificationStatus === "UNDER_REVIEW",
    "Government Official successfully moved product to UNDER_REVIEW status",
    JSON.stringify(dataUnderReview)
  );

  // TEST 8: Government Official Workflow: Transition to VERIFIED
  console.log("\n--- 8. Testing Government Reviewer: UNDER_REVIEW -> VERIFIED ---");
  const resVerify = await fetch(`${BASE_URL}/api/products/${product.id}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      status: "VERIFIED",
      verificationNotes: "Compliance certified: Formula, MRP, and 13% VAT statutory requirements verified.",
    }),
  });
  const dataVerify = await resVerify.json();
  assert(
    resVerify.status === 200 &&
      dataVerify.data?.verificationStatus === "VERIFIED" &&
      dataVerify.data?.verifiedAt,
    "Government Official successfully approved and VERIFIED the product",
    JSON.stringify(dataVerify)
  );

  // TEST 9: Status Transition Validation - Cannot submit an already VERIFIED product
  console.log("\n--- 9. Testing Re-submission Blocking for Verified Product ---");
  const resSubmitVerified = await fetch(`${BASE_URL}/api/products/${product.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAToken}`,
    },
  });
  assert(
    resSubmitVerified.status === 409,
    "Submission of already VERIFIED product rejected with HTTP 409",
    `Status: ${resSubmitVerified.status}`
  );

  // TEST 10: Submission & Transition History Endpoint (GET /api/products/:id/history)
  console.log("\n--- 10. Testing Submission & Audit History (GET /api/products/:id/history) ---");
  const resHistory = await fetch(`${BASE_URL}/api/products/${product.id}/history`, {
    headers: { Authorization: `Bearer ${sellerAToken}` },
  });
  const dataHistory = await resHistory.json();
  assert(
    resHistory.status === 200 &&
      dataHistory.success &&
      dataHistory.data.length >= 3 &&
      dataHistory.data.some((h) => h.toStatus === "SUBMITTED") &&
      dataHistory.data.some((h) => h.toStatus === "UNDER_REVIEW") &&
      dataHistory.data.some((h) => h.toStatus === "VERIFIED"),
    `Retrieved complete chronological audit trail (${dataHistory.data.length} transitions logged)`,
    JSON.stringify(dataHistory)
  );

  // TEST 11: Cross-Seller History Access Protection
  console.log("\n--- 11. Testing Anti-IDOR on History Access ---");
  const resHistoryBlocked = await fetch(`${BASE_URL}/api/products/${product.id}/history`, {
    headers: { Authorization: `Bearer ${sellerBToken}` },
  });
  assert(
    resHistoryBlocked.status === 403,
    "Seller B is blocked from inspecting Seller A's submission history with HTTP 403 Forbidden",
    `Status: ${resHistoryBlocked.status}`
  );

  // Clean up
  await fetch(`${BASE_URL}/api/products/${product.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log("\n==================================================");
  console.log(`PHASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
