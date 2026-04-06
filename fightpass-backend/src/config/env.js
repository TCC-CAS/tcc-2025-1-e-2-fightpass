const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  appName: process.env.APP_NAME || "FightPass API",
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || "fightpass",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || ""
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change-this-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  },
  checkinTokenTtlSeconds: Number(process.env.CHECKIN_TOKEN_TTL_SECONDS || 45),
  bookingCancellationLimitHours: Number(process.env.BOOKING_CANCELLATION_LIMIT_HOURS || 2)
};
