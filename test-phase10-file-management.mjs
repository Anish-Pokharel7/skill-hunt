/**
 * test-phase10-file-management.mjs
 *
 * Full End-to-End Verification Suite for Phase 10: Product Image & Document Management.
 * Tests image upload/validation/deletion, document upload/signed-access/deletion,
 * private document isolation, IDOR prevention, and file type/size enforcement.
 */

import crypto from "crypto";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message, details) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    if (details) console.error("         Details:", JSON.stringify(details, null, 2));
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

/** Generates a tiny valid JPEG buffer (the smallest possible valid JPEG) */
function makeMinimalJpegBase64() {
  // 1x1 white JPEG
  const jpegBytes = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U" +
    "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN" +
    "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
    "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB//EABQ" +
    "BAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAA" +
    "AAAAAAAAAAAP/aAAwDAQACEQMRAD8Aq4AAAAAB/9k=",
    "base64"
  );
  return `data:image/jpeg;base64,${jpegBytes.toString("base64")}`;
}

/** Generates a tiny valid PDF buffer */
function makeMinimalPdfBase64() {
  const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;
  return `data:application/pdf;base64,${Buffer.from(pdfContent).toString("base64")}`;
}

async function runPhase10Tests() {
  console.log("==================================================");
  console.log("PHASE 10: IMAGE & DOCUMENT MANAGEMENT SUITE");
  console.log("==================================================");

  // 1. Authenticate Actors
  console.log("\n1. Authenticating test actors...");
  const sellerToken = await loginAs("SELLER");
  const adminToken = await loginAs("SUPER_ADMIN");
  const govToken = await loginAs("GOVERNMENT_OFFICIAL");
  const consumerToken = await loginAs("CONSUMER");
  const bizToken = await loginAs("BUSINESS_EMPLOYEE");

  assert(!!sellerToken, "Seller token acquired");
  assert(!!adminToken, "Super Admin token acquired");
  assert(!!govToken, "Government Official token acquired");

  // 2. Create a fresh test product
  console.log("\n2. Creating test product...");
  const resCat = await fetch(`${BASE_URL}/api/categories`);
  const dataCat = await resCat.json();
  const categoryId = dataCat.data[0].id;

  const resProduct = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      name: `Test Product Phase10-${Date.now()}`,
      categoryId,
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 100,
      consumerPrice: 150,
      currency: "NPR",
    }),
  });
  const dataProduct = await resProduct.json();
  assert(resProduct.status === 201 && dataProduct.success, "Test product created");
  const productId = dataProduct.data.id;

  // =========================================================================
  // IMAGE TESTS
  // =========================================================================
  console.log("\n3. Testing Image Upload (valid JPEG)...");
  const imageData = makeMinimalJpegBase64();
  const resUploadImg = await fetch(`${BASE_URL}/api/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      data: imageData,
      filename: "product-front.jpg",
      altText: "Front view of product packaging",
      isPrimary: true,
      sortOrder: 0,
    }),
  });
  const dataUploadImg = await resUploadImg.json();
  assert(
    resUploadImg.status === 201 && dataUploadImg.success,
    "Image uploaded successfully with valid JPEG",
    dataUploadImg
  );
  const imageId = dataUploadImg.data?.id;

  assert(
    !!imageId &&
      !!dataUploadImg.data?.url &&
      dataUploadImg.data?.isPrimary === true &&
      dataUploadImg.data?.mimeType === "image/jpeg" &&
      typeof dataUploadImg.data?.sizeBytes === "number",
    "Image record contains: id, url, isPrimary, mimeType, sizeBytes"
  );

  // 4. List images (public — no auth required)
  console.log("\n4. Testing Image Listing (public, no auth)...");
  const resListImg = await fetch(`${BASE_URL}/api/products/${productId}/images`);
  const dataListImg = await resListImg.json();
  assert(
    resListImg.status === 200 &&
      Array.isArray(dataListImg.data) &&
      dataListImg.data.length === 1,
    "Images listed publicly without authentication"
  );
  // storageReference must NOT appear in public listing
  assert(
    !Object.prototype.hasOwnProperty.call(dataListImg.data[0], "storageReference"),
    "storageReference is NOT exposed in public image listing (security verified)"
  );

  // 5. Image serve endpoint
  console.log("\n5. Testing Image Serve Endpoint...");
  const resServe = await fetch(`${BASE_URL}/api/products/${productId}/images/${imageId}/serve`);
  assert(
    resServe.status === 200 &&
      resServe.headers.get("content-type")?.startsWith("image/"),
    "Image serve endpoint streams image with correct Content-Type"
  );

  // 6. Reject invalid file type for image
  console.log("\n6. Testing File-Type Validation (PDF rejected as image)...");
  const resWrongType = await fetch(`${BASE_URL}/api/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      data: makeMinimalPdfBase64(),
      filename: "sneaky.pdf",
    }),
  });
  assert(
    resWrongType.status === 422,
    "PDF file correctly rejected when uploading as product image (file-type validation)"
  );

  // 7. Reject missing filename
  console.log("\n7. Testing Filename Validation...");
  const resNoFilename = await fetch(`${BASE_URL}/api/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ data: imageData }),
  });
  assert(resNoFilename.status === 422, "Upload rejected without filename field");

  // 8. Anti-IDOR: Another seller cannot upload to unowned product
  console.log("\n8. Testing Anti-IDOR on Image Upload...");
  const resIdorImg = await fetch(`${BASE_URL}/api/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bizToken}` },
    body: JSON.stringify({ data: imageData, filename: "hack.jpg" }),
  });
  assert(
    resIdorImg.status === 403,
    "Anti-IDOR: Unaffiliated business employee cannot upload images to seller's product"
  );

  // 9. Delete image
  console.log("\n9. Testing Image Deletion...");
  const resDeleteImg = await fetch(
    `${BASE_URL}/api/products/${productId}/images?imageId=${imageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sellerToken}` },
    }
  );
  assert(resDeleteImg.status === 200, "Image deleted successfully by owning seller");

  // Confirm it's gone
  const resAfterDelete = await fetch(`${BASE_URL}/api/products/${productId}/images`);
  const dataAfterDelete = await resAfterDelete.json();
  assert(dataAfterDelete.data.length === 0, "Image no longer listed after deletion");

  // =========================================================================
  // DOCUMENT TESTS
  // =========================================================================
  console.log("\n10. Testing Document Upload (valid PDF, private storage)...");
  const pdfData = makeMinimalPdfBase64();
  const resUploadDoc = await fetch(`${BASE_URL}/api/products/${productId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      data: pdfData,
      filename: "lab-certificate.pdf",
      documentType: "LAB_CERTIFICATE",
    }),
  });
  const dataUploadDoc = await resUploadDoc.json();
  assert(
    resUploadDoc.status === 201 && dataUploadDoc.success,
    "Compliance document uploaded successfully"
  );
  const documentId = dataUploadDoc.data?.id;
  const downloadUrl = dataUploadDoc.data?.downloadUrl;

  assert(
    !!documentId &&
      !!downloadUrl &&
      dataUploadDoc.data?.status === "PENDING_REVIEW" &&
      dataUploadDoc.data?.security?.includes("private storage"),
    "Document record contains: id, downloadUrl (signed token), status=PENDING_REVIEW, security notice"
  );

  // 11. Verify storageReference is NOT exposed to seller
  assert(
    !Object.prototype.hasOwnProperty.call(dataUploadDoc.data || {}, "storageReference"),
    "storageReference is NOT exposed in upload response (private storage security verified)"
  );

  // 12. Consumer cannot list private documents
  console.log("\n11. Testing Document Access Control — Consumer Blocked...");
  const resConsumerDocs = await fetch(`${BASE_URL}/api/products/${productId}/documents`, {
    headers: { Authorization: `Bearer ${consumerToken}` },
  });
  assert(
    resConsumerDocs.status === 403,
    "Consumer correctly blocked from listing private compliance documents"
  );

  // 13. Government official can list documents
  console.log("\n12. Testing Document Listing — Government Official Access...");
  const resGovDocs = await fetch(`${BASE_URL}/api/products/${productId}/documents`, {
    headers: { Authorization: `Bearer ${govToken}` },
  });
  const dataGovDocs = await resGovDocs.json();
  assert(
    resGovDocs.status === 200 &&
      Array.isArray(dataGovDocs.data) &&
      dataGovDocs.data.length >= 1,
    "Government official successfully listed private compliance documents"
  );
  // storageReference must NOT appear in listing
  assert(
    !Object.prototype.hasOwnProperty.call(dataGovDocs.data[0] || {}, "storageReference"),
    "storageReference is NOT exposed in document listing (private storage path is hidden)"
  );

  // 14. Signed token download works
  console.log("\n13. Testing Signed Access Token Document Download...");
  const resDownload = await fetch(`${BASE_URL}${downloadUrl}`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(
    resDownload.status === 200 &&
      resDownload.headers.get("content-type")?.includes("pdf") &&
      resDownload.headers.get("cache-control")?.includes("no-store"),
    "Private document served with valid signed token — no-store Cache-Control confirmed"
  );

  // 15. Expired/tampered token rejected
  console.log("\n14. Testing Tampered Token Rejection...");
  const tamperedToken = downloadUrl.replace(/token=([^&]+)/, "token=fakeTamperedToken123");
  const resTampered = await fetch(`${BASE_URL}${tamperedToken}`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(resTampered.status === 403, "Tampered signed token correctly rejected with 403");

  // 16. Government document verification
  console.log("\n15. Testing Government Document Verification...");
  const resVerifyDoc = await fetch(
    `${BASE_URL}/api/products/${productId}/documents/${documentId}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${govToken}` },
      body: JSON.stringify({ status: "VERIFIED" }),
    }
  );
  const dataVerifyDoc = await resVerifyDoc.json();
  assert(
    resVerifyDoc.status === 200 &&
      dataVerifyDoc.data?.status === "VERIFIED" &&
      !!dataVerifyDoc.data?.verifiedAt,
    "Government official successfully verified compliance document"
  );

  // 17. Seller cannot delete a VERIFIED document
  console.log("\n16. Testing Verified Document Delete Protection...");
  const resDelVerified = await fetch(
    `${BASE_URL}/api/products/${productId}/documents?documentId=${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sellerToken}` },
    }
  );
  assert(
    resDelVerified.status === 403,
    "Seller cannot delete a VERIFIED compliance document (regulatory protection)"
  );

  // 18. Admin can delete a VERIFIED document (admin override)
  console.log("\n17. Testing Admin Document Deletion Override...");
  const resAdminDelDoc = await fetch(
    `${BASE_URL}/api/products/${productId}/documents?documentId=${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  assert(resAdminDelDoc.status === 200, "Admin can delete VERIFIED document (admin override confirmed)");

  // 19. Reject invalid document type
  console.log("\n18. Testing Invalid Document Type Rejection...");
  const resInvalidType = await fetch(`${BASE_URL}/api/products/${productId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      data: pdfData,
      filename: "test.pdf",
      documentType: "INVALID_TYPE_XYZ",
    }),
  });
  assert(resInvalidType.status === 422, "Invalid documentType correctly rejected with 422");

  console.log("\n==================================================");
  console.log(`PHASE 10 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
