const crypto = require("crypto");
const express = require("express");
const { body } = require("express-validator");
const db = require("../../database/connection");
const env = require("../../config/env");
const { asyncHandler, success, created, validateRequest, auth, ApiError } = require("../../lib/http");

const router = express.Router();

router.post(
  "/token",
  auth(["student"]),
  asyncHandler(async (req, res) => {
    const rows = await db.query(
      `SELECT id, booking_date
       FROM bookings
       WHERE student_id = ? AND status IN ('scheduled', 'confirmed')
       ORDER BY booking_date ASC
       LIMIT 1`,
      [req.user.sub]
    );

    const booking = rows[0];
    if (!booking) {
      throw new ApiError(404, "Nao existe agendamento valido para gerar check-in");
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + env.checkinTokenTtlSeconds * 1000);

    await db.query(
      `INSERT INTO attendance_qr_tokens (student_id, booking_id, token, expires_at, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [req.user.sub, booking.id, token, expiresAt]
    );

    return created(res, { token, bookingId: booking.id, expiresAt }, "Token de check-in criado com sucesso");
  })
);

router.post(
  "/confirm",
  [body("token").notEmpty().withMessage("Token obrigatorio")],
  validateRequest,
  asyncHandler(async (req, res) => {
    const rows = await db.query(
      `SELECT id, student_id, booking_id, expires_at, status
       FROM attendance_qr_tokens
       WHERE token = ? LIMIT 1`,
      [req.body.token]
    );

    const tokenData = rows[0];
    if (!tokenData || tokenData.status !== "active") {
      throw new ApiError(400, "Token de check-in invalido");
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      throw new ApiError(400, "Token de check-in expirado");
    }

    const attendanceResult = await db.query(
      `INSERT INTO attendances (booking_id, student_id, checked_in_at, status)
       VALUES (?, ?, NOW(), 'present')`,
      [tokenData.booking_id, tokenData.student_id]
    );

    await db.query("UPDATE attendance_qr_tokens SET status = 'used' WHERE id = ?", [tokenData.id]);

    return success(res, { attendanceId: attendanceResult.insertId }, "Check-in confirmado com sucesso");
  })
);

router.get(
  "/history",
  auth(["student"]),
  asyncHandler(async (req, res) => {
    const data = await db.query(
      `SELECT id, booking_id, checked_in_at, status
       FROM attendances
       WHERE student_id = ?
       ORDER BY checked_in_at DESC`,
      [req.user.sub]
    );

    return success(res, data, "Historico de presencas carregado com sucesso");
  })
);

module.exports = router;
