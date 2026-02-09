const express = require("express");
const { buildLeadPayload } = require("./validator");

const app = express();
app.use(express.json({ limit: "1mb" }));

const idempotencyKeys = new Set();

function isDuplicate(idempotencyKey) {
  if (!idempotencyKey) return false;
  if (idempotencyKeys.has(idempotencyKey)) return true;
  idempotencyKeys.add(idempotencyKey);
  return false;
}

app.post("/webhook/facebook", (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"] || req.body?.id;
  if (isDuplicate(idempotencyKey)) {
    return res.status(200).json({ status: "duplicate" });
  }

  const lead = buildLeadPayload({
    source: "FACEBOOK",
    full_name: req.body?.full_name,
    phone: req.body?.phone,
    notes: req.body?.ad_name || "Facebook lead"
  });

  // TODO: Push to Google Sheets and trigger WhatsApp message.
  // Use DRY_RUN to skip outbound messages.
  console.log("New Facebook lead", lead);

  return res.status(200).json({ status: "ok", lead_id: lead.lead_id });
});

app.post("/webhook/walkin", (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"] || req.body?.submission_id;
  if (isDuplicate(idempotencyKey)) {
    return res.status(200).json({ status: "duplicate" });
  }

  const lead = buildLeadPayload({
    source: "WALK_IN",
    full_name: req.body?.full_name,
    phone: req.body?.phone,
    notes: req.body?.notes || "Walk-in form"
  });

  console.log("New walk-in lead", lead);

  return res.status(200).json({ status: "ok", lead_id: lead.lead_id });
});

app.post("/webhook/whatsapp", (req, res) => {
  const message = req.body?.message || "";
  const from = req.body?.from || "";
  console.log("Inbound WhatsApp", { from, message });

  // TODO: Parse inbound message for STOP/booking/price/address keywords
  return res.status(200).json({ status: "ok" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Webhook server listening on ${port}`);
});
