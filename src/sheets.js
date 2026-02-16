const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const fallbackDir = path.join(process.cwd(), "automation", "runtime");

function writeFallbackRecord(kind, payload) {
  fs.mkdirSync(fallbackDir, { recursive: true });
  const filePath = path.join(fallbackDir, `${kind}.jsonl`);
  fs.appendFileSync(filePath, `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`);
}

function shouldUseFallback({ spreadsheetId, options }) {
  return (
    options?.dryRun ||
    !spreadsheetId ||
    spreadsheetId === "REPLACE_WITH_SHEET_ID"
  );
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function appendLeadRow(spreadsheetId, values, options = {}) {
  if (shouldUseFallback({ spreadsheetId, options })) {
    writeFallbackRecord("leads", { values });
    return { status: "fallback_written" };
  }

  try {
    const sheets = await getSheetsClient();
    return sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "LEADS!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] }
    });
  } catch (error) {
    if (!options.allowFallbackOnError) {
      throw error;
    }
    writeFallbackRecord("leads", { values, reason: error.message });
    return { status: "fallback_written" };
  }
}

async function updateLeadRow(spreadsheetId, range, values, options = {}) {
  if (shouldUseFallback({ spreadsheetId, options })) {
    writeFallbackRecord("lead_updates", { range, values });
    return { status: "fallback_written" };
  }

  try {
    const sheets = await getSheetsClient();
    return sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] }
    });
  } catch (error) {
    if (!options.allowFallbackOnError) {
      throw error;
    }
    writeFallbackRecord("lead_updates", { range, values, reason: error.message });
    return { status: "fallback_written" };
  }
}

async function appendLogRow(spreadsheetId, values, options = {}) {
  if (shouldUseFallback({ spreadsheetId, options })) {
    writeFallbackRecord("logs", { values });
    return { status: "fallback_written" };
  }

  try {
    const sheets = await getSheetsClient();
    return sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "LOG!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] }
    });
  } catch (error) {
    if (!options.allowFallbackOnError) {
      throw error;
    }
    writeFallbackRecord("logs", { values, reason: error.message });
    return { status: "fallback_written" };
  }
}

module.exports = {
  appendLeadRow,
  updateLeadRow,
  appendLogRow
};
