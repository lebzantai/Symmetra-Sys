const fs = require("fs");
const path = require("path");

const headers = [
  "lead_id",
  "created_at",
  "source",
  "full_name",
  "phone_e164",
  "whatsapp_opt_in",
  "status",
  "stage",
  "last_contact_at",
  "next_action_at",
  "assigned_to",
  "preferred_time",
  "notes",
  "package_interest",
  "visit_datetime",
  "outcome",
  "last_message_id",
  "do_not_contact",
  "consent_timestamp"
];

function generateCsvTemplate() {
  const outDir = path.join(__dirname, "..", "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "leads-template.csv");
  fs.writeFileSync(outPath, `${headers.join(",")}\n`);
  console.log(`CSV template created at ${outPath}`);
}

if (require.main === module) {
  generateCsvTemplate();
}

module.exports = { generateCsvTemplate };
