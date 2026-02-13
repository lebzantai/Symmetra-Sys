const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { appendLeadRow } = require("../src/sheets");

const runtimeDir = path.join(process.cwd(), "automation", "runtime");
const leadsLogPath = path.join(runtimeDir, "leads.jsonl");

test("appendLeadRow writes fallback record in dry-run mode", async () => {
  if (fs.existsSync(leadsLogPath)) {
    fs.unlinkSync(leadsLogPath);
  }

  const response = await appendLeadRow("REPLACE_WITH_SHEET_ID", ["lead-1", "Alice"], {
    dryRun: true,
    allowFallbackOnError: true
  });

  assert.equal(response.status, "fallback_written");
  assert.equal(fs.existsSync(leadsLogPath), true);

  const contents = fs.readFileSync(leadsLogPath, "utf8").trim();
  assert.notEqual(contents.length, 0);
  const line = JSON.parse(contents.split("\n").at(-1));
  assert.deepEqual(line.values, ["lead-1", "Alice"]);
});
