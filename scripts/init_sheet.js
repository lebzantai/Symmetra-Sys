const { google } = require("googleapis");

const HEADERS = [
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

async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error("Set GOOGLE_SHEETS_ID env var");
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "LEADS!A1:S1",
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "LOG!A1:D1",
    valueInputOption: "RAW",
    requestBody: { values: [["timestamp", "event_type", "lead_id", "payload_hash"]] }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "LOOKUPS!A1:C1",
    valueInputOption: "RAW",
    requestBody: { values: [["key", "label", "value"]] }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "DASHBOARD!A1:B1",
    valueInputOption: "RAW",
    requestBody: { values: [["metric", "value"]] }
  });

  console.log("Sheet initialized");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
