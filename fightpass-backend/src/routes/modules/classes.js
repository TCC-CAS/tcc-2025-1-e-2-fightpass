const express = require("express");
const { body } = require("express-validator");
const db = require("../../database/connection");
const { asyncHandler, created, success, validateRequest, auth, ApiError } = require("../../lib/http");
const {
  auditLog,
  ensureInstitutionAccess,
  ensureInstitutionModality
} = require("../../lib/business");

const router = express.Router();

function normalizeTime(value) {
  return value && value.length === 5 ? `${value}:00` : value;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const conditions = [];
    const params = [];

    if (req.query.institutionId) {
      conditions.push("c.institution_id = ?");
      params.push(req.query.institutionId);
    }

    if (req.query.modalityId) {
      conditions.push("c.modality_id = ?");
      params.push(req.query.modalityId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const data = await db.query(
      `SELECT c.id, c.institution_id, c.modality_id, c.title, c.description, c.capacity, c.status,
              i.name AS institution_name, m.name AS modality_name
       FROM classes c
       INNER JOIN institutions i ON i.id = c.institution_id
       INNER JOIN modalities m ON m.id = c.modality_id
       ${where}
       ORDER BY c.title`,
      params
    );

    if (data.length) {
      const classIds = data.map((item) => item.id);
      const schedules = await db.query(
        `SELECT id, class_id, day_of_week, start_time, end_time, room_name
         FROM class_schedules
         WHERE class_id IN (${classIds.map(() => "?").join(", ")})
         ORDER BY day_of_week, start_time`,
        classIds
      );

      data.forEach((item) => {
        item.schedules = schedules.filter((schedule) => schedule.class_id === item.id);
      });
    }

    return success(res, data, "Turmas carregadas com sucesso");
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rows = await db.query(
      `SELECT c.id, c.institution_id, c.modality_id, c.title, c.description, c.capacity, c.status
       FROM classes c
       WHERE c.id = ? LIMIT 1`,
      [req.params.id]
    );
    const classData = rows[0];
    if (!classData) {
      throw new ApiError(404, "Turma nao encontrada");
    }

    classData.schedules = await db.query(
      `SELECT id, day_of_week, start_time, end_time, room_name
       FROM class_schedules
       WHERE class_id = ?
       ORDER BY day_of_week, start_time`,
      [req.params.id]
    );
    return success(res, classData, "Turma carregada com sucesso");
  })
);

router.post(
  "/",
  auth(["institution_admin", "instructor"]),
  [
    body("institutionId").isInt({ min: 1 }).withMessage("Instituicao invalida"),
    body("modalityId").isInt({ min: 1 }).withMessage("Modalidade invalida"),
    body("title").trim().notEmpty().withMessage("Titulo obrigatorio"),
    body("dayOfWeek").isInt({ min: 0, max: 6 }).withMessage("Dia da semana invalido"),
    body("startTime").matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).withMessage("Horario inicial invalido"),
    body("endTime").matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).withMessage("Horario final invalido"),
    body("capacity").isInt({ min: 1 }).withMessage("Capacidade invalida")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await ensureInstitutionAccess(req.user.sub, req.body.institutionId);
    await ensureInstitutionModality(req.body.institutionId, req.body.modalityId);

    const startTime = normalizeTime(req.body.startTime);
    const endTime = normalizeTime(req.body.endTime);

    if (startTime >= endTime) {
      throw new ApiError(400, "Horario final deve ser posterior ao horario inicial");
    }

    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();
      const [classInsert] = await connection.execute(
        `INSERT INTO classes (institution_id, modality_id, title, description, capacity, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [
          req.body.institutionId,
          req.body.modalityId,
          req.body.title,
          req.body.description || null,
          req.body.capacity
        ]
      );

      await connection.execute(
        `INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room_name)
         VALUES (?, ?, ?, ?, ?)`,
        [
          classInsert.insertId,
          req.body.dayOfWeek,
          startTime,
          endTime,
          req.body.roomName || null
        ]
      );

      await auditLog(req.user.sub, "classes.create", "classes", classInsert.insertId, {
        institutionId: req.body.institutionId,
        modalityId: req.body.modalityId,
        dayOfWeek: req.body.dayOfWeek,
        startTime,
        endTime
      }, connection);

      await connection.commit();

      const rows = await db.query("SELECT id, title, capacity, status FROM classes WHERE id = ? LIMIT 1", [classInsert.insertId]);
      return created(res, rows[0], "Turma criada com sucesso");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

module.exports = router;
