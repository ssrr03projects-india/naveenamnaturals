require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");
const dbConfig = require("../src/config/db.config");

const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

function parseStatements(sqlContent) {
  return sqlContent
    .split(";")
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

function parseRenameColumnStatement(statement) {
  const match = statement.match(
    /^ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+RENAME\s+COLUMN\s+`?([A-Za-z0-9_]+)`?\s+TO\s+`?([A-Za-z0-9_]+)`?$/i,
  );

  if (!match) {
    return null;
  }

  return {
    tableName: match[1],
    oldColumnName: match[2],
    newColumnName: match[3],
  };
}

function escapeIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

async function getColumnDefinition(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return rows[0] || null;
}

function buildDefaultClause(defaultValue) {
  if (defaultValue === null || defaultValue === undefined) {
    return "";
  }

  if (
    typeof defaultValue === "string" &&
    /^current_timestamp(?:\(\))?$/i.test(defaultValue)
  ) {
    return ` DEFAULT ${defaultValue.toUpperCase()}`;
  }

  return ` DEFAULT ${mysql.escape(defaultValue)}`;
}

async function runRenameColumnMigration(connection, statement) {
  const parsed = parseRenameColumnStatement(statement);

  if (!parsed) {
    return null;
  }

  const { tableName, oldColumnName, newColumnName } = parsed;
  const existingColumn = await getColumnDefinition(
    connection,
    tableName,
    oldColumnName,
  );
  const targetColumn = await getColumnDefinition(connection, tableName, newColumnName);

  if (!existingColumn && targetColumn) {
    console.log(
      `  SKIPPED (${tableName}.${newColumnName} already exists; rename already applied)`,
    );
    return "skipped";
  }

  if (!existingColumn) {
    throw new Error(
      `Cannot rename ${tableName}.${oldColumnName}; source column not found`,
    );
  }

  const renameSql = [
    "ALTER TABLE",
    escapeIdentifier(tableName),
    "CHANGE COLUMN",
    escapeIdentifier(oldColumnName),
    escapeIdentifier(newColumnName),
    existingColumn.COLUMN_TYPE,
    existingColumn.IS_NULLABLE === "NO" ? "NOT NULL" : "NULL",
  ];

  const defaultClause = buildDefaultClause(existingColumn.COLUMN_DEFAULT);
  if (defaultClause) {
    renameSql.push(defaultClause.trim());
  }

  if (existingColumn.EXTRA) {
    renameSql.push(existingColumn.EXTRA);
  }

  await connection.query(renameSql.join(" "));
  console.log("  APPLIED (rename fallback)");
  return "applied";
}

function shouldSkipError(statement, error) {
  const normalized = statement.replace(/\s+/g, " ").trim().toUpperCase();

  if (error.errno === 1051) {
    return normalized.startsWith("DROP TABLE");
  }

  if (error.errno === 1091) {
    return (
      normalized.includes(" DROP COLUMN ") ||
      normalized.includes(" DROP INDEX ") ||
      normalized.includes(" DROP KEY ")
    );
  }

  if (error.errno === 1060) {
    return normalized.includes(" ADD COLUMN ");
  }

  if (error.errno === 1061) {
    return (
      normalized.includes(" ADD ") &&
      (normalized.includes(" INDEX ") || normalized.includes(" KEY "))
    );
  }

  return false;
}

async function runAllMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    console.log("No SQL migrations found.");
    return;
  }

  const connection = await mysqlPromise.createConnection({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    port: dbConfig.PORT,
  });

  let appliedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
      const sqlContent = fs.readFileSync(migrationPath, "utf8");
      const statements = parseStatements(sqlContent);

      console.log(
        `Running ${migrationFile} (${statements.length} statement${statements.length === 1 ? "" : "s"})`,
      );

      for (const statement of statements) {
        try {
          const renameStatus = await runRenameColumnMigration(connection, statement);

          if (renameStatus) {
            if (renameStatus === "applied") {
              appliedCount += 1;
            } else {
              skippedCount += 1;
            }
            continue;
          }

          await connection.query(statement);
          appliedCount += 1;
          console.log("  APPLIED");
        } catch (error) {
          if (shouldSkipError(statement, error)) {
            skippedCount += 1;
            console.log(`  SKIPPED (${error.errno}: ${error.message})`);
            continue;
          }

          failedCount += 1;
          console.log(
            `  FAILED (${error.errno || "unknown"}: ${error.message || error.stack})`,
          );
        }
      }
    }
  } finally {
    await connection.end();
  }

  console.log(
    `Summary: applied=${appliedCount} skipped=${skippedCount} failed=${failedCount}`,
  );

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllMigrations().catch((error) => {
  console.error("Migration runner failed:", error.message);
  process.exit(1);
});
