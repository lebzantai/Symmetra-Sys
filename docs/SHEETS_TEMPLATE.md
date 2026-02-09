# Google Sheets Template

## Sheet 1: LEADS (headers in row 1)

- lead_id
- created_at
- source (WALK_IN, FACEBOOK)
- full_name
- phone_e164
- whatsapp_opt_in (YES/NO)
- status (NEW/CONTACTED/BOOKED/CLOSED)
- stage (HOT/WARM/COLD)
- last_contact_at
- next_action_at
- assigned_to (LEBO/FRONT_DESK)
- preferred_time
- notes
- package_interest (12M/6M/36M/M2M/UNKNOWN)
- visit_datetime
- outcome (JOINED/NO_SHOW/NOT_INTERESTED/NO_RESPONSE)
- last_message_id
- do_not_contact (YES/NO)
- consent_timestamp

## Sheet 2: DASHBOARD

Recommended fields (use formulas/pivots):
- Total Leads (last 7 days)
- Leads by Source
- % Contacted within 2 minutes
- Booked Visits
- Show Rate
- Joined
- Cold Leads count

## Sheet 3: LOOKUPS

Include values used for data validation:
- status list
- stage list
- sources list
- outcome list
- membership packages
- business hours
