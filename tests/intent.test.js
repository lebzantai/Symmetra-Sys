const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyFallbackIntent } = require("../src/intent");
const { applyInboundRules, resolveUpdatesForTag } = require("../src/rules");

test("classifyFallbackIntent is a no-op when TYPESAFE_ENABLED is falsy", async () => {
  const result = await classifyFallbackIntent("how much does it run me a month", {
    TYPESAFE_ENABLED: false
  });
  assert.equal(result, null);
});

test("classifyFallbackIntent is a no-op when no API key is configured", async () => {
  const previous = process.env.TYPESAFE_API_KEY;
  delete process.env.TYPESAFE_API_KEY;
  try {
    const result = await classifyFallbackIntent("how much does it run me a month", {
      TYPESAFE_ENABLED: true
    });
    assert.equal(result, null);
  } finally {
    if (previous !== undefined) process.env.TYPESAFE_API_KEY = previous;
  }
});

test("resolveUpdatesForTag mirrors booking_request updates from applyInboundRules", () => {
  const lead = { status: "CONTACTED" };
  const fromKeyword = applyInboundRules("can I book a tour", lead, { MESSAGES: {} });
  const fromAiTag = resolveUpdatesForTag("booking_request", lead);
  assert.deepEqual(fromAiTag, fromKeyword);
});

test("resolveUpdatesForTag leaves a non-NEW lead's updates empty for generic_reply", () => {
  const result = resolveUpdatesForTag("generic_reply", { status: "CONTACTED" });
  assert.deepEqual(result, { updates: {}, tag: "generic_reply" });
});
