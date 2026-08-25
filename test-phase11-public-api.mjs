/**
 * test-phase11-public-api.mjs
 *
 * End-to-End Verification Suite for Phase 11: Public Product API.
 * Tests visibility rules (VERIFIED→public, all others→private),
 * field stripping (no cost/gov/internal data leaked), filtering,
 * pagination, and category listing.
 */

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
  return (await res.json()).token;
}

async function runTests() {
  console.log("==================================================");
  console.log("PHASE 11: PUBLIC PRODUCT API SUITE");
  console.log("==================================================");

  // ─── 1. GET /api/public/categories ──────────────────────────────────────
  console.log("\n1. GET /api/public/categories — No auth required");
  const resCats = await fetch(`${BASE_URL}/api/public/categories`);
  const dataCats = await resCats.json();
  assert(resCats.status === 200 && dataCats.success, "Returns 200 with success:true");
  assert(Array.isArray(dataCats.data) && dataCats.data.length > 0, "Returns at least one category");
  const firstCat = dataCats.data[0];
  assert(
    "id" in firstCat && "name" in firstCat && "slug" in firstCat && "productCount" in firstCat,
    "Category shape: id, name, slug, productCount"
  );
  assert(
    typeof firstCat.productCount === "number",
    "productCount is a number"
  );
  // Sorted by productCount desc
  assert(
    dataCats.data[0].productCount >= (dataCats.data[1]?.productCount ?? 0),
    "Categories sorted by productCount descending"
  );

  // Cache header
  const catCacheHeader = resCats.headers.get("cache-control") || "";
  assert(
    catCacheHeader.includes("public") && catCacheHeader.includes("s-maxage"),
    "Cache-Control: public, s-maxage set for edge caching"
  );

  // ─── 2. GET /api/public/products — List ─────────────────────────────────
  console.log("\n2. GET /api/public/products — No auth required");
  const resProducts = await fetch(`${BASE_URL}/api/public/products`);
  const dataProducts = await resProducts.json();
  assert(resProducts.status === 200 && dataProducts.success, "Returns 200 with success:true");
  assert(Array.isArray(dataProducts.data), "Returns array of products");
  assert(dataProducts.meta?.total >= 0, "meta.total is present");
  assert(dataProducts.meta?.page === 1, "meta.page defaults to 1");
  assert(dataProducts.meta?.totalPages >= 1, "meta.totalPages is present");

  // ─── 3. Only VERIFIED products visible ──────────────────────────────────
  console.log("\n3. Visibility Rule: Only VERIFIED/APPROVED products");
  const allStatuses = dataProducts.data.map((p) => p.verificationStatus);
  assert(
    allStatuses.every((s) => s === "VERIFIED" || s === "APPROVED"),
    `All returned products are VERIFIED/APPROVED (found: ${[...new Set(allStatuses)].join(", ")})`
  );

  // ─── 4. Sensitive field stripping ───────────────────────────────────────
  console.log("\n4. Sensitive Field Stripping");
  const firstProduct = dataProducts.data[0];
  assert(!!firstProduct, "At least one product returned for field check");

  if (firstProduct) {
    // These fields must NOT be present
    const bannedFields = [
      "actualCost", "vatPaid", "verificationNotes", "rejectionReason",
      "reviewerId", "reviewerName", "reviewerRole", "reviewStartedAt",
      "changesRequestedAt", "changesRequestedNotes", "submissionNotes",
      "submittedAt",
    ];
    for (const field of bannedFields) {
      assert(
        !(field in firstProduct),
        `Sensitive field '${field}' NOT exposed in public listing`
      );
    }
    // Seller sub-object must not expose contact info
    if (firstProduct.seller) {
      assert(!("contactEmail" in firstProduct.seller), "seller.contactEmail NOT exposed");
      assert(!("contactPhone" in firstProduct.seller), "seller.contactPhone NOT exposed");
      assert(!("address" in firstProduct.seller), "seller.address NOT exposed");
      assert(!("panVatNumber" in firstProduct.seller), "seller.panVatNumber NOT exposed");
    }
    // Image sub-objects must not expose storageReference
    if (firstProduct.images?.length) {
      assert(
        firstProduct.images.every((img) => !("storageReference" in img)),
        "images[].storageReference NOT exposed"
      );
    }
    // priceDisplay enrichment present
    assert(
      "priceDisplay" in firstProduct && typeof firstProduct.priceDisplay.mrp === "number",
      "priceDisplay.mrp present and is a number"
    );
    assert(
      "primaryImage" in firstProduct,
      "primaryImage convenience field present"
    );
  }

  // ─── 5. Pagination ──────────────────────────────────────────────────────
  console.log("\n5. Pagination");
  const resPage = await fetch(`${BASE_URL}/api/public/products?page=1&pageSize=2`);
  const dataPage = await resPage.json();
  assert(resPage.status === 200, "Pagination request succeeds");
  assert(dataPage.data.length <= 2, "pageSize=2 returns at most 2 products");
  assert(dataPage.meta.pageSize === 2, "meta.pageSize echoed correctly");

  // ─── 6. Filter by search ─────────────────────────────────────────────────
  console.log("\n6. Search Filter");
  const resSearch = await fetch(`${BASE_URL}/api/public/products?search=oil`);
  const dataSearch = await resSearch.json();
  assert(resSearch.status === 200, "Search request succeeds");
  assert(
    dataSearch.meta?.filters?.search === "oil",
    "Applied filters echoed in meta.filters"
  );

  // ─── 7. Filter by category slug ─────────────────────────────────────────
  console.log("\n7. Category Filter by Slug");
  const catSlug = firstCat.slug;
  const resByCat = await fetch(`${BASE_URL}/api/public/products?category=${catSlug}`);
  const dataByCat = await resByCat.json();
  assert(resByCat.status === 200, `Filter by category slug '${catSlug}' succeeds`);
  const allCorrectCat = dataByCat.data.every((p) => p.category?.slug === catSlug);
  // Only assert if items were returned
  if (dataByCat.data.length > 0) {
    assert(allCorrectCat, "All products in category-filtered result belong to that category");
  }

  // ─── 8. GET /api/public/products/:id — Product detail ───────────────────
  console.log("\n8. GET /api/public/products/:id — Product Detail");
  const verifiedId = dataProducts.data[0]?.id;
  assert(!!verifiedId, "A verified product ID is available for detail test");

  if (verifiedId) {
    const resDetail = await fetch(`${BASE_URL}/api/public/products/${verifiedId}`);
    const dataDetail = await resDetail.json();
    assert(resDetail.status === 200 && dataDetail.success, "Product detail returns 200");

    const prod = dataDetail.data;
    assert(prod.id === verifiedId, "Returned product ID matches requested ID");

    // Compliance block
    assert(
      "compliance" in prod && prod.compliance.governmentVerified === true,
      "compliance.governmentVerified is true for VERIFIED products"
    );
    assert(
      typeof prod.compliance.verifiedDocumentsCount === "number",
      "compliance.verifiedDocumentsCount present"
    );

    // Documents in detail: only VERIFIED, metadata only (no storageReference)
    if (prod.documents?.length) {
      assert(
        prod.documents.every((d) => d.status === "VERIFIED"),
        "Only VERIFIED documents included in public product detail"
      );
      assert(
        prod.documents.every((d) => !("storageReference" in d)),
        "documents[].storageReference NOT exposed in public product detail"
      );
    }

    // VAT breakdown
    if (prod.isVatApplicable) {
      assert(
        typeof prod.priceDisplay.vatAmount === "number",
        "priceDisplay.vatAmount present for VAT-applicable product"
      );
    }

    // Sensitive fields stripped
    const bannedDetail = ["actualCost", "vatPaid", "reviewerId", "verificationNotes"];
    for (const field of bannedDetail) {
      assert(!(field in prod), `Sensitive field '${field}' NOT in product detail`);
    }

    // Cache header for detail
    const detailCache = resDetail.headers.get("cache-control") || "";
    assert(
      detailCache.includes("public") && detailCache.includes("s-maxage"),
      "Product detail has public edge-cache headers"
    );
  }

  // ─── 9. Non-VERIFIED product ID returns 404 (not 403) ──────────────────
  console.log("\n9. Private Product Exposure Test (status ≠ VERIFIED returns 404)");
  const sellerToken = await loginAs("SELLER");

  // Create a DRAFT product (should be private)
  const catId = dataCats.data[0]?.id;
  const resDraft = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      name: `Phase11 DRAFT Product ${Date.now()}`,
      categoryId: catId,
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
  const dataDraft = await resDraft.json();
  const draftId = dataDraft.data?.id;

  if (draftId) {
    const resLeakTest = await fetch(`${BASE_URL}/api/public/products/${draftId}`);
    assert(
      resLeakTest.status === 404,
      "DRAFT product returns 404 on public API (not 403, to avoid leaking existence)"
    );
  }

  // ─── 10. No auth header accepted (public route) ─────────────────────────
  console.log("\n10. Authless Access Verification");
  const resNoAuth = await fetch(`${BASE_URL}/api/public/products`);
  assert(resNoAuth.status === 200, "Public products list succeeds with zero auth headers");

  const resNoAuthCat = await fetch(`${BASE_URL}/api/public/categories`);
  assert(resNoAuthCat.status === 200, "Public categories list succeeds with zero auth headers");

  console.log("\n==================================================");
  console.log(`PHASE 11 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
