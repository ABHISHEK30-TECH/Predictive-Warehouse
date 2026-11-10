import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const mongodbUri =
  process.env.MONGODB_URI ||
  (isProduction ? "" : "mongodb://127.0.0.1:27017/warehouse_stockout_agent");

const jwtSecret =
  process.env.JWT_SECRET ||
  (isProduction ? "" : "local_development_secret_only");

if (isProduction && !mongodbUri) {
  throw new Error("MONGODB_URI is required in production.");
}

if (isProduction && !jwtSecret) {
  throw new Error("JWT_SECRET is required in production.");
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: parseInt(process.env.PORT || "5000", 10),

  MONGODB_URI: mongodbUri,

  USE_IN_MEMORY_DB: !isProduction && process.env.USE_IN_MEMORY_DB === "true",

  JWT_SECRET: jwtSecret,

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  SIMULATE_SUPPLIER_DELAY_MS: parseInt(
    process.env.SIMULATE_SUPPLIER_DELAY_MS || "800",
    10,
  ),
};
