// Phase 5 — Comprehensive Product CRUD API Test Suite
// Verifies: Creation, Editing, Deletion, Ownership & IDOR Protection, Category Validation, Seller Validation

const BASE_URL = "http://localhost:3000";

async function runPhase5Tests() {
  console.log("==================================================");
  console.log("RUNNING PHASE 5 — PRODUCT CRUD & SECURITY TEST SUITE");
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

  // --- Helper: Login as Role ---
  async function loginAsRole(role) {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    return data.token;
  }

  // Tokens
  const adminToken = await loginAsRole("SUPER_ADMIN");
  const mfgToken = await loginAsRole("MANUFACTURER"); // Elena Rostova (seller_apex_01)
  const retailToken = await loginAsRole("BUSINESS_EMPLOYEE"); // Rohan Joshi (seller_metro_01)
  const consumerToken = await loginAsRole("CONSUMER"); // Maya Lin (No seller profile)

  // 0. Fetch valid active category
  console.log("--- 0. Fetching Category ID ---");
  const resCat = await fetch(`${BASE_URL}/api/categories`);
  const dataCat = await resCat.json();
  const validCategoryId = dataCat.data[0]?.id;
  assert(validCategoryId, "Retrieved valid category ID for product tests", JSON.stringify(dataCat));

  // TEST 1: Seller Validation - Consumer blocked from creating product
  console.log("\n--- 1. Testing Seller Validation on Product Creation ---");
  const resConsumerCreate = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${consumerToken}`,
    },
    body: JSON.stringify({
      name: "Illegal Consumer Product",
      categoryId: validCategoryId,
      actualCost: 100,
      consumerPrice: 200,
    }),
  });
  assert(
    resConsumerCreate.status === 403,
    "Consumer without seller profile is rejected with HTTP 403 Forbidden",
    `Status: ${resConsumerCreate.status}`
  );

  // TEST 2: Category Validation - Non-existent category rejected
  console.log("\n--- 2. Testing Category Validation ---");
  const resInvalidCat = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mfgToken}`,
    },
    body: JSON.stringify({
      name: "Invalid Category Product",
      categoryId: "cat_non_existent_99999",
      actualCost: 500,
      consumerPrice: 800,
    }),
  });
  const dataInvalidCat = await resInvalidCat.json();
  assert(
    resInvalidCat.status === 422,
    "Product creation with non-existent category is rejected with HTTP 422",
    JSON.stringify(dataInvalidCat)
  );

  // TEST 3: Product Validation - Invalid payload (negative price) rejected
  console.log("\n--- 3. Testing Product Payload Validation ---");
  const resInvalidPrice = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mfgToken}`,
    },
    body: JSON.stringify({
      name: "P", // too short (min 2)
      categoryId: validCategoryId,
      actualCost: -50, // invalid negative cost
      consumerPrice: 0, // must be positive
    }),
  });
  const dataInvalidPrice = await resInvalidPrice.json();
  assert(
    resInvalidPrice.status === 422,
    "Product creation with invalid fields is rejected with HTTP 422 Unprocessable Entity",
    JSON.stringify(dataInvalidPrice)
  );

  // TEST 4: Product Creation by Seller A (Manufacturer Elena - seller_apex_01)
  console.log("\n--- 4. Testing Product Creation by Verified Seller A ---");
  const resCreateA = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mfgToken}`,
    },
    body: JSON.stringify({
      name: "Apex Himalayan Organic Honey 500g",
      description: "100% pure raw wild organic mountain honey harvested from Himalayan foothills.",
      brand: "Apex Pure",
      model: "HONEY-500G",
      categoryId: validCategoryId,
      manufacturerName: "Apex BioTech & Consumer Goods Mfg Ltd",
      countryOfOrigin: "Nepal",
      originType: "DOMESTIC_MANUFACTURED",
      isNepalManufactured: true,
      isVatApplicable: true,
      vatRate: 0.13,
      actualCost: 450,
      consumerPrice: 850,
      currency: "NPR",
    }),
  });
  const dataCreateA = await resCreateA.json();
  const productA = dataCreateA.data;
  assert(
    resCreateA.status === 201 && productA?.id && productA.verificationStatus === "PENDING",
    `Seller A successfully registered product '${productA?.name}' with status PENDING`,
    JSON.stringify(dataCreateA)
  );

  // TEST 5: GET /api/products/my for Seller A
  console.log("\n--- 5. Testing GET /api/products/my (Tenant Scoping) ---");
  const resMyA = await fetch(`${BASE_URL}/api/products/my`, {
    headers: { Authorization: `Bearer ${mfgToken}` },
  });
  const dataMyA = await resMyA.json();
  assert(
    resMyA.status === 200 &&
      dataMyA.success &&
      dataMyA.data.some((p) => p.id === productA.id),
    `GET /api/products/my returns products belonging to Seller A (${dataMyA.meta?.total} products found)`,
    JSON.stringify(dataMyA)
  );

  // Non-seller GET /api/products/my returns 404
  const resMyConsumer = await fetch(`${BASE_URL}/api/products/my`, {
    headers: { Authorization: `Bearer ${consumerToken}` },
  });
  assert(
    resMyConsumer.status === 404,
    "GET /api/products/my for non-seller returns HTTP 404 Not Found",
    `Status: ${resMyConsumer.status}`
  );

  // TEST 6: GET /api/products/:id Access Control
  console.log("\n--- 6. Testing GET /api/products/:id Access Control ---");
  // Owner Seller A viewing own product
  const resGetOwner = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    headers: { Authorization: `Bearer ${mfgToken}` },
  });
  const dataGetOwner = await resGetOwner.json();
  assert(
    resGetOwner.status === 200 && dataGetOwner.data.id === productA.id,
    "Owner Seller A can view their own product details",
    JSON.stringify(dataGetOwner)
  );

  // Other Seller B (Rohan) attempting to view Seller A's unverified product -> Blocked
  const resGetOther = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    headers: { Authorization: `Bearer ${retailToken}` },
  });
  assert(
    resGetOther.status === 403,
    "Seller B is blocked from viewing Seller A's unverified PENDING product (HTTP 403)",
    `Status: ${resGetOther.status}`
  );

  // Super Admin can view any product
  const resGetAdmin = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    resGetAdmin.status === 200,
    "Super Admin possesses statutory oversight to view any product",
    `Status: ${resGetAdmin.status}`
  );

  // TEST 7: Product Editing by Owner Seller A
  console.log("\n--- 7. Testing Product Editing (PATCH /api/products/:id) by Owner ---");
  const resEditOwner = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mfgToken}`,
    },
    body: JSON.stringify({
      name: "Apex Himalayan Organic Honey 500g (Premium Grade A)",
      consumerPrice: 890,
    }),
  });
  const dataEditOwner = await resEditOwner.json();
  assert(
    resEditOwner.status === 200 &&
      dataEditOwner.data.consumerPrice === 890 &&
      dataEditOwner.data.name.includes("Premium Grade A"),
    "Owner Seller A successfully updated product name and price",
    JSON.stringify(dataEditOwner)
  );

  // TEST 8: Anti-IDOR & Product Ownership Validation — Seller B attempting to modify Seller A's product
  console.log("\n--- 8. Testing Anti-IDOR: Cross-Seller Tampering Prevention ---");
  const resTamper = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${retailToken}`, // Seller B (Metro)
    },
    body: JSON.stringify({
      name: "HACKED BY SELLER B",
      consumerPrice: 10,
    }),
  });
  const dataTamper = await resTamper.json();
  assert(
    resTamper.status === 403,
    "CRITICAL: Seller B strictly blocked from modifying Seller A's product with HTTP 403 Forbidden",
    JSON.stringify(dataTamper)
  );

  // Verify product unchanged
  const resVerifyUnchanged = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    headers: { Authorization: `Bearer ${mfgToken}` },
  });
  const dataVerifyUnchanged = await resVerifyUnchanged.json();
  assert(
    dataVerifyUnchanged.data.name.includes("Premium Grade A") && dataVerifyUnchanged.data.consumerPrice === 890,
    "Verified product integrity maintained against tampering attempt",
    JSON.stringify(dataVerifyUnchanged)
  );

  // TEST 9: Cross-Seller Deletion Prevention — Seller B attempting to delete Seller A's product
  console.log("\n--- 9. Testing Anti-IDOR: Cross-Seller Deletion Prevention ---");
  const resIllegalDelete = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${retailToken}` }, // Seller B (Metro)
  });
  const dataIllegalDelete = await resIllegalDelete.json();
  assert(
    resIllegalDelete.status === 403,
    "CRITICAL: Seller B strictly blocked from deleting Seller A's product with HTTP 403 Forbidden",
    JSON.stringify(dataIllegalDelete)
  );

  // TEST 10: Product Deletion by Owner Seller A
  console.log("\n--- 10. Testing Product Deletion (DELETE /api/products/:id) by Owner ---");
  const resDeleteOwner = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${mfgToken}` },
  });
  const dataDeleteOwner = await resDeleteOwner.json();
  assert(
    resDeleteOwner.status === 200 && dataDeleteOwner.success,
    "Owner Seller A successfully deleted own product",
    JSON.stringify(dataDeleteOwner)
  );

  // Verify product no longer exists
  const resCheckDeleted = await fetch(`${BASE_URL}/api/products/${productA.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    resCheckDeleted.status === 404,
    "Verified deleted product returns HTTP 404 Not Found",
    `Status: ${resCheckDeleted.status}`
  );

  // TEST 11: Super Admin Direct Creation & Management
  console.log("\n--- 11. Testing Super Admin Authority ---");
  const resAdminCreate = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: "Government Standardized Salt 1kg",
      categoryId: validCategoryId,
      actualCost: 20,
      consumerPrice: 35,
      vatRate: 0.13,
      currency: "NPR",
    }),
  });
  const dataAdminCreate = await resAdminCreate.json();
  const adminProduct = dataAdminCreate.data;
  assert(
    resAdminCreate.status === 201 && adminProduct.verificationStatus === "VERIFIED",
    "Super Admin created auto-verified product under statutory authority",
    JSON.stringify(dataAdminCreate)
  );

  // Super Admin delete
  const resAdminDelete = await fetch(`${BASE_URL}/api/products/${adminProduct.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    resAdminDelete.status === 200,
    "Super Admin successfully removed product from national registry",
    `Status: ${resAdminDelete.status}`
  );

  console.log("\n==================================================");
  console.log(`PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
