const assert = require("assert");
const { normalizePhoneToE164, buildLeadPayload } = require("../src/validator");

assert.strictEqual(normalizePhoneToE164("0821234567"), "+27821234567");
assert.strictEqual(normalizePhoneToE164("+27821234567"), "+27821234567");

const lead = buildLeadPayload({ full_name: "Test", phone: "0821234567" });
assert.ok(lead.lead_id);
assert.strictEqual(lead.phone_e164, "+27821234567");

console.log("Basic tests passed.");
