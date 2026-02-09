const { normalizePhoneToE164 } = require("../src/validator");

console.log("Phone normalize 0821234567 ->", normalizePhoneToE164("0821234567"));
console.log("Phone normalize +27821234567 ->", normalizePhoneToE164("+27821234567"));
