# Symmetra Systems v1 – Configuration & Setup

## Overview
This document walks through configuring Google Sheets, WhatsApp, and the automation service. All values are editable and stored in `src/config/config.json`.

## Credentials needed
- Google Cloud project + service account JSON (Sheets API enabled)
- Google Sheet ID (for LEADS, LOOKUPS, DASHBOARD, LOG tabs)
- WhatsApp provider credentials
  - **Twilio**: Account SID, Auth Token, WhatsApp-enabled number
  - **Meta Cloud API**: Phone Number ID, Permanent Access Token
- Gmail/SMTP sender for weekly reports

## Step-by-step setup
1. **Create Google Sheet**
   - Create a new Google Sheet named `Better Bodies Gym Leads`.
   - Create tabs: `LEADS`, `LOOKUPS`, `DASHBOARD`, `LOG`.
   - Run the initializer script:
     ```bash
     GOOGLE_SHEETS_ID=your_sheet_id node scripts/init_sheet.js
     ```

2. **Set up Google service account**
   - In Google Cloud, enable **Google Sheets API**.
   - Create a service account and download JSON credentials.
   - Share the Google Sheet with the service account email.
   - Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json`.

3. **Configure WhatsApp provider**
   - Open `src/config/config.json` and set:
     - `WHATSAPP_PROVIDER` to `twilio` or `cloud`
     - Twilio credentials or Meta Cloud API credentials
   - Leave `DRY_RUN=true` during testing to avoid sending real messages.

4. **Webhook endpoints**
   - Lead intake: `POST /webhooks/lead`
   - Inbound replies: `POST /webhooks/inbound`
   - Health check: `GET /health`
   - If using Facebook Lead Ads, connect your webhook to `/webhooks/lead` and map fields.

5. **Facebook lead intake (preferred)**
   - Create Facebook Lead Ads form.
   - Register webhook in Meta Developers.
   - Map `full_name`, `phone`, `source=FACEBOOK`.
   - For unknown tokens, use the stub endpoint and add the integration later.

6. **Reporting**
   - Weekly report runs Monday 07:00.
   - Use `scripts/cli.js weekly-report` to generate a PDF locally.
   - Use Gmail or SMTP in the n8n workflow to email the report.

7. **Testing**
   - Start server: `npm start`
   - Create test lead: `npm run cli -- test-lead`
   - Simulate inbound message: `npm run cli -- simulate-inbound`

## Config file notes
- `HOURS` controls quiet hours and sending schedule.
- `CADENCE` controls follow-up timing. Edit `offsetDays` and times to match your SLA.
- `MESSAGES` holds WhatsApp templates and is POPIA-friendly.
- `DRY_RUN=true` prevents real WhatsApp messages.
