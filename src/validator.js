const { v4: uuidv4 } = require("uuid");

function normalizePhoneToE164(input, defaultCountryCode = "+27") {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  if (digits.startsWith("27")) {
    return `+${digits}`;
  }

  return `${defaultCountryCode}${digits}`;
}

function buildLeadPayload(payload) {
  const now = new Date().toISOString();
  return {
    lead_id: payload.lead_id || uuidv4(),
    created_at: payload.created_at || now,
    source: payload.source || "FACEBOOK",
    full_name: payload.full_name || "Unknown",
    phone_e164: normalizePhoneToE164(payload.phone_e164 || payload.phone),
    whatsapp_opt_in: payload.whatsapp_opt_in || "YES",
    status: payload.status || "NEW",
    stage: payload.stage || "HOT",
    last_contact_at: payload.last_contact_at || "",
    next_action_at: payload.next_action_at || "",
    assigned_to: payload.assigned_to || "LEBO",
    preferred_time: payload.preferred_time || "",
    notes: payload.notes || "",
    package_interest: payload.package_interest || "UNKNOWN",
    visit_datetime: payload.visit_datetime || "",
    outcome: payload.outcome || "",
    last_message_id: payload.last_message_id || "",
    do_not_contact: payload.do_not_contact || "NO",
    consent_timestamp: payload.consent_timestamp || now
  };
}

module.exports = {
  normalizePhoneToE164,
  buildLeadPayload
};
