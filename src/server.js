const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { normalizePhoneE164, hashPayload } = require("./utils");
const { appendLeadRow, appendLogRow } = require("./sheets");
const { sendWhatsAppMessage } = require("./whatsapp");
const { applyInboundRules } = require("./rules");

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  const authenticatedUserId = req.get("x-user-id");
  req.user = authenticatedUserId ? { id: authenticatedUserId } : null;
  next();
});

const configPath = path.join(__dirname, "config", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const idempotencyCache = new Set();

function buildLeadRow(lead) {
  return [
    lead.lead_id,
    lead.created_at,
    lead.source,
    lead.full_name,
    lead.phone_e164,
    lead.whatsapp_opt_in,
    lead.status,
    lead.stage,
    lead.last_contact_at,
    lead.next_action_at,
    lead.assigned_to,
    lead.preferred_time,
    lead.notes,
    lead.package_interest,
    lead.visit_datetime,
    lead.outcome,
    lead.last_message_id,
    lead.do_not_contact,
    lead.consent_timestamp
  ];
}

async function logEvent(event) {
  const row = [new Date().toISOString(), event.type, event.lead_id, event.payload_hash];
  await appendLogRow(config.GOOGLE_SHEETS_ID, row, { dryRun: config.DRY_RUN, allowFallbackOnError: true });
}

function ensureUserAccess(req, res, next) {
  const userId = req.params.userId || req.body.userId;

  if (!req.user || userId !== req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

app.get("/users/:userId/access-check", ensureUserAccess, (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.post("/webhooks/lead", async (req, res) => {
  try {
    const payload = req.body;
    const payloadHash = hashPayload(payload);

    if (idempotencyCache.has(payloadHash)) {
      return res.status(200).json({ status: "duplicate" });
    }
    idempotencyCache.add(payloadHash);

    const lead = {
      lead_id: uuidv4(),
      created_at: new Date().toISOString(),
      source: payload.source || "UNKNOWN",
      full_name: payload.full_name || "",
      phone_e164: normalizePhoneE164(payload.phone),
      whatsapp_opt_in: payload.whatsapp_opt_in || "YES",
      status: "NEW",
      stage: "HOT",
      last_contact_at: "",
      next_action_at: "",
      assigned_to: payload.assigned_to || "FRONT_DESK",
      preferred_time: payload.preferred_time || "",
      notes: payload.notes || "",
      package_interest: payload.package_interest || "UNKNOWN",
      visit_datetime: "",
      outcome: "",
      last_message_id: "",
      do_not_contact: "NO",
      consent_timestamp: payload.consent_timestamp || new Date().toISOString()
    };

    await appendLeadRow(config.GOOGLE_SHEETS_ID, buildLeadRow(lead), { dryRun: config.DRY_RUN, allowFallbackOnError: true });
    await logEvent({ type: "lead_created", lead_id: lead.lead_id, payload_hash: payloadHash });

    if (lead.whatsapp_opt_in === "YES") {
      const message = config.MESSAGES.instant_reply.replace("{{name}}", lead.full_name || "there");
      const response = await sendWhatsAppMessage({
        config,
        to: lead.phone_e164,
        text: message
      });
      await logEvent({ type: "whatsapp_sent", lead_id: lead.lead_id, payload_hash: hashPayload(response) });
    }

    return res.status(200).json({ status: "ok", lead_id: lead.lead_id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/webhooks/inbound", async (req, res) => {
  try {
    const { lead_id, message } = req.body;
    const result = applyInboundRules(message, { status: "CONTACTED" }, config);
    await logEvent({ type: "inbound_message", lead_id, payload_hash: hashPayload(req.body) });

    if (result.tag === "price_request") {
      await sendWhatsAppMessage({
        config,
        to: req.body.phone,
        text: config.MESSAGES.price_list
      });
    }

    if (result.tag === "location_request") {
      await sendWhatsAppMessage({
        config,
        to: req.body.phone,
        text: config.MESSAGES.location
      });
    }

    if (result.tag === "optout") {
      await sendWhatsAppMessage({
        config,
        to: req.body.phone,
        text: config.MESSAGES.opt_out_confirm
      });
    }

    return res.status(200).json({ status: "ok", updates: result.updates, tag: result.tag });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/", (_req, res) => {
  res.status(200).json({
    service: "symmetra-sys-automation",
    status: "ok",
    endpoints: ["/health", "/webhooks/lead", "/webhooks/inbound", "/users/:userId/access-check"]
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Symmetra Systems automation listening on ${port}`);
  });
}

module.exports = { app, ensureUserAccess };
