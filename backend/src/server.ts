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
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "Predictive Warehouse Stockout & Reordering Agent API",
    timestamp: new Date().toISOString(),
  });
});

// Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Warehouse Stockout Agent API is running 🚀",
    health: "/health",
    apiBase: "/api",
  });
});

// Mount API routes
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

// 404 handler for unknown routes (optional but recommended)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling (must stay last)
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty
    const { Product } = await import("./models/Product.js");
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      console.log(
        "[Startup] Empty database detected. Auto-seeding initial warehouse datasets...",
      );
      const { seedDatabase } = await import("./jobs/seed.js");
      await seedDatabase();
    }

    const server = app.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Warehouse Stockout Agent Backend Server is running!`);
      console.log(`📡 URL: http://localhost:${ENV.PORT}`);
      console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
      console.log(`=======================================================`);
    });

    const shutdown = async () => {
      console.log("\nShutting down server gracefully...");
      server.close(async () => {
        await disconnectDB();
        console.log("Database disconnected. Process exiting.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err: any) {
    console.error("Fatal error during server initialization:", err);
    process.exit(1);
  }
}

startServer();

export default app;
