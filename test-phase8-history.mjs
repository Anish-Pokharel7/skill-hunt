/**
 * test-phase8-history.mjs
 *
 * Full Lifecycle & Security Test for Phase 8: Product History System.
 * Verifies that important product changes (Price, Specs, Seller, Admin Overrides)
 * are immutably logged with old value, new value, actor identity, timestamp, and reason.
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

async function runPhase8Tests() {
  console.log("==================================================");
  console.log("PHASE 8: PRODUCT HISTORY & AUDIT TRAIL E2E SUITE");
  console.log("==================================================");

  // 1. Authenticate Actors
  console.log("\n1. Authenticating test actors...");
  const sellerToken = await loginAs("SELLER");
  const adminToken = await loginAs("SUPER_ADMIN");
  const govToken = await loginAs("GOVERNMENT_OFFICIAL");
  const consumerToken = await loginAs("CONSUMER");

  assert(!!sellerToken, "Seller token acquired");
  assert(!!adminToken, "Super Admin token acquired");
  assert(!!govToken, "Government Official token acquired");

  // 2. Fetch an active category
  const resCat = await fetch(`${BASE_URL}/api/categories`);
  const dataCat = await resCat.json();
  const categoryId = dataCat.data[0].id;

  // 3. Create a test product: Initial price Rs. 2,500
  console.log("\n2. Creating test product with initial price Rs. 2,500...");
  const resCreate = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      name: `Himalayan Pure Shilajit Resin-${Date.now()}`,
      description: "Purified high-altitude organic mineral resin.",
      brand: "Himalayan Herbs Ltd",
      model: "SHL-50G",
      categoryId,
      manufacturerName: "Himalayan Herbal Bio-Extracts Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 1800.0,
      consumerPrice: 2500.0, // Initial price Rs. 2,500
      currency: "NPR",
    }),
  });
  const dataCreate = await resCreate.json();
  assert(resCreate.status === 201 && dataCreate.success, "Product created with initial price Rs. 2,500");
  const productId = dataCreate.data.id;

  // 4. Update Price: Rs. 2,500 -> Rs. 2,300 with Reason
  console.log("\n3. Testing Price Revision (Rs. 2,500 -> Rs. 2,300)...");
  const resPriceUpdate = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      consumerPrice: 2300.0,
      reason: "Seasonal promotional discount and bulk manufacturing cost reduction.",
    }),
  });
  const dataPriceUpdate = await resPriceUpdate.json();
  assert(
    resPriceUpdate.status === 200 &&
      dataPriceUpdate.success &&
      dataPriceUpdate.data.consumerPrice === 2300.0,
    "Product price successfully updated to Rs. 2,300"
  );

  // 5. Update Specifications: Model and Description Update
  console.log("\n4. Testing Product Specification Updates...");
  const resSpecUpdate = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      model: "SHL-50G-V2",
      description: "Purified high-altitude organic mineral resin with 85+ trace minerals and fulvic acid >65%.",
      reason: "Updated nutritional facts and mineral concentration specifications.",
    }),
  });
  const dataSpecUpdate = await resSpecUpdate.json();
  assert(
    resSpecUpdate.status === 200 && dataSpecUpdate.success,
    "Product specifications successfully updated"
  );

  // 6. Administrative Override: Admin updates actualCost with administrative rationale
  console.log("\n5. Testing Administrative Cost & MRP Override...");
  const resAdminOverride = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      actualCost: 1650.0,
      consumerPrice: 2200.0,
      reason: "Statutory MRP ceiling adjustment following Inland Revenue excise duty reduction.",
    }),
  });
  const dataAdminOverride = await resAdminOverride.json();
  assert(
    resAdminOverride.status === 200 && dataAdminOverride.success,
    "Administrative override successfully executed by Super Admin"
  );

  // 7. Verify Granular Product History API
  console.log("\n6. Testing Product History Retrieval API (/api/products/:id/history)...");
  const resHistory = await fetch(`${BASE_URL}/api/products/${productId}/history`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const dataHistory = await resHistory.json();
  assert(
    resHistory.status === 200 && dataHistory.success,
    "Product history API returned successfully"
  );

  const changes = dataHistory.data.changes;
  assert(
    Array.isArray(changes) && changes.length >= 4,
    `Granular field history recorded (${changes.length} change entries stored)`
  );

  // Verify first price change record (2500 -> 2300)
  const priceChange = changes.find(
    (c) => c.fieldName === "consumerPrice" && c.newValue?.includes("2,300")
  );
  assert(
    !!priceChange &&
      priceChange.oldValue?.includes("2,500") &&
      priceChange.changeType === "PRICE_CHANGE" &&
      priceChange.changedByRole === "SELLER" &&
      !!priceChange.reason,
    "Price history record verified: Old Value: 'NPR 2,500', New Value: 'NPR 2,300', Changed By: Seller, Reason included",
    JSON.stringify(priceChange)
  );

  // Verify administrative override price change (2300 -> 2200)
  const adminPriceChange = changes.find(
    (c) => c.fieldName === "consumerPrice" && c.newValue?.includes("2,200")
  );
  assert(
    !!adminPriceChange &&
      adminPriceChange.oldValue?.includes("2,300") &&
      adminPriceChange.changedByRole === "SUPER_ADMIN",
    "Admin override record verified: Old Value: 'NPR 2,300', New Value: 'NPR 2,200', Changed By: Super Admin",
    JSON.stringify(adminPriceChange)
  );

  // 8. Test History Filtering by Change Type
  console.log("\n7. Testing History Filtering (?type=PRICE_CHANGE)...");
  const resFilterPrice = await fetch(
    `${BASE_URL}/api/products/${productId}/history?type=PRICE_CHANGE`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const dataFilterPrice = await resFilterPrice.json();
  assert(
    resFilterPrice.status === 200 &&
      dataFilterPrice.data.changes.every((c) => c.changeType === "PRICE_CHANGE"),
    "Filter by changeType='PRICE_CHANGE' strictly returned only price change records"
  );

  // 9. Test History Filtering by Field Name
  console.log("\n8. Testing History Filtering (?field=consumerPrice)...");
  const resFilterField = await fetch(
    `${BASE_URL}/api/products/${productId}/history?field=consumerPrice`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const dataFilterField = await resFilterField.json();
  assert(
    resFilterField.status === 200 &&
      dataFilterField.data.changes.every((c) => c.fieldName === "consumerPrice"),
    "Filter by field='consumerPrice' strictly returned only consumerPrice field updates"
  );

  // 10. Test Unified Timeline (Changes + Verification Transitions)
  console.log("\n9. Testing Unified Chronological Timeline...");
  const timeline = dataHistory.data.timeline;
  assert(
    Array.isArray(timeline) && timeline.length >= 4,
    `Unified timeline assembled (${timeline.length} total chronological events)`
  );

  // 11. Anti-IDOR Security: Another seller cannot inspect history of unowned product
  console.log("\n10. Testing Anti-IDOR Security on Product History...");
  const otherSellerLogin = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "BUSINESS_EMPLOYEE" }),
  });
  const otherSellerData = await otherSellerLogin.json();
  const otherSellerToken = otherSellerData.token;

  const resIdorHistory = await fetch(`${BASE_URL}/api/products/${productId}/history`, {
    headers: { Authorization: `Bearer ${otherSellerToken}` },
  });
  assert(
    resIdorHistory.status === 403,
    "Anti-IDOR protection verified: Unaffiliated commercial actor cannot view history of unowned product"
  );

  console.log("\n==================================================");
  console.log(`PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
