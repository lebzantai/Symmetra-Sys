# RUNBOOK – Front Desk Workflow

## Daily Use (Front Desk)

1. **Capture Walk-ins**
   - Use the Walk-in form (Google Form) and submit for every walk-in.
   - Confirmation WhatsApp message is sent instantly.

2. **Handle Inbound Messages**
   - Reply to leads within 2 minutes.
   - If a lead asks for **price**, send the pricing template.
   - If a lead asks for **address**, send the location template.

3. **Booking a Visit**
   - If a lead chooses a time, set **status = BOOKED** and **visit_datetime**.
   - Send booking confirmation and a reminder 2 hours before.

4. **No-show Handling**
   - If visit time passes with no arrival, mark **outcome = NO_SHOW** and notify Lebo.

## Exception Handling

- **Opt-out requests**: If lead replies STOP/UNSUBSCRIBE, mark:
  - `do_not_contact = YES`
  - `status = CLOSED`
  - `outcome = NOT_INTERESTED`
  - Send opt-out confirmation.

- **Duplicate lead**: Keep the newest row and merge notes if needed.

- **After hours**: Messages are queued and sent at 08:00 next open time.

## Escalation

Alert Lebo + Front Desk if:
- New Facebook lead created
- Any inbound reply
- Booking requested
- No-show detected

## Weekly KPI Report

- Generated Monday at 07:00 and emailed to Lebo.
- Dashboard in Google Sheets stays updated daily.
