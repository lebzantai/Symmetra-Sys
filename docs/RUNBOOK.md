# Symmetra Systems v1 – Front Desk Runbook

## Daily workflow
1. **Walk-in capture**
   - Use the Google Form or intake web form.
   - Submit the lead and confirm WhatsApp opt-in.
   - Lead is written to `LEADS` and receives the instant reply.

2. **Respond to inbound messages**
   - When a lead replies, the automation tags the response.
   - If lead asks for pricing or address, the automated reply is sent.
   - If lead requests a visit time, set `status=BOOKED` and `visit_datetime`.

3. **Booking a visit**
   - Use Google Calendar appointment schedule link.
   - If the lead can’t use the link, reply asking their preferred time.
   - Update `visit_datetime` and send the booking confirmation.

4. **No-shows**
   - If `visit_datetime` passes with no attendance, set `outcome=NO_SHOW`.
   - The system alerts Lebo + Front Desk.

5. **Cold lead review**
   - Weekly list of cold leads sent Monday morning.
   - If someone re-engages, update `stage=WARM` and follow-up.

## Exceptions & manual actions
- **Opt-out**: if lead replies STOP, mark as `do_not_contact=YES`, `status=CLOSED`.
- **Data errors**: fix phone number in `LEADS` (must be E.164) and re-send.
- **Duplicate leads**: keep most recent; set older entry `status=CLOSED`, `notes=duplicate`.

## Escalations
- **Hot leads** (price request + visit intent): alert Lebo immediately.
- **Booking request**: assign Front Desk to confirm within 10 minutes.

## Weekly report
- Review Monday 07:00 PDF summary.
- Confirm counts vs `DASHBOARD` for accuracy.
