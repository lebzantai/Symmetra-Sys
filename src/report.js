const fs = require("fs");
const path = require("path");

function renderTemplate(template, data) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    const safeValue = value == null ? "" : String(value);
    return acc.replaceAll(`{{${key}}}`, safeValue);
  }, template);
}

function buildRows(rows) {
  if (!rows.length) {
    return "<tr><td colspan=\"4\">No data</td></tr>";
  }

  return rows
    .map(
      (row) =>
        `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`
    )
    .join("");
}

function generateWeeklyReport(outputDir = "./artifacts") {
  const templatePath = path.join(__dirname, "templates", "report.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const html = renderTemplate(template, {
    week_start: "2024-01-01",
    week_end: "2024-01-07",
    total_leads: 32,
    booked_visits: 12,
    show_rate: 58,
    joined: 4,
    leads_by_source_rows: "<tr><td>FACEBOOK</td><td>20</td></tr><tr><td>WALK_IN</td><td>12</td></tr>",
    cold_leads_rows: buildRows([
      ["Sipho N", "+27821234567", "2024-01-05", "Needs pricing"],
      ["Thandi M", "+27829876543", "2024-01-04", "Asked about schedule"]
    ])
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const htmlPath = path.join(outputDir, "weekly-report.html");
  fs.writeFileSync(htmlPath, html);

  console.log(`HTML report generated at ${htmlPath}`);
  console.log("Convert to PDF using your preferred tool (Puppeteer) in production.");
}

if (require.main === module) {
  generateWeeklyReport();
}

module.exports = {
  generateWeeklyReport
};
