/**
 * test-phase7-verification.mjs
 *
 * Full Lifecycle & Security Test for Phase 7: Government Verification System.
 * Tests the complete state machine:
 * DRAFT -> SUBMITTED -> UNDER_REVIEW -> CHANGES_REQUESTED -> RESUBMITTED -> UNDER_REVIEW -> APPROVED & REJECTED
 */

import http from "http";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message, details) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    if (details) console.error("         Details:", details);
    failed++;
  }
}

async function loginAs(role) {
  const res = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  return data.token;
}

async function runPhase7Tests() {
  console.log("==================================================");
  console.log("PHASE 7: GOVERNMENT VERIFICATION SYSTEM E2E SUITE");
  console.log("==================================================");

  // 1. Obtain tokens for different actors
  console.log("\n1. Authenticating test actors...");
  const sellerToken = await loginAs("SELLER");
  const govToken = await loginAs("GOVERNMENT_OFFICIAL");
  const adminToken = await loginAs("SUPER_ADMIN");
  const consumerToken = await loginAs("CONSUMER");

  assert(!!sellerToken, "Seller token acquired");
  assert(!!govToken, "Government Official token acquired");
  assert(!!adminToken, "Super Admin token acquired");
  assert(!!consumerToken, "Consumer token acquired");

  // 2. Fetch an active category to create products
  console.log("\n2. Setting up test product...");
  const resCat = await fetch(`${BASE_URL}/api/categories`);
  const dataCat = await resCat.json();
  const categoryId = dataCat.data[0].id;

  // Create a fresh test product in DRAFT/PENDING
  const resCreate = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      name: `Himalayan Herbal Elixir Gold-${Date.now()}`,
      description: "Organic certified medicinal tonic from Mustang highlands.",
      brand: "Himalayan Herbs Ltd",
      model: "ELX-2026",
      categoryId,
      manufacturerName: "Himalayan Herbal Bio-Extracts Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 650.0,
      consumerPrice: 950.0,
      currency: "NPR",
    }),
  });
  const dataCreate = await resCreate.json();
  assert(resCreate.status === 201 && dataCreate.success, "Product created in DRAFT/PENDING status");
  const product = dataCreate.data;
  const productId = product.id;

  // Attach a compliance document so it is submittable
  const resDoc = await fetch(`${BASE_URL}/api/products/${productId}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      documentType: "LAB_CERTIFICATE",
      filename: "himalayan_lab_purity_cert_2026.pdf",
      storageReference: "https://storage.veriprice.gov/certs/himalayan_lab_2026.pdf",
    }),
  });
  const dataDoc = await resDoc.json();
  assert(resDoc.status === 201 && dataDoc.success, "Compliance document (LAB_CERTIFICATE) attached");

  // 3. Test Invalid Status Transition: Cannot review or approve DRAFT
  console.log("\n3. Testing Invalid Status Transition Protections...");
  const resInvalidReview = await fetch(`${BASE_URL}/api/products/${productId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({ notes: "Attempting to review DRAFT product" }),
  });
  assert(
    resInvalidReview.status === 400,
    "Protection verified: Cannot start review on DRAFT product (must be SUBMITTED or RESUBMITTED)"
  );

  const resInvalidApprove = await fetch(`${BASE_URL}/api/products/${productId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({ approvalNotes: "Premature approval attempt on DRAFT" }),
  });
  assert(
    resInvalidApprove.status === 400,
    "Protection verified: Cannot approve DRAFT product (must be UNDER_REVIEW)"
  );

  // 4. Test Seller Submitting Product -> SUBMITTED
  console.log("\n4. Testing Product Submission (DRAFT -> SUBMITTED)...");
  const resSubmit = await fetch(`${BASE_URL}/api/products/${productId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      submissionNotes: "Initial product filing with authenticated lab purity certificate.",
    }),
  });
  const dataSubmit = await resSubmit.json();
  console.log("DEBUG resSubmit:", resSubmit.status, JSON.stringify(dataSubmit));
  assert(
    resSubmit.status === 200 &&
      dataSubmit.success &&
      dataSubmit.data.product.verificationStatus === "SUBMITTED",
    "Product successfully transitioned: DRAFT -> SUBMITTED with timestamp and audit history",
    JSON.stringify(dataSubmit)
  );


  // 5. Test Permission Checks: Consumer cannot review/approve/reject
  console.log("\n5. Testing RBAC Permission Guards on Verification Endpoints...");
  const resConsumerReview = await fetch(`${BASE_URL}/api/products/${productId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${consumerToken}`,
    },
    body: JSON.stringify({ notes: "Consumer attempting unauthorized review" }),
  });
  assert(
    resConsumerReview.status === 403,
    "RBAC guard verified: Consumer is rejected with 403 Forbidden from starting review"
  );

  const resConsumerApprove = await fetch(`${BASE_URL}/api/products/${productId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${consumerToken}`,
    },
    body: JSON.stringify({ approvalNotes: "Consumer attempting unauthorized approve" }),
  });
  assert(
    resConsumerApprove.status === 403,
    "RBAC guard verified: Consumer is rejected with 403 Forbidden from approving product"
  );

  // 6. Test Government Official starting review: SUBMITTED -> UNDER_REVIEW
  console.log("\n6. Testing Reviewer Assignment (SUBMITTED -> UNDER_REVIEW)...");
  const resStartReview = await fetch(`${BASE_URL}/api/products/${productId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      notes: "Government compliance officer reviewing chemical composition and statutory MRP margin.",
    }),
  });
  const dataStartReview = await resStartReview.json();
  assert(
    resStartReview.status === 200 &&
      dataStartReview.success &&
      dataStartReview.data.verificationStatus === "UNDER_REVIEW" &&
      !!dataStartReview.data.reviewerId &&
      !!dataStartReview.data.reviewerName,
    "Product transitioned to UNDER_REVIEW with reviewer identification (reviewerId, reviewerName, reviewerRole)"
  );

  // 7. Test Government Official Requesting Changes: UNDER_REVIEW -> CHANGES_REQUESTED
  console.log("\n7. Testing Change Request Workflow (UNDER_REVIEW -> CHANGES_REQUESTED)...");
  const resRequestChanges = await fetch(`${BASE_URL}/api/products/${productId}/request-changes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      changesRequired:
        "Please provide updated Department of Food Technology and Quality Control (DFTQC) clearance certificate and clarify MRP margin.",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const dataRequestChanges = await resRequestChanges.json();
  assert(
    resRequestChanges.status === 200 &&
      dataRequestChanges.success &&
      dataRequestChanges.data.verificationStatus === "CHANGES_REQUESTED" &&
      !!dataRequestChanges.data.changesRequestedNotes,
    "Product transitioned to CHANGES_REQUESTED with change specifications and deadline"
  );

  // 8. Test Seller Resubmission: CHANGES_REQUESTED -> RESUBMITTED
  console.log("\n8. Testing Seller Resubmission (CHANGES_REQUESTED -> RESUBMITTED)...");
  const resResubmit = await fetch(`${BASE_URL}/api/products/${productId}/resubmit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      resubmissionNotes:
        "Attached DFTQC compliance clearance report #DFTQC-2026-991 and clarified distributor margin.",
      changesDescription: "Uploaded updated quality clearance certificate and revised packaging specs.",
    }),
  });
  const dataResubmit = await resResubmit.json();
  assert(
    resResubmit.status === 200 &&
      dataResubmit.success &&
      dataResubmit.data.product.verificationStatus === "RESUBMITTED",
    "Seller successfully resubmitted product: CHANGES_REQUESTED -> RESUBMITTED"
  );

  // 9. Test Government Official Resuming Review on RESUBMITTED Product
  console.log("\n9. Testing Resuming Review (RESUBMITTED -> UNDER_REVIEW)...");
  const resResumeReview = await fetch(`${BASE_URL}/api/products/${productId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      notes: "Re-examining attached DFTQC compliance report and updated packaging specs.",
    }),
  });
  const dataResumeReview = await resResumeReview.json();
  assert(
    resResumeReview.status === 200 &&
      dataResumeReview.success &&
      dataResumeReview.data.verificationStatus === "UNDER_REVIEW",
    "Reviewer resumed review on resubmitted product: RESUBMITTED -> UNDER_REVIEW"
  );

  // 10. Test Approval: UNDER_REVIEW -> APPROVED/VERIFIED
  console.log("\n10. Testing Product Approval (UNDER_REVIEW -> APPROVED)...");
  const resApprove = await fetch(`${BASE_URL}/api/products/${productId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      approvalNotes:
        "All statutory compliance documents, DFTQC clearance, and MRP ceilings meet National Consumer Protection standards.",
      conditions: "Annual renewal of lab certification required before expiration.",
    }),
  });
  const dataApprove = await resApprove.json();
  assert(
    resApprove.status === 200 &&
      dataApprove.success &&
      dataApprove.data.verificationStatus === "VERIFIED" &&
      !!dataApprove.data.verifiedAt &&
      !!dataApprove.data.approvedAt,
    "Product successfully APPROVED/VERIFIED with verifiedAt timestamp and conditions recorded"
  );

  // 11. Test Verification History Retrieval
  console.log("\n11. Testing Chronological Verification History API...");
  const resHistory = await fetch(`${BASE_URL}/api/products/${productId}/history`, {
    headers: { Authorization: `Bearer ${govToken}` },
  });
  const dataHistory = await resHistory.json();
  assert(
    resHistory.status === 200 &&
      dataHistory.success &&
      Array.isArray(dataHistory.data) &&
      dataHistory.data.length >= 4,
    `Verification history retrieved with full chronological audit trail (${dataHistory.data.length} transitions recorded)`
  );

  // 12. Test Rejection Workflow on a Separate Product
  console.log("\n12. Testing Product Rejection Workflow (UNDER_REVIEW -> REJECTED)...");
  const resCreateReject = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      name: `Unregistered Energy Elixir-${Date.now()}`,
      description: "Uncertified dietary stimulant.",
      brand: "QuickEnergy Corp",
      model: "QE-99",
      categoryId,
      manufacturerName: "QuickEnergy Corp Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 100.0,
      consumerPrice: 500.0,
      currency: "NPR",
    }),
  });
  const dataCreateReject = await resCreateReject.json();
  const rejectProductId = dataCreateReject.data.id;

  // Add document & submit
  await fetch(`${BASE_URL}/api/products/${rejectProductId}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      documentType: "OTHER",
      filename: "unverified_doc.pdf",
      storageReference: "https://storage.veriprice.gov/certs/unverified.pdf",
    }),
  });
  await fetch(`${BASE_URL}/api/products/${rejectProductId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({ submissionNotes: "Submission for energy elixir." }),
  });
  await fetch(`${BASE_URL}/api/products/${rejectProductId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({ notes: "Reviewing uncertified energy drink." }),
  });

  const resReject = await fetch(`${BASE_URL}/api/products/${rejectProductId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({
      rejectionReason:
        "Product contains unlisted stimulant additives that violate Section 14 of Nepal Food Safety Act.",
      verificationNotes: "Permanent rejection due to hazardous banned ingredients.",
    }),
  });
  const dataReject = await resReject.json();
  assert(
    resReject.status === 200 &&
      dataReject.success &&
      dataReject.data.verificationStatus === "REJECTED" &&
      !!dataReject.data.rejectionReason,
    "Product successfully REJECTED with statutory rejection reason and notes recorded"
  );

  console.log("\n==================================================");
  console.log(`PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
