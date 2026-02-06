const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhoneE164 } = require("../src/utils");
const { applyInboundRules } = require("../src/rules");

const config = { MESSAGES: {} };

test("normalizePhoneE164 handles local numbers", () => {
  assert.equal(normalizePhoneE164("0821234567"), "+27821234567");
  assert.equal(normalizePhoneE164("27821234567"), "+27821234567");
});

test("applyInboundRules detects opt-out", () => {
  const result = applyInboundRules("STOP", { status: "CONTACTED" }, config);
  assert.equal(result.tag, "optout");
  assert.equal(result.updates.status, "CLOSED");
});
