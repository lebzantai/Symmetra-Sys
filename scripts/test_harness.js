const { normalizePhoneE164 } = require("../src/utils");
const { applyInboundRules } = require("../src/rules");

const sample = {
  phone: "0821234567",
  message: "price"
};

console.log("Normalized phone:", normalizePhoneE164(sample.phone));
console.log("Rule output:", applyInboundRules(sample.message, { status: "CONTACTED" }, { MESSAGES: {} }));
