const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const env = require("../src/config/env");

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "database", "migrations", "001_initial_schema.sql"),
    "utf8"
  );

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true
  });

  await connection.query(sql);
  await connection.end();
  console.log("Migration executada com sucesso.");
}

main().catch((error) => {
  console.error("Erro ao executar migration:", error.message);
  process.exit(1);
});
