require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dbConfig = require("../src/config/db.config");

async function runSingleAddressMigration() {
    console.log("🚀 Starting Single-Address Migration...");

    const connection = await mysql.createConnection({
        host: dbConfig.HOST,
        user: dbConfig.USER,
        password: dbConfig.PASSWORD,
        database: dbConfig.DB,
        multipleStatements: true
    });

    try {
        const migrationPath = path.join(__dirname, "../migrations/003_single_address.sql");
        const sqlContent = fs.readFileSync(migrationPath, "utf8");

        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`📂 Found ${statements.length} SQL statements`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`\n🔹 Executing statement ${i + 1}...`);

            try {
                await connection.query(statement);
                console.log("   ✅ Success");
            } catch (error) {
                if (error.errno === 1091) {
                    console.log("   ⚠️  Skipped (Column doesn't exist)");
                } else if (error.errno === 1051) {
                    console.log("   ⚠️  Skipped (Table doesn't exist)");
                } else {
                    console.error("   ❌ Failed:", error.message);
                }
            }
        }

        console.log("\n✅ Single-address migration complete!");
    } catch (error) {
        console.error("\n❌ Migration error:", error);
    } finally {
        await connection.end();
        process.exit();
    }
}

runSingleAddressMigration();
