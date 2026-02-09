# CONFIG – Symmetra Systems v1

This guide describes credentials, setup steps, and testing for **Better Bodies Gym Lead-to-Visit Automation**.

## 1) Credentials & Accounts

**Required**
- Google Workspace (Sheets + Gmail)
- WhatsApp Business channel:
  - Option A: Meta WhatsApp Cloud API
  - Option B: Twilio WhatsApp
- n8n (self-hosted) **or** Make.com

**Optional**
- Google Calendar (Appointment schedule)
- SMTP (if not using Gmail OAuth)

## 2) Google Sheets

Create a spreadsheet with three sheets:
- `LEADS`
- `DASHBOARD`
- `LOOKUPS`

Use the headers in `/scripts/sheet-init.js` and the template instructions in this repo’s docs.

## 3) WhatsApp Provider

### A) Meta WhatsApp Cloud API
1. Create an app in Meta for Developers.
2. Add WhatsApp product.
3. Generate a permanent access token.
4. Register a WhatsApp Business phone number.
5. Add webhook URL from n8n or Make scenario (see automation configs).

### B) Twilio WhatsApp
1. Create a Twilio account.
2. Enable WhatsApp Sandbox or approved business number.
3. Obtain `Account SID`, `Auth Token`, and WhatsApp-enabled number.
4. Configure webhook to send inbound messages to `/webhook/whatsapp`.

## 4) n8n Setup (Path A)

1. Import workflows in `/automation/n8n/`.
2. Set environment variables in n8n:
   - `GOOGLE_SHEETS_ID`
   - `WHATSAPP_PROVIDER` (CLOUD_API or TWILIO)
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_NUMBER`
   - `BOOKING_LINK`
   - `DRY_RUN` (true/false)
3. Connect Google Sheets and Gmail nodes.
4. Test with a sample lead via the webhook.

## 5) Make.com Setup (Path B)

1. Recreate the scenario steps documented in `/automation/make/` (if preferred).
2. Use Google Sheets, HTTP, Gmail modules.
3. Use the same environment variables above as scenario variables.

## 6) Webhook Receiver (Node.js)

Use `/src/server.js` for webhook compatibility and validation.

```bash
npm install
npm start
```

**Endpoints**
- `POST /webhook/facebook`
- `POST /webhook/walkin`
- `POST /webhook/whatsapp`

## 7) Testing & DRY_RUN

- Set `DRY_RUN=true` to prevent live WhatsApp messages.
- Use the CLI:

```bash
node src/cli.js create-test-lead
node src/cli.js simulate-reply "price" "0821234567"
```

## 8) Weekly Report

Run the report generator:

```bash
node src/report.js
```

For production, configure Puppeteer or a hosted HTML→PDF service and schedule a weekly run.
