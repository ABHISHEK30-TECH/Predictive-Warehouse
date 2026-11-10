# Predictive Warehouse Stockout & Reordering Agent

An enterprise-grade, production-oriented warehouse inventory intelligence system that predicts stock shortages, analyzes historical and seasonal demand trajectories, recommends reorder quantities, and automates purchase order drafting with multi-level manager approval and supplier EDI/API submission.

---

## 1. System Overview & Core Capabilities

- **Real-Time Telemetry & Inventory Monitoring**: Tracks warehouse on-hand stock, safety stock levels, and replenishment points across regional distribution hubs.
- **Dual-Engine Demand Forecasting**:
  - **Approach 1 (Moving Average)**: Rolling baseline calculated from historical demand records over configurable windows (7, 14, 30 days).
  - **Approach 2 (Seasonal Modeling)**: Analyzes day-of-week consumption patterns (Monday ecommerce surges, Thursday staging, weekend pauses) combined with cyclical seasonal multipliers.
- **Stockout Prediction Radar**: Computes exact days until depletion based on burn rates, lead times, and incoming confirmed purchase orders, categorizing risks as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` with explanatory reasoning.
- **Automated Reordering Recommendation Engine**: Dispatches replenishment drafts, selects optimal pre-approved vendors matching product categories, and enforces duplicate purchase order prevention.
- **Strict Multi-Tier Approval Workflow**:
  - Purchase orders **MUST NOT** be dispatched to suppliers without authorization.
  - Role-based authorization restricts approval and rejection strictly to `Admin` and `Warehouse Manager`.
  - Approved purchase orders can be electronically transmitted to pre-approved suppliers via the supplier integration layer.
- **Complete Audit Trail**: Immutable logging of every status transition with user identification, timestamps, and comments.

---

## 2. Technology Stack

- **Frontend**:
  - Next.js 14 (App Router)
  - React 18, TypeScript
  - Tailwind CSS
  - Recharts for analytical visualizations
  - Lucide React for enterprise icons
  - Axios for API communication
- **Backend**:
  - Node.js, Express.js (TypeScript)
  - RESTful API Architecture
  - JWT Authentication & bcrypt password hashing
  - Helmet & CORS security headers, Morgan logging
- **Database**:
  - MongoDB with Mongoose ODM
  - Seamless zero-config in-memory MongoDB fallback for immediate evaluation if local MongoDB service is not started.

---

## 3. Project Directory Structure

```
warehouse-stockout-agent/
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with AuthProvider & enterprise chrome
│   │   ├── page.tsx                  # Executive Telemetry Dashboard & KPIs
│   │   ├── login/page.tsx            # Auth Login with 1-Click Demo Profiles
│   │   ├── register/page.tsx         # User registration with role assignment
│   │   ├── inventory/page.tsx        # Inventory Catalog, Search & CRUD
│   │   ├── forecasting/page.tsx      # Demand Forecasting (7, 30, 90 day horizons)
│   │   ├── stockout/page.tsx         # Stockout Prediction Radar
│   │   ├── purchase-orders/page.tsx  # PO Queue & Order Drafting
│   │   ├── purchase-orders/[id]/page.tsx # PO Details, Manager Approval & Dispatch
│   │   ├── suppliers/page.tsx        # Supplier Directory & Pre-Approval Rosters
│   │   └── reports/page.tsx          # Analytics, Valuation Breakdown & CSV Export
│   ├── components/
│   │   ├── Navbar.tsx                # Top navigation bar, telemetry status & notifications
│   │   └── Sidebar.tsx               # Enterprise sidebar navigation
│   ├── context/
│   │   └── AuthContext.tsx           # JWT token management & session state
│   ├── services/
│   │   └── api.ts                    # Axios API client with token interceptor
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript interfaces
│   ├── package.json
│   └── .env.local.example
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                 # MongoDB connection with zero-config memory fallback
│   │   │   └── env.ts                # Environment configurations
│   │   ├── controllers/              # REST API controllers
│   │   │   ├── authController.ts
│   │   │   ├── productController.ts
│   │   │   ├── inventoryController.ts
│   │   │   ├── forecastingController.ts
│   │   │   ├── stockoutController.ts
│   │   │   ├── supplierController.ts
│   │   │   ├── purchaseOrderController.ts
│   │   │   ├── dashboardController.ts
│   │   │   └── reportController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification & role authorization guards
│   │   │   └── errorHandler.ts       # Centralized error handler
│   │   ├── models/                   # Mongoose schemas & indexes
│   │   │   ├── User.ts
│   │   │   ├── Product.ts
│   │   │   ├── Warehouse.ts
│   │   │   ├── Supplier.ts
│   │   │   ├── InventoryMovement.ts
│   │   │   ├── DemandHistory.ts
│   │   │   ├── Forecast.ts
│   │   │   ├── StockoutRisk.ts
│   │   │   ├── PurchaseOrder.ts
│   │   │   ├── ApprovalLog.ts
│   │   │   └── Notification.ts
│   │   ├── routes/                   # Express routes
│   │   ├── services/
│   │   │   ├── forecastingService.ts # Moving Average & Seasonal algorithms
│   │   │   ├── stockoutService.ts    # Lead time, safety stock & runway engine
│   │   │   ├── reorderingService.ts  # Automated reordering & duplicate prevention
│   │   │   ├── supplierIntegrationService.ts # Pluggable supplier adapter
│   │   │   └── approvalService.ts    # Approval state machine & audit logger
│   │   ├── jobs/
│   │   │   └── seed.ts               # Demo data seeder (20 products, 45d demand telemetry)
│   │   ├── tests/
│   │   │   └── runTests.ts           # 12 automated business logic tests
│   │   └── server.ts                 # Express server entry point
│   ├── package.json
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

## 4. Setup & Running Instructions (Windows & Cross-Platform)

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on v20.19.4)
- **npm**: v9.0.0 or higher (Tested on v10.8.2)
- **MongoDB**: Optional local MongoDB daemon or MongoDB Atlas. If no local MongoDB is detected, the server automatically starts an embedded zero-config In-Memory MongoDB.

---

### Terminal 1: Backend Setup & Execution

1. Navigate to the `backend` folder:
   ```powershell
   cd "backend"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Configure Environment Variables:
   A default `.env` file is already supplied:
   ```ini
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/warehouse_stockout_agent
   USE_IN_MEMORY_DB=false
   JWT_SECRET=warehouse_super_secret_jwt_key_2026_ricoz_ai
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   SIMULATE_SUPPLIER_DELAY_MS=800
   ```

4. Seed the Database:
   ```powershell
   npm run seed
   ```
   *(Note: The server also auto-seeds automatically on first launch if the database is empty).*

5. Run Automated Tests:
   ```powershell
   npm test
   ```

6. Start Backend Server:
   ```powershell
   npm run dev
   ```
   Backend API runs at: `http://localhost:5000`

---

### Terminal 2: Frontend Setup & Execution

1. Open a new terminal and navigate to the `frontend` folder:
   ```powershell
   cd "frontend"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Ensure `.env.local` exists:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start Frontend Development Server:
   ```powershell
   npm run dev
   ```
   Frontend Application runs at: `http://localhost:3000`

5. Open your browser and navigate to:
   **[http://localhost:3000](http://localhost:3000)**

---

## 5. Demo Credentials

The application provides convenient **1-Click Quick Fill** buttons directly on the Login screen, or you may enter credentials manually:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Warehouse Manager** | `manager@warehouse.local` | `ManagerPass123!` | Authorize & Approve POs, Transmit to Suppliers, Manage Inventory |
| **Admin** | `admin@warehouse.local` | `AdminPass123!` | Full System Control, User Administration, Delete SKUs, Override Approvals |
| **Inventory Staff** | `staff@warehouse.local` | `StaffPass123!` | Record Stock Movements, View Forecasts, Draft PO Recommendations |

---

## 6. Business Logic & Test Suite Verification

Execute the test suite at any time via:
```powershell
cd backend
npm test
```

### Verified Business Rules
1. **Sufficient Inventory**: Products above reorder points (e.g. 520 units on-hand) generate `LOW` risk classifications with zero false alerts.
2. **Critical Risk Detection**: Products depleted to or below safety stock generate `CRITICAL` risk alerts with detailed runway explanations.
3. **Historical Telemetry Usage**: Forecast engine reads actual 45-day sales order history per SKU from MongoDB.
4. **Seasonal Multipliers**: Incorporates day-of-week demand surges distinct from flat moving averages.
5. **Enforced Manager Approval**: Unapproved purchase orders in `PENDING_APPROVAL` status **cannot** be dispatched to external suppliers.
6. **Role Guard**: Unauthorized users (`Inventory Staff`) are blocked with HTTP 403 when attempting to approve purchase orders.
7. **Supplier Roster Compliance**: Unapproved vendors are blocked from receiving automated order dispatch.
8. **Duplicate Prevention**: Automated sweeps verify existing pending/approved orders before generating duplicate PO drafts for the same SKU.
9. **Electronic Supplier Adapter**: Approved purchase orders transition cleanly to `SUBMITTED`, generating an external EDI reference confirmation (`SUP-ACK-...`).

---

## 7. API Reference Endpoints

- **Authentication**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- **Dashboard**:
  - `GET /api/dashboard/stats`
  - `GET /api/dashboard/alerts`
- **Products**:
  - `GET /api/products`
  - `POST /api/products`
  - `GET /api/products/:id`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- **Inventory Movements**:
  - `GET /api/inventory`
  - `GET /api/inventory/movements`
  - `POST /api/inventory/movements`
- **Demand Forecasting**:
  - `GET /api/forecasts`
  - `POST /api/forecasts/generate`
  - `GET /api/forecasts/:productId`
- **Stockout Prediction**:
  - `GET /api/stockout`
  - `GET /api/stockout/:productId`
- **Suppliers**:
  - `GET /api/suppliers`
  - `POST /api/suppliers`
  - `PUT /api/suppliers/:id`
  - `DELETE /api/suppliers/:id`
- **Purchase Orders**:
  - `GET /api/purchase-orders`
  - `POST /api/purchase-orders`
  - `POST /api/purchase-orders/auto-recommend`
  - `GET /api/purchase-orders/:id`
  - `POST /api/purchase-orders/:id/submit-for-approval`
  - `POST /api/purchase-orders/:id/approve` *(Admin/Manager only)*
  - `POST /api/purchase-orders/:id/reject` *(Admin/Manager only)*
  - `POST /api/purchase-orders/:id/submit-to-supplier` *(Admin/Manager only)*
  - `POST /api/purchase-orders/:id/receive`
- **Reports**:
  - `GET /api/reports/inventory`
  - `GET /api/reports/stockout`
  - `GET /api/reports/purchase-orders`
