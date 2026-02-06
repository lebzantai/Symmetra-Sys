const { google } = require("googleapis");

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function appendLeadRow(spreadsheetId, values) {
  const sheets = await getSheetsClient();
  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "LEADS!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] }
  });
}

async function updateLeadRow(spreadsheetId, range, values) {
  const sheets = await getSheetsClient();
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] }
  });
}

async function appendLogRow(spreadsheetId, values) {
  const sheets = await getSheetsClient();
  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "LOG!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] }
  });
}

module.exports = {
  appendLeadRow,
  updateLeadRow,
  appendLogRow
};
