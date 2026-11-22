import fs from "fs";
import path from "path";

const dir = path.resolve("supabase/migrations");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

let combined = "-- =============================================================================\n";
combined += "-- CivicPulse Consolidated Database Schema & Migrations\n";
combined += "-- =============================================================================\n\n";

for (const f of files) {
  combined += `-- -----------------------------------------------------------------------------\n`;
  combined += `-- MIGRATION: ${f}\n`;
  combined += `-- -----------------------------------------------------------------------------\n\n`;
  combined += fs.readFileSync(path.join(dir, f), "utf8") + "\n\n";
}

const outPath = path.resolve("supabase/all_migrations.sql");
fs.writeFileSync(outPath, combined, "utf8");
console.log(`Successfully merged ${files.length} migrations into ${outPath}`);
