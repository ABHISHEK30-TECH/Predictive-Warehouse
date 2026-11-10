import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { ENV } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import forecastingRoutes from "./routes/forecastingRoutes.js";
import stockoutRoutes from "./routes/stockoutRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();

// Security and utility middleware
app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:3000", ENV.CORS_ORIGIN],
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production database initialization.
// Vercel handles the HTTP server automatically.
if (process.env.VERCEL === "1") {
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      next(error);
    }
  });
}

// Health Check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "Predictive Warehouse Stockout & Reordering Agent API",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Warehouse Stockout Agent API is running 🚀",
    health: "/health",
    apiBase: "/api",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/forecasts", forecastingRoutes);
app.use("/api/stockout", stockoutRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling
app.use(errorHandler);

// Local development startup
async function startServer() {
  try {
    await connectDB();

    const { Product } = await import("./models/Product.js");
    const prodCount = await Product.countDocuments();

    if (prodCount === 0) {
      console.log("[Startup] Empty database detected. Seeding...");

      const { seedDatabase } = await import("./jobs/seed.js");
      await seedDatabase();
    }

    const server = app.listen(ENV.PORT, () => {
      console.log("==============================================");
      console.log("Warehouse Stockout Agent Backend is running!");
      console.log(`URL: http://localhost:${ENV.PORT}`);
      console.log(`Environment: ${ENV.NODE_ENV}`);
      console.log("==============================================");
    });

    const shutdown = async () => {
      console.log("Shutting down server...");

      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Fatal server initialization error:", error);
    process.exit(1);
  }
}

// Start a traditional server only during local development.
if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
