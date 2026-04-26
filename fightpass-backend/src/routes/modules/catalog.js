const express = require("express");
const db = require("../../database/connection");
const { asyncHandler, success, ApiError, auth } = require("../../lib/http");
const { ensureInstitutionAccess } = require("../../lib/business");

const router = express.Router();

router.get(
  "/modalities",
  asyncHandler(async (req, res) => {
    const data = await db.query("SELECT id, name, slug, description FROM modalities ORDER BY name");
    return success(res, data, "Modalidades carregadas com sucesso");
  })
);

router.get(
  "/map/search",
  asyncHandler(async (req, res) => {
    const conditions = [];
    const params = [];

    if (req.query.modality) {
      conditions.push("m.slug = ?");
      params.push(req.query.modality);
    }

    if (req.query.search) {
      conditions.push("i.name LIKE ?");
      params.push(`%${req.query.search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const data = await db.query(
      `SELECT DISTINCT i.id, i.name, i.description, i.phone, i.email, i.status,
              a.city, a.state, a.neighborhood, a.latitude, a.longitude
       FROM institutions i
       LEFT JOIN addresses a ON a.institution_id = i.id
       LEFT JOIN institution_modality im ON im.institution_id = i.id
       LEFT JOIN modalities m ON m.id = im.modality_id
       ${where}
       ORDER BY i.name`,
      params
    );

    return success(res, data, "Instituicoes carregadas com sucesso");
  })
);

router.get(
  "/institutions",
  asyncHandler(async (req, res) => {
    const data = await db.query(
      `SELECT i.id, i.name, i.description, i.phone, i.email, i.status, a.city, a.state
       FROM institutions i
       LEFT JOIN addresses a ON a.institution_id = i.id
       ORDER BY i.name`
    );
    return success(res, data, "Instituicoes carregadas com sucesso");
  })
);

router.get(
  "/institutions/:id",
  asyncHandler(async (req, res) => {
    const rows = await db.query(
      `SELECT i.id, i.name, i.description, i.phone, i.email, i.status,
              a.street, a.number, a.neighborhood, a.city, a.state, a.zip_code, a.latitude, a.longitude
       FROM institutions i
       LEFT JOIN addresses a ON a.institution_id = i.id
       WHERE i.id = ? LIMIT 1`,
      [req.params.id]
    );

    const institution = rows[0];
    if (!institution) {
      throw new ApiError(404, "Instituicao nao encontrada");
    }

    institution.modalities = await db.query(
      `SELECT m.id, m.name, m.slug
       FROM institution_modality im
       INNER JOIN modalities m ON m.id = im.modality_id
       WHERE im.institution_id = ?
       ORDER BY m.name`,
      [req.params.id]
    );

    institution.classes = await db.query(
      `SELECT c.id, c.modality_id, c.title, c.description, c.capacity, c.status,
              m.name AS modality_name,
              cs.id AS schedule_id, cs.day_of_week, cs.start_time, cs.end_time, cs.room_name
       FROM classes c
       INNER JOIN modalities m ON m.id = c.modality_id
       LEFT JOIN class_schedules cs ON cs.class_id = c.id
       WHERE c.institution_id = ? AND c.status = 'active'
       ORDER BY c.title, cs.day_of_week, cs.start_time`,
      [req.params.id]
    );

    return success(res, institution, "Instituicao carregada com sucesso");
  })
);

router.get(
  "/institutions/:id/students",
  auth(["institution_admin", "instructor"]),
  asyncHandler(async (req, res) => {
    await ensureInstitutionAccess(req.user.sub, req.params.id);
    const data = await db.query(
      `SELECT u.id, u.name, u.email, e.status AS enrollment_status, m.id AS modality_id, m.name AS modality_name
       FROM enrollments e
       INNER JOIN users u ON u.id = e.student_id
       INNER JOIN modalities m ON m.id = e.modality_id
       WHERE e.institution_id = ?
       ORDER BY u.name`,
      [req.params.id]
    );

    return success(res, data, "Alunos da instituicao carregados com sucesso");
  })
);

module.exports = router;
