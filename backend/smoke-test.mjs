const BASE = process.env.API_URL || "http://localhost:5000";
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  } catch (e) {
    return { status: 0, json: { message: `network error: ${e.message}` } };
  }
}

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

async function expectStatus(name, promise, expected) {
  const r = await promise;
  check(
    name,
    r.status === expected,
    `(expected ${expected}, got ${r.status}${r.json?.message ? ": " + r.json.message : ""})`,
  );
  return r;
}

const accounts = {
  admin: ["admin@warehouse.local", "AdminPass123!"],
  manager: ["manager@warehouse.local", "ManagerPass123!"],
  staff: ["staff@warehouse.local", "StaffPass123!"],
  superadmin: [
    "superadmin@warehouse.local",
    process.env.SEED_SUPERADMIN_PASSWORD || "SuperAdminPass123!",
  ],
  vendor: ["vendor@warehouse.local", "VendorPass123!"],
  customer: ["customer@warehouse.local", "CustomerPass123!"],
};

console.log(`\nSmoke test against ${BASE}\n`);

// 0. Is the server reachable?
const health = await call("GET", "/health");
if (health.status !== 200) {
  console.log(
    `Cannot reach the backend at ${BASE} (${health.json?.message || "status " + health.status}).`,
  );
  console.log(
    "Start the backend server in its own terminal, check the port, and try again.",
  );
  process.exit(1);
}

// 1. Logins
console.log("1. Logins");
const sessions = {};
for (const [key, [email, password]] of Object.entries(accounts)) {
  const r = await call("POST", "/api/auth/login", {
    body: { email, password },
  });
  const ok = r.status === 200 && r.json?.data?.token;
  check(`login ${key}`, ok, `(status ${r.status}: ${r.json?.message})`);
  if (ok) sessions[key] = { token: r.json.data.token, user: r.json.data.user };
}
if (Object.keys(sessions).length !== Object.keys(accounts).length) {
  console.log(
    "\nSome logins failed. Seed a fresh development database and try again.",
  );
  process.exit(1);
}
const t = (k) => sessions[k].token;

// 2. Admin routes
console.log("\n2. Admin routes");
await expectStatus("no token -> 401", call("GET", "/api/admin/overview"), 401);
await expectStatus(
  "super admin -> 200",
  call("GET", "/api/admin/overview", { token: t("superadmin") }),
  200,
);
await expectStatus(
  "legacy admin -> 200",
  call("GET", "/api/admin/overview", { token: t("admin") }),
  200,
);
for (const k of ["manager", "staff", "vendor", "customer"]) {
  await expectStatus(
    `${k} -> 403`,
    call("GET", "/api/admin/overview", { token: t(k) }),
    403,
  );
}

// 3. Internal routes
console.log("\n3. Internal routes");
for (const path of [
  "/api/products",
  "/api/suppliers",
  "/api/purchase-orders",
  "/api/warehouses",
  "/api/notifications",
]) {
  await expectStatus(
    `super admin ${path} -> 200`,
    call("GET", path, { token: t("superadmin") }),
    200,
  );
  await expectStatus(
    `staff ${path} -> 200`,
    call("GET", path, { token: t("staff") }),
    200,
  );
  await expectStatus(
    `vendor ${path} -> 403`,
    call("GET", path, { token: t("vendor") }),
    403,
  );
  await expectStatus(
    `customer ${path} -> 403`,
    call("GET", path, { token: t("customer") }),
    403,
  );
}

// 4. Purchase order flow as Super Admin
console.log("\n4. Purchase orders as Super Admin");
const list = await call("GET", "/api/purchase-orders", {
  token: t("superadmin"),
});
const orders = list.json?.data || [];
const po = (n) => orders.find((o) => o.purchaseOrderNumber === n);
const po1 = po("PO-2026-00001");
const po2 = po("PO-2026-00002");
const po4 = po("PO-2026-00004");
check("seeded purchase orders found", !!(po1 && po2 && po4));
if (po1) {
  await expectStatus(
    "approve PO-00001 -> 200",
    call("POST", `/api/purchase-orders/${po1._id}/approve`, {
      token: t("superadmin"),
      body: { comments: "smoke test" },
    }),
    200,
  );
}
if (po2) {
  const r = await expectStatus(
    "submit PO-00002 to supplier -> 200",
    call("POST", `/api/purchase-orders/${po2._id}/submit-to-supplier`, {
      token: t("superadmin"),
    }),
    200,
  );
  check(
    "supplier without login is auto ACCEPTED",
    r.json?.data?.purchaseOrder?.supplierStatus === "ACCEPTED",
  );
}

// 5. Supplier protection
console.log("\n5. Supplier protection");
const sl = await call("GET", "/api/suppliers", { token: t("manager") });
const kodiak = (sl.json?.data || []).find((s) =>
  String(s.name).startsWith("Kodiak"),
);
if (kodiak) {
  const r = await call("PUT", `/api/suppliers/${kodiak._id}`, {
    token: t("manager"),
    body: { approved: true, notes: "smoke test" },
  });
  check(
    "manager can edit but cannot approve a supplier",
    r.status === 200 && r.json?.data?.approved === false,
    `(status ${r.status})`,
  );
} else {
  check("Kodiak supplier found", false);
}

// 6. Vendor panel
console.log("\n6. Vendor panel");
const v = t("vendor");
const ov = await call("GET", "/api/vendor/overview", { token: v });
check(
  "vendor overview: 1 order awaiting response",
  ov.status === 200 && ov.json?.data?.awaitingResponse === 1,
  `(got ${JSON.stringify(ov.json?.data)})`,
);
const vl = await call("GET", "/api/vendor/purchase-orders", { token: v });
const vorders = vl.json?.data || [];
check(
  "vendor sees only its own order",
  vorders.length === 1 && vorders[0].purchaseOrderNumber === "PO-2026-00003",
  `(got ${vorders.length} orders)`,
);
check(
  "vendor view hides internal fields",
  !!vorders[0] && !("notes" in vorders[0]) && !("createdBy" in vorders[0]),
);
if (po4) {
  await expectStatus(
    "vendor cannot read another vendor's order -> 404",
    call("GET", `/api/vendor/purchase-orders/${po4._id}`, { token: v }),
    404,
  );
}
const vid = vorders[0]?._id;
if (vid) {
  await expectStatus(
    "ship before accept -> 409",
    call("POST", `/api/vendor/purchase-orders/${vid}/ship`, {
      token: v,
      body: {},
    }),
    409,
  );
  await expectStatus(
    "reject without reason -> 400",
    call("POST", `/api/vendor/purchase-orders/${vid}/reject`, {
      token: v,
      body: {},
    }),
    400,
  );
  await expectStatus(
    "accept -> 200",
    call("POST", `/api/vendor/purchase-orders/${vid}/accept`, {
      token: v,
      body: {},
    }),
    200,
  );
  await expectStatus(
    "accept again -> 409",
    call("POST", `/api/vendor/purchase-orders/${vid}/accept`, {
      token: v,
      body: {},
    }),
    409,
  );
  await expectStatus(
    "ship -> 200",
    call("POST", `/api/vendor/purchase-orders/${vid}/ship`, {
      token: v,
      body: { trackingRef: "TRK-SMOKE" },
    }),
    200,
  );
}
await expectStatus(
  "vendor cannot change its name -> 400",
  call("PATCH", "/api/vendor/profile", { token: v, body: { name: "Hacked" } }),
  400,
);

// 7. Customer panel
console.log("\n7. Customer panel");
const c = t("customer");
const co = await call("GET", "/api/customer/overview", { token: c });
check(
  "customer overview shows its own company",
  co.status === 200 &&
    co.json?.data?.company?.companyName === "Northwind Retail Group",
);
await expectStatus(
  "customer cannot change company name -> 400",
  call("PATCH", "/api/customer/profile", {
    token: c,
    body: { companyName: "Hacked" },
  }),
  400,
);
await expectStatus(
  "customer updates phone -> 200",
  call("PATCH", "/api/customer/profile", {
    token: c,
    body: { phone: "+1 555 777 8888" },
  }),
  200,
);
const sr = await expectStatus(
  "customer creates a support request -> 201",
  call("POST", "/api/customer/support-requests", {
    token: c,
    body: {
      subject: "Need help",
      message: "How do I add a second warehouse?",
      category: "Onboarding",
    },
  }),
  201,
);
const srId = sr.json?.data?._id;
const al = await call("GET", "/api/admin/support-requests", {
  token: t("superadmin"),
});
check(
  "admin sees the support request",
  (al.json?.data || []).some((x) => x._id === srId),
);
if (srId) {
  await expectStatus(
    "admin replies -> 200",
    call("PATCH", `/api/admin/support-requests/${srId}`, {
      token: t("superadmin"),
      body: { status: "resolved", response: "Smoke test reply" },
    }),
    200,
  );
  const mine = await call("GET", `/api/customer/support-requests/${srId}`, {
    token: c,
  });
  check(
    "customer sees the reply",
    mine.json?.data?.adminResponse === "Smoke test reply",
  );
}
await expectStatus(
  "vendor cannot use customer routes -> 403",
  call("GET", "/api/customer/overview", { token: v }),
  403,
);
const cl = await call("GET", "/api/admin/customers", {
  token: t("superadmin"),
});
const demo = (cl.json?.data || []).find(
  (x) => x.email === "customer@warehouse.local",
);
if (demo) {
  await expectStatus(
    "activating an already active customer -> 409",
    call("POST", `/api/admin/customers/${demo._id}/activate`, {
      token: t("superadmin"),
    }),
    409,
  );
}

// 8. Auth rules
console.log("\n8. Auth rules");
const reg = await call("POST", "/api/auth/register", {
  body: {
    name: "Smoke Tester",
    email: `smoke${Date.now()}@test.local`,
    password: "Passw0rd123",
    role: "Admin",
  },
});
check(
  "public register ignores the requested role",
  reg.status === 201 && reg.json?.data?.user?.role === "Inventory Staff",
);
await expectStatus(
  "wrong current password -> 400",
  call("POST", "/api/auth/change-password", {
    token: v,
    body: { currentPassword: "wrong", newPassword: "NewPass12345" },
  }),
  400,
);
await expectStatus(
  "too short new password -> 400",
  call("POST", "/api/auth/change-password", {
    token: v,
    body: { currentPassword: "VendorPass123!", newPassword: "abc" },
  }),
  400,
);

// 9. Instant suspension (the vendor is reactivated at the end)
console.log("\n9. Suspension");
const vendorUserId = sessions.vendor.user.id;
await expectStatus(
  "super admin suspends the vendor login -> 200",
  call("PATCH", `/api/admin/users/${vendorUserId}/status`, {
    token: t("superadmin"),
    body: { status: "Suspended" },
  }),
  200,
);
await expectStatus(
  "suspended vendor cannot log in -> 403",
  call("POST", "/api/auth/login", {
    body: { email: accounts.vendor[0], password: accounts.vendor[1] },
  }),
  403,
);
await expectStatus(
  "suspended vendor old token stops working -> 403",
  call("GET", "/api/vendor/overview", { token: v }),
  403,
);
await expectStatus(
  "super admin reactivates the vendor -> 200",
  call("PATCH", `/api/admin/users/${vendorUserId}/status`, {
    token: t("superadmin"),
    body: { status: "Active" },
  }),
  200,
);
await expectStatus(
  "vendor works again -> 200",
  call("GET", "/api/vendor/overview", { token: v }),
  200,
);

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
