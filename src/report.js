const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function renderTemplate(template, data) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => data[key] ?? "");
}

async function generateWeeklyReport({ metrics, outputDir }) {
  const templatePath = path.join(__dirname, "templates", "report.html");
  const template = fs.readFileSync(templatePath, "utf8");
  const html = renderTemplate(template, metrics);
  const outputPath = path.join(outputDir, `weekly-report-${Date.now()}.pdf`);

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  await browser.close();

  return outputPath;
}

module.exports = {
  generateWeeklyReport
};
