# Make.com Scenario Steps (Path B)

## Scenario 1 – Lead Intake
1. Webhooks > Custom webhook (lead-intake)
2. Tools > JSON parse/validator
3. Google Sheets > Add a row (LEADS)
4. HTTP > Send WhatsApp (Meta/Twilio)
5. Email > Send alert to Lebo + Front Desk

## Scenario 2 – Follow-up Cadence
1. Scheduler (every 30 minutes)
2. Google Sheets > Search rows (LEADS)
3. Filter rows where `status=CONTACTED` and `next_action_at <= now`
4. HTTP > Send WhatsApp
5. Google Sheets > Update row (last_contact_at, next_action_at)

## Scenario 3 – Weekly Report
1. Scheduler (Monday 07:00)
2. Google Sheets > Get range (LEADS)
3. HTML template + PDF (Make PDF module)
4. Gmail/SMTP > Send email with PDF attachment
