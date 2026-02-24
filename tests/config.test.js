const test = require("node:test");
const assert = require("node:assert/strict");

const { loadConfig } = require("../src/server");

test("loadConfig falls back to defaults when CONFIG_PATH is missing", () => {
  const originalConfigPath = process.env.CONFIG_PATH;
  process.env.CONFIG_PATH = "/tmp/does-not-exist-config.json";

  const config = loadConfig();
  assert.equal(config.DRY_RUN, true);
  assert.equal(config.GOOGLE_SHEETS_ID, "REPLACE_WITH_SHEET_ID");
  assert.equal(typeof config.MESSAGES.instant_reply, "string");

  if (originalConfigPath === undefined) {
    delete process.env.CONFIG_PATH;
  } else {
    process.env.CONFIG_PATH = originalConfigPath;
  }
});
