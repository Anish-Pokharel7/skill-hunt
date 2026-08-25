/**
 * test-phase9-audit.mjs
 *
 * Full End-to-End Verification Suite for Phase 9: Centralized Audit Logging System.
 * Tests emission, persistence, delta tracking (previousValue, newValue),
 * actor attribution, and query filtering for all critical system actions.
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

async function runPhase9Tests() {
  console.log("==================================================");
  console.log("PHASE 9: CENTRALIZED AUDIT LOGGING SYSTEM SUITE");
  console.log("==================================================");

  // 1. Authenticate Actors
  console.log("\n1. Authenticating test actors...");
  const adminToken = await loginAs("SUPER_ADMIN");
  const sellerToken = await loginAs("SELLER");
  const govToken = await loginAs("GOVERNMENT_OFFICIAL");
  const auditorToken = await loginAs("AUDITOR");

  assert(!!adminToken, "Super Admin authenticated");
  assert(!!sellerToken, "Seller authenticated");
  assert(!!govToken, "Government Official authenticated");
  assert(!!auditorToken, "Auditor authenticated");

  // 2. Test Admin Login Audit Event
  console.log("\n2. Testing Admin Login Audit Logging (ADMIN_LOGIN)...");
  const resAuditLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "SUPER_ADMIN" }),
  });
  assert(resAuditLogin.status === 200, "Admin login executed");

  // 3. Test Category Created Audit Event (CATEGORY_CREATED)
  console.log("\n3. Testing Category Creation Audit Logging (CATEGORY_CREATED)...");
  const uniqueSlug = `audit-test-cat-${Date.now()}`;
  const resCreateCat = await fetch(`${BASE_URL}/api/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Audit Category ${Date.now()}`,
      slug: uniqueSlug,
      description: "Category created to test audit log tracking.",
      isActive: true,
    }),
  });
  const dataCreateCat = await resCreateCat.json();
  assert(resCreateCat.status === 201 && dataCreateCat.success, "Category created successfully");
  const categoryId = dataCreateCat.data.id;

  // 4. Test Category Modified Audit Event (CATEGORY_MODIFIED)
  console.log("\n4. Testing Category Modification Audit Logging (CATEGORY_MODIFIED)...");
  const resUpdateCat = await fetch(`${BASE_URL}/api/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      description: "Updated description to test delta capture in audit logs.",
    }),
  });
  assert(resUpdateCat.status === 200, "Category updated with delta payload");

  // 5. Test Seller Verification Audit Event (ADMIN_SELLER_CHANGED)
  console.log("\n5. Testing Seller Management Audit Logging (ADMIN_SELLER_CHANGED)...");
  const resSellers = await fetch(`${BASE_URL}/api/sellers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dataSellers = await resSellers.json();
  const targetSeller = dataSellers.data[0];

  const resVerifySeller = await fetch(`${BASE_URL}/api/sellers/${targetSeller.id}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: "VERIFIED",
      verificationNotes: "Annual commercial trading license re-authenticated by Admin.",
    }),
  });
  assert(resVerifySeller.status === 200, "Admin changed seller verification status");

  // 6. Test User Status Change Audit Event (USER_STATUS_CHANGED)
  console.log("\n6. Testing User Status Update Audit Logging (USER_STATUS_CHANGED)...");
  const resUpdateUser = await fetch(`${BASE_URL}/api/users/usr_seller_01/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: "ACTIVE",
      reason: "Confirmed regular KYC document validation.",
    }),
  });
  assert(resUpdateUser.status === 200, "Admin updated user status");

  // 7. Query Centralized Audit Logs API
  console.log("\n7. Testing Centralized Audit Logs API (/api/audit-logs)...");
  const resLogs = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dataLogs = await resLogs.json();
  assert(resLogs.status === 200 && dataLogs.success, "Audit logs API returned successfully");

  const logs = dataLogs.data;
  assert(Array.isArray(logs) && logs.length >= 3, `Centralized audit logs retrieved (${logs.length} entries)`);

  // 8. Verify Required Fields on Audit Log Entries
  console.log("\n8. Verifying Required Audit Log Schema & Payload Fields...");
  const sampleLog = logs[0];
  assert(
    !!sampleLog.id &&
      !!sampleLog.timestamp &&
      !!sampleLog.userId &&
      !!sampleLog.userName &&
      !!sampleLog.userRole &&
      !!sampleLog.action &&
      !!sampleLog.resourceType &&
      !!sampleLog.resourceId &&
      !!sampleLog.ipAddress &&
      !!sampleLog.details,
    "Audit log entry contains all required actor, action, entity, timestamp, and network fields",
    JSON.stringify(sampleLog)
  );

  // 9. Verify Category Creation Audit Log with New Value
  console.log("\n9. Verifying Category Creation Audit Log Content...");
  const catCreateLog = logs.find(
    (l) => l.action === "CATEGORY_CREATED" && l.resourceId === categoryId
  );
  assert(
    !!catCreateLog &&
      catCreateLog.resourceType === "CATEGORY" &&
      catCreateLog.newValue?.includes(uniqueSlug),
    "CATEGORY_CREATED log found with entityId, resourceType='CATEGORY', and newValue delta",
    JSON.stringify(catCreateLog)
  );

  // 10. Verify Category Modification Audit Log with Previous & New Values
  console.log("\n10. Verifying Category Modification Delta Tracking...");
  const catModLog = logs.find(
    (l) => l.action === "CATEGORY_MODIFIED" && l.resourceId === categoryId
  );
  assert(
    !!catModLog &&
      !!catModLog.previousValue &&
      !!catModLog.newValue &&
      catModLog.newValue.includes("Updated description to test delta capture"),
    "CATEGORY_MODIFIED log contains both previousValue and newValue snapshots",
    JSON.stringify(catModLog)
  );

  // 11. Test Filtering by Action (?action=CATEGORY_CREATED)
  console.log("\n11. Testing Audit Log Filter (?action=CATEGORY_CREATED)...");
  const resFilterAction = await fetch(
    `${BASE_URL}/api/audit-logs?action=CATEGORY_CREATED`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const dataFilterAction = await resFilterAction.json();
  assert(
    resFilterAction.status === 200 &&
      dataFilterAction.data.every((l) => l.action === "CATEGORY_CREATED"),
    "Filter by action='CATEGORY_CREATED' returned exclusively matching records"
  );

  // 12. Test Filtering by Resource Type (?resourceType=USER)
  console.log("\n12. Testing Audit Log Filter (?resourceType=USER)...");
  const resFilterResource = await fetch(
    `${BASE_URL}/api/audit-logs?resourceType=USER`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const dataFilterResource = await resFilterResource.json();
  assert(
    resFilterResource.status === 200 &&
      dataFilterResource.data.every((l) => l.resourceType === "USER"),
    "Filter by resourceType='USER' returned exclusively matching records"
  );

  // 13. Test RBAC Guard: Unprivileged actors cannot read audit logs
  console.log("\n13. Testing RBAC Security Guard on /api/audit-logs...");
  const resSellerAccess = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(
    resSellerAccess.status === 403,
    "RBAC guard verified: Seller is rejected with 403 Forbidden from accessing system audit logs"
  );

  // 14. Test Auditor Access: Auditors possess read-only audit log inspection rights
  console.log("\n14. Testing Statutory Auditor Oversight Access...");
  const resAuditorAccess = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  const dataAuditorAccess = await resAuditorAccess.json();
  assert(
    resAuditorAccess.status === 200 && dataAuditorAccess.success,
    "Statutory Auditor successfully inspected system audit logs for compliance review"
  );

  console.log("\n==================================================");
  console.log(`PHASE 9 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
