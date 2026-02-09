const fs = require("fs");
const path = require("path");
const { buildLeadPayload, normalizePhoneToE164 } = require("./validator");

const DRY_RUN = process.env.DRY_RUN === "true";

function createTestLead() {
  const lead = buildLeadPayload({
    source: "FACEBOOK",
    full_name: "Test Lead",
    phone: "0821234567",
    notes: "CLI test lead"
  });

  const outDir = path.join(__dirname, "..", "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `lead-${lead.lead_id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(lead, null, 2));

  console.log("Lead created", lead);
  console.log(`Saved to ${outPath}`);
  if (DRY_RUN) {
    console.log("DRY_RUN enabled: no outbound messages sent.");
  }
}

function simulateInboundReply(message, phone) {
  const normalized = normalizePhoneToE164(phone);
  console.log("Inbound reply", { from: normalized, message });
}

const command = process.argv[2];

switch (command) {
  case "create-test-lead":
    createTestLead();
    break;
  case "simulate-reply": {
    const message = process.argv[3] || "price";
    const phone = process.argv[4] || "0821234567";
    simulateInboundReply(message, phone);
    break;
  }
  default:
    console.log("Usage: node src/cli.js <create-test-lead|simulate-reply>");
    process.exit(1);
}
