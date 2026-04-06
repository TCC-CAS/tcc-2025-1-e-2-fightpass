const express = require("express");
const authRoutes = require("./modules/auth");
const profileRoutes = require("./modules/profile");
const catalogRoutes = require("./modules/catalog");
const classesRoutes = require("./modules/classes");
const bookingRoutes = require("./modules/bookings");
const checkinRoutes = require("./modules/checkin");
const evaluationRoutes = require("./modules/evaluations");
const dashboardRoutes = require("./modules/dashboard");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "API do FightPass operacional" });
});

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/", catalogRoutes);
router.use("/classes", classesRoutes);
router.use("/bookings", bookingRoutes);
router.use("/checkin", checkinRoutes);
router.use("/", evaluationRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
