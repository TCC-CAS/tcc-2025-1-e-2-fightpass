const express = require("express");
const { body } = require("express-validator");
const db = require("../../database/connection");
const { asyncHandler, success, created, validateRequest, auth, ApiError } = require("../../lib/http");

const router = express.Router();

async function ensureBookingAllowed(studentId, classScheduleId, bookingDate) {
  const duplicate = await db.query(
    `SELECT id
     FROM bookings
     WHERE student_id = ? AND class_schedule_id = ? AND booking_date = ? AND status IN ('scheduled', 'confirmed')
     LIMIT 1`,
    [studentId, classScheduleId, bookingDate]
  );

  if (duplicate[0]) {
    throw new ApiError(409, "Ja existe agendamento para este horario");
  }

  const capacityRows = await db.query(
    `SELECT c.capacity,
            (SELECT COUNT(*)
             FROM bookings b
             WHERE b.class_schedule_id = cs.id
               AND b.booking_date = ?
               AND b.status IN ('scheduled', 'confirmed')) AS booked_count
     FROM class_schedules cs
     INNER JOIN classes c ON c.id = cs.class_id
     WHERE cs.id = ? LIMIT 1`,
    [bookingDate, classScheduleId]
  );

  const capacityData = capacityRows[0];
  if (!capacityData) {
    throw new ApiError(404, "Horario de aula nao encontrado");
  }

  if (capacityData.booked_count >= capacityData.capacity) {
    throw new ApiError(409, "Nao ha vagas disponiveis para esta aula");
  }
}

router.get(
  "/",
  auth(["student"]),
  asyncHandler(async (req, res) => {
    const data = await db.query(
      `SELECT b.id, b.booking_date, b.status, b.is_trial, b.expires_at,
              cs.day_of_week, cs.start_time, cs.end_time,
              c.title AS class_title, m.name AS modality_name, i.name AS institution_name
       FROM bookings b
       INNER JOIN class_schedules cs ON cs.id = b.class_schedule_id
       INNER JOIN classes c ON c.id = cs.class_id
       INNER JOIN modalities m ON m.id = c.modality_id
       INNER JOIN institutions i ON i.id = c.institution_id
       WHERE b.student_id = ?
       ORDER BY b.booking_date, cs.start_time`,
      [req.user.sub]
    );

    return success(res, data, "Agendamentos carregados com sucesso");
  })
);

router.post(
  "/",
  auth(["student"]),
  [
    body("classScheduleId").isInt({ min: 1 }).withMessage("Horario de aula invalido"),
    body("bookingDate").isISO8601().withMessage("Data de agendamento invalida"),
    body("isTrial").optional().isBoolean().withMessage("Modo teste invalido")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await ensureBookingAllowed(req.user.sub, req.body.classScheduleId, req.body.bookingDate);
    const expiresAt = req.body.isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

    const result = await db.query(
      `INSERT INTO bookings (student_id, class_schedule_id, booking_date, status, is_trial, expires_at)
       VALUES (?, ?, ?, 'scheduled', ?, ?)`,
      [req.user.sub, req.body.classScheduleId, req.body.bookingDate, req.body.isTrial ? 1 : 0, expiresAt]
    );

    const rows = await db.query("SELECT id, booking_date, status, is_trial, expires_at FROM bookings WHERE id = ? LIMIT 1", [result.insertId]);
    return created(res, rows[0], "Agendamento criado com sucesso");
  })
);

router.post(
  "/recurring",
  auth(["student"]),
  [
    body("classScheduleId").isInt({ min: 1 }).withMessage("Horario de aula invalido"),
    body("startDate").isISO8601().withMessage("Data inicial invalida"),
    body("endDate").isISO8601().withMessage("Data final invalida"),
    body("isTrial").optional().isBoolean().withMessage("Modo teste invalido")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const start = new Date(`${req.body.startDate}T00:00:00Z`);
    const end = new Date(`${req.body.endDate}T00:00:00Z`);

    if (start > end) {
      throw new ApiError(400, "A data final deve ser posterior a data inicial");
    }

    const createdBookings = [];
    const current = new Date(start);

    while (current <= end) {
      const bookingDate = current.toISOString().slice(0, 10);
      await ensureBookingAllowed(req.user.sub, req.body.classScheduleId, bookingDate);
      const result = await db.query(
        `INSERT INTO bookings (student_id, class_schedule_id, booking_date, status, is_trial, expires_at)
         VALUES (?, ?, ?, 'scheduled', ?, ?)`,
        [
          req.user.sub,
          req.body.classScheduleId,
          bookingDate,
          req.body.isTrial ? 1 : 0,
          req.body.isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        ]
      );

      const rows = await db.query("SELECT id, booking_date, status, is_trial FROM bookings WHERE id = ? LIMIT 1", [result.insertId]);
      createdBookings.push(rows[0]);
      current.setUTCDate(current.getUTCDate() + 7);
    }

    return created(res, createdBookings, "Agendamentos recorrentes criados com sucesso");
  })
);

router.delete(
  "/:id",
  auth(["student"]),
  asyncHandler(async (req, res) => {
    const rows = await db.query("SELECT id, student_id FROM bookings WHERE id = ? LIMIT 1", [req.params.id]);
    const booking = rows[0];

    if (!booking || booking.student_id !== req.user.sub) {
      throw new ApiError(404, "Agendamento nao encontrado");
    }

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    return success(res, { id: Number(req.params.id) }, "Agendamento cancelado com sucesso");
  })
);

module.exports = router;
