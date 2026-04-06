const crypto = require("crypto");
const express = require("express");
const { body } = require("express-validator");
const db = require("../../database/connection");
const {
  ApiError,
  asyncHandler,
  success,
  created,
  validateRequest,
  signToken,
  auth,
  hashPassword,
  comparePassword
} = require("../../lib/http");

const router = express.Router();

async function findUserByEmail(email) {
  const rows = await db.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.document, u.phone, u.is_active, r.code AS role, r.id AS role_id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await db.query(
    `SELECT u.id, u.name, u.email, u.document, u.phone, u.is_active, r.code AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Nome obrigatorio"),
    body("email").isEmail().withMessage("Email invalido").normalizeEmail(),
    body("password")
      .isLength({ min: 8 }).withMessage("A senha deve ter no minimo 8 caracteres")
      .matches(/[A-Z]/).withMessage("A senha deve conter letra maiuscula")
      .matches(/[a-z]/).withMessage("A senha deve conter letra minuscula")
      .matches(/[0-9]/).withMessage("A senha deve conter numero"),
    body("document").trim().isLength({ min: 11 }).withMessage("Documento invalido"),
    body("accountType").isIn(["student", "instructor", "institution_admin"]).withMessage("Tipo de conta invalido"),
    body("institutionName").optional().trim().isLength({ min: 3 }).withMessage("Nome da instituicao invalido")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const existing = await findUserByEmail(req.body.email);
    if (existing) {
      throw new ApiError(409, "Ja existe um usuario com este email");
    }

    const roles = await db.query("SELECT id, code FROM roles WHERE code = ? LIMIT 1", [req.body.accountType]);
    const role = roles[0];
    if (!role) {
      throw new ApiError(400, "Perfil de usuario invalido");
    }

    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();
      const passwordHash = await hashPassword(req.body.password);
      const [insertUser] = await connection.execute(
        `INSERT INTO users (role_id, name, email, password_hash, document, phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [role.id, req.body.name, req.body.email, passwordHash, req.body.document, req.body.phone || null]
      );

      let institutionId = null;

      if (req.body.accountType === "institution_admin") {
        const [insertInstitution] = await connection.execute(
          `INSERT INTO institutions (owner_user_id, name, legal_document, email, phone, description, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          [
            insertUser.insertId,
            req.body.institutionName || req.body.name,
            req.body.document,
            req.body.email,
            req.body.phone || null,
            req.body.description || null
          ]
        );

        institutionId = insertInstitution.insertId;

        await connection.execute(
          `INSERT INTO institution_user (institution_id, user_id, membership_role, status)
           VALUES (?, ?, 'institution_admin', 'active')`,
          [institutionId, insertUser.insertId]
        );
      }

      await connection.commit();

      const user = await findUserById(insertUser.insertId);
      const token = signToken(user);
      return created(res, { user, token, institutionId }, "Conta criada com sucesso");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email invalido").normalizeEmail(),
    body("password").notEmpty().withMessage("Senha obrigatoria")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = await findUserByEmail(req.body.email);
    if (!user || !user.is_active) {
      throw new ApiError(401, "Credenciais invalidas");
    }

    const matches = await comparePassword(req.body.password, user.password_hash);
    if (!matches) {
      throw new ApiError(401, "Credenciais invalidas");
    }

    const token = signToken(user);
    return success(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        document: user.document,
        phone: user.phone
      }
    }, "Login realizado com sucesso");
  })
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Email invalido").normalizeEmail()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = await findUserByEmail(req.body.email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await db.query(
        `INSERT INTO password_reset_tokens (email, token, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
        [req.body.email, token, expiresAt]
      );
    }

    return success(
      res,
      { nextStep: "Verificar o email cadastrado em etapa futura com envio real." },
      "Se o email estiver cadastrado, as instrucoes de recuperacao serao disponibilizadas."
    );
  })
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token obrigatorio"),
    body("password")
      .isLength({ min: 8 }).withMessage("A senha deve ter no minimo 8 caracteres")
      .matches(/[A-Z]/).withMessage("A senha deve conter letra maiuscula")
      .matches(/[a-z]/).withMessage("A senha deve conter letra minuscula")
      .matches(/[0-9]/).withMessage("A senha deve conter numero")
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const rows = await db.query("SELECT email, expires_at FROM password_reset_tokens WHERE token = ? LIMIT 1", [req.body.token]);
    const resetToken = rows[0];

    if (!resetToken) {
      throw new ApiError(400, "Token de redefinicao invalido");
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      throw new ApiError(400, "Token de redefinicao expirado");
    }

    const passwordHash = await hashPassword(req.body.password);
    await db.query("UPDATE users SET password_hash = ? WHERE email = ?", [passwordHash, resetToken.email]);
    await db.query("DELETE FROM password_reset_tokens WHERE email = ?", [resetToken.email]);

    return success(res, null, "Senha redefinida com sucesso");
  })
);

router.get(
  "/me",
  auth(),
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.sub);
    if (!user) {
      throw new ApiError(404, "Usuario nao encontrado");
    }
    return success(res, user, "Perfil autenticado carregado com sucesso");
  })
);

router.post("/logout", auth(), asyncHandler(async (req, res) => success(res, null, "Logout realizado com sucesso")));

module.exports = router;
