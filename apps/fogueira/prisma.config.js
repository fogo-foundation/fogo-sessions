const path = require("path");
const fs = require("fs");

// Try loading .env.local first, then fall back to .env
const envLocalPath = path.resolve(__dirname, ".env.local");
const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envLocalPath)) {
  require("dotenv").config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables. Please check your .env.local or .env file.");
}

module.exports = {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

