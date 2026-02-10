# 1) SYSTEM OVERVIEW (one page)

## What the system does
This system gives the gym a simple operating layer that runs on tools the team already has: Google Sheets, Google Forms, Gmail, and WhatsApp Business.

It does five core jobs:
1. Captures every lead from walk-ins, WhatsApp, Instagram/Facebook inquiries (manual entry when needed).
2. Forces fast follow-up using a fixed cadence (Day 0, Day 1, Day 3, Day 7).
3. Tracks member onboarding, attendance, and payment status in one place.
4. Flags risk early (failed payments, no attendance, cold leads, dropping weekly numbers).
5. Sends daily and weekly owner alerts so issues are seen before they become revenue loss.

## What it does NOT do
- It is not a custom app.
- It does not replace staff judgment or sales calls.
- It does not promise fully automated WhatsApp messaging without official provider setup.
- It does not do advanced forecasting, BI dashboards, or complex integrations.
- It does not remove manual admin completely; it reduces missed actions.

## The minimum data needed
Only five tables are required:
- Leads
- Members
- Payments
- Attendance
- Staff actions

Each table should hold only the fields needed to trigger follow-ups, track outcomes, and produce alerts. If a field does not help a decision or follow-up, do not add it.

## The weekly operating rhythm
- **Daily 08:00 (owner):** Check alert digest (payment failures + uncontacted leads).
- **During business hours (front desk):** New lead response in under 2 minutes.
- **Daily 17:00 (front desk):** Close open tasks (follow-ups, no-shows, overdue payment reminders).
- **Monday 09:00 (owner + one staff member, 30 minutes):** Review weekly summary and decide actions.
- **Friday 16:00 (owner):** Quick review of unresolved at-risk members and unpaid accounts.

---

# 2) DATA MODEL (plain tables)

## Leads
| Field | Example | Purpose |
|---|---|---|
| lead_id | L-2026-00124 | Unique reference |
| created_at | 2026-02-10 09:14 | Time lead entered system |
| full_name | Sipho Dlamini | Personalization |
| phone_e164 | +27821234567 | WhatsApp/SMS contact |
| email | sipho@gmail.com | Email backup |
| source | Instagram DM | Channel tracking |
| interest | Weight loss | Context for reply |
| status | NEW | NEW / CONTACTED / BOOKED / CLOSED / CONVERTED |
| owner | FrontDesk1 | Person accountable |
| next_followup_at | 2026-02-10 09:16 | SLA timer |
| last_contact_at | 2026-02-10 09:15 | Audit trail |
| stop_reason | Joined elsewhere | Why follow-up ended |

## Members
| Field | Example | Purpose |
|---|---|---|
| member_id | M-00457 | Unique member reference |
| joined_at | 2026-02-01 | Start date |
| full_name | Nomsa Mokoena | Member identity |
| phone_e164 | +27761239876 | Primary contact |
| email | nomsa@gmail.com | Secondary contact |
| package_type | 12 months | Plan tracking |
| package_status | ACTIVE | ACTIVE / FROZEN / CANCELLED / SUSPENDED |
| monthly_fee | 499 | Revenue tracking |
| payment_day | 1 | Expected debit day |
| onboarding_stage | WEEK1 | NEW / WEEK1 / COMPLETE |
| risk_flag | NONE | NONE / RISK7 / RISK14 / PAYMENT_RISK |

## Payments
| Field | Example | Purpose |
|---|---|---|
| payment_id | P-2026-0201-457 | Unique payment record |
| member_id | M-00457 | Link to member |
| due_date | 2026-02-01 | Expected payment date |
| amount_due | 499 | Expected amount |
| amount_paid | 0 | Received amount |
| status | FAILED | PAID / FAILED / PARTIAL / PENDING |
| failure_reason | Insufficient funds | Collection context |
| reminder_stage | D3 | NONE / D1 / D3 / D7 |
| last_reminder_at | 2026-02-04 10:30 | Follow-up history |
| resolved_at | 2026-02-08 15:10 | Closure date |

## Attendance
| Field | Example | Purpose |
|---|---|---|
| attendance_id | A-2026-02-10-994 | Unique attendance entry |
| member_id | M-00457 | Link to member |
| date | 2026-02-10 | Attendance date |
| check_in_time | 17:42 | Visit time |
| session_type | Gym floor | Optional coaching context |
| source | Front desk check-in | Where record came from |

## Staff actions (follow-ups + outcomes)
| Field | Example | Purpose |
|---|---|---|
| action_id | SA-009991 | Unique action record |
| related_type | LEAD | LEAD / MEMBER / PAYMENT |
| related_id | L-2026-00124 | Record link |
| action_type | CALL | CALL / WHATSAPP / EMAIL / NOTE |
| action_reason | Day 3 lead follow-up | Why this action happened |
| assigned_to | FrontDesk1 | Owner of task |
| due_at | 2026-02-13 11:00 | Deadline |
| completed_at | 2026-02-13 10:48 | Completion tracking |
| outcome | BOOKED_TOUR | Result code |
| notes | Asked to come Saturday 10:00 | Human context |

---

# 3) WORKFLOWS (step-by-step)

## A. Lead capture → follow-up sequence

### Trigger
- New lead from:
  - WhatsApp inquiry,
  - Instagram/Facebook DM (manual copy into form/sheet),
  - walk-in form at front desk.

### Actions
1. Create new row in **Leads** with `status=NEW` and `next_followup_at=now`.
2. Send immediate reply template (WhatsApp first, email second if WhatsApp unavailable).
3. Assign owner (front desk on duty).
4. Start follow-up cadence tasks:
   - Day 0 (immediate)
   - Day 1
   - Day 3
   - Day 7
5. Offer two booking paths in every message:
   - “Reply with preferred time to come in”, or
   - booking link for tour.
6. If booking confirmed, set `status=BOOKED` and create calendar entry.

### Exceptions
- Invalid phone format: send email if available; create correction task.
- Duplicate lead (same phone in last 30 days): append note, do not restart full sequence.
- Outside business hours: auto-acknowledge instantly, assign first human response at opening time.

### Stop rules
Stop follow-up when any one condition is true:
- Lead books and attends.
- Lead asks to stop.
- Lead converts to member.
- No response after Day 7 follow-up and final close message.
- Staff marks as not qualified (reason required in `stop_reason`).

---

## B. New member onboarding

### Trigger
- Lead converted and payment/contract captured.

### Actions
1. Add row in **Members** (`package_status=ACTIVE`, `onboarding_stage=NEW`).
2. Send welcome message with:
   - greeting,
   - gym rules,
   - opening times,
   - support contact.
3. Create first-week check-in task for Day 3 or Day 4.
4. Monitor first 14 days attendance:
   - If no attendance by Day 4: send gentle check-in.
   - If fewer than 2 visits by Day 14: mark `risk_flag=RISK7` and create call task.
5. Set `onboarding_stage=COMPLETE` after Day 14 check.

### Exceptions
- Member joins but asks to start later: onboarding timer starts on first access date, not contract date.
- Missing attendance feed: front desk must do daily manual check-in upload before close.

### Stop rules
- Onboarding workflow stops when `onboarding_stage=COMPLETE` or member becomes `CANCELLED`/`FROZEN`.

---

## C. Payment monitoring

### Trigger
- Daily check finds any payment with `due_date < today` and `status != PAID`.

### Actions
1. Mark as overdue and create payment task.
2. Send reminder sequence:
   - **Day 1:** friendly reminder.
   - **Day 3:** firm reminder + payment options.
   - **Day 7:** final notice + next step.
3. Log each reminder in **Staff actions** and update `reminder_stage`.
4. If paid, set `status=PAID`, `resolved_at=timestamp`, close tasks.

### Exceptions
- Bank-side known issue: pause escalation for 48 hours and note reason.
- Partial payment: set `status=PARTIAL`, send adjusted balance message.
- Approved grace period: owner can defer next reminder date manually.

### Stop rules
- Stop reminders once paid in full.
- Stop and move to manual handling if member disputes amount.
- Optional suspension: if unpaid at Day 7 and policy is enabled, set `package_status=SUSPENDED`.

---

## D. Churn prevention

### Trigger
- Member has no attendance for 7 days or 14 days.

### Actions
1. Daily attendance check assigns flags:
   - 7 days no visit → `risk_flag=RISK7`
   - 14 days no visit → `risk_flag=RISK14`
2. Create staff task:
   - First attempt: call.
   - If no answer: send short voice note or WhatsApp message.
3. Use a simple offer menu:
   - Freeze for short period,
   - move to lower plan,
   - restart support plan (trainer check-in).
4. Record outcome in **Staff actions** and member notes.

### Exceptions
- Known travel/medical reason already logged: no repeated reminders for agreed period.
- Member opted out of messaging: only call/email per consent.

### Stop rules
- Member attends again (clear risk flag).
- Member confirms cancellation (set `package_status=CANCELLED`).
- Retention option accepted and new status applied.

---

## E. Early-warning engine (weekly + daily)

### Daily trigger (08:00)
- Run checks on:
  - Payment failures due in last 7 days.
  - Leads created in last 24 hours with no first contact.

### Daily actions
1. Count overdue payment records and new-uncontacted leads.
2. Send owner alert via:
   - primary: WhatsApp manual template + copy summary,
   - backup: automated email.
3. Create high-priority tasks for unresolved items.

### Weekly trigger (Monday 07:00)
- Compare last 7 days to rolling 4-week average.

### Weekly actions
Calculate and alert on:
- Revenue trend
- Lead trend
- Conversion rate (lead-to-member)
- Attendance rate
- Churn signals (7-day/14-day risk counts)
- Payment failures

Threshold defaults:
- Revenue drop alert: **20%** vs 4-week average
- Leads drop: **25%**
- Conversion drop: **25%**
- Attendance drop: **15%**
- Payment failures: **>5/week** or **+30%** vs baseline

Output:
- One summary email with metrics, red flags, and required actions.
- One WhatsApp-ready summary block for owner posting in management chat.

### Exceptions
- Missing data for a week: send warning “data incomplete” and list missing tables.
- Public holiday week: allow owner to mark week as “exception period” to avoid false panic.

### Stop rules
- Daily alert closes when all flagged items assigned and acknowledged.
- Weekly alert closes after owner marks actions for each red flag.

---

# 4) ALERTS & MESSAGES (copy/paste templates)

## New lead reply (immediate)
"Hello {{first_name}}, thank you for contacting {{gym_name}}. We can help you get started. You can either reply with the best time to visit, or use this booking link: {{booking_link}}. We are open {{hours}}."

## Follow-up Day 1
"Hello {{first_name}}, just checking in from {{gym_name}}. Would you like to come in for a quick tour this week? Reply with a preferred day/time and we will confirm it for you."

## Follow-up Day 3
"Hello {{first_name}}, we still have space for new members this week. If you want to visit, reply with your preferred time or book here: {{booking_link}}."

## Follow-up Day 7
"Hello {{first_name}}, this is our final follow-up for now. If you still want to visit {{gym_name}}, reply anytime and we will assist you."

## Booking confirmation
"Hi {{first_name}}, your visit is confirmed for {{visit_date}} at {{visit_time}} at {{gym_name}} ({{address}}). Please arrive 10 minutes early. Reply if you need to reschedule."

## Missed appointment
"Hi {{first_name}}, we missed you today. Would you like us to rebook your visit? Reply with a day/time that works for you."

## Welcome new member
"Welcome to {{gym_name}}, {{first_name}}. Your membership is now active on the {{package_type}} plan. Gym rules: {{rules_link_or_short_rules}}. If you need help, reply here and our team will assist you."

## Payment reminder 1 (Day 1)
"Hello {{first_name}}, this is a reminder that your membership payment of R{{amount_due}} due on {{due_date}} is still outstanding. Please complete payment today or reply if you need assistance."

## Payment reminder 2 (Day 3)
"Hello {{first_name}}, your payment of R{{amount_due}} is still unpaid. Please settle it as soon as possible to keep your membership active. If there is a problem, reply so we can help."

## Payment reminder 3 (Day 7)
"Hello {{first_name}}, final reminder: your membership payment of R{{amount_due}} remains unpaid. Please make payment immediately or contact us today to avoid service interruption."

## “We haven’t seen you” (7-day)
"Hello {{first_name}}, we have not seen you at the gym this week and wanted to check in. Would you like help planning your next session?"

## “We haven’t seen you” (14-day)
"Hello {{first_name}}, we have not seen you in 14 days. We want to help you stay on track. We can offer a short freeze or plan adjustment if needed. Reply and we will assist."

## Weekly summary message to owner
"Weekly gym health summary ({{week_range}}):
- Revenue: {{revenue}} (vs 4-week avg: {{revenue_delta_pct}})
- New leads: {{leads}} (delta: {{leads_delta_pct}})
- Lead-to-member conversion: {{conversion_pct}} (delta: {{conversion_delta_pct}})
- Attendance rate: {{attendance_rate}} (delta: {{attendance_delta_pct}})
- Payment failures: {{payment_failures}} (delta vs baseline: {{payment_failure_delta_pct}})
- At-risk members: 7-day={{risk7_count}}, 14-day={{risk14_count}}
Alerts triggered: {{alerts_list}}
Actions required today: {{action_list}}"

---

# 5) TOOL STACK (simple + realistic)

## Option 1 (lowest cost)
**Stack:** Google Sheets + Google Forms + Gmail + WhatsApp Business (manual sends using templates) + Make.com or Zapier (light automation).

**Why this works**
- Uses tools the gym already has.
- Fast setup with minimal training.
- Low monthly cost and low failure points.
- Manual WhatsApp keeps compliance safe without unofficial automation.

**Rough cost range (monthly)**
- Google tools: often already included (R0 to low existing workspace cost).
- Make/Zapier starter tier: roughly R200–R900 depending on volume.
- Optional SMS backup: pay-per-message.

**Setup complexity**
- Low.
- 1–3 days to go live with clear SOPs.

## Option 2 (more automated)
**Stack:** Airtable (or simple CRM like HubSpot Free) + Make.com + Gmail + official WhatsApp provider (e.g., Twilio/360dialog) if approved.

**Why this works**
- Better data structure and task views.
- Easier owner reporting and filters.
- More automated messaging once official WhatsApp is active.

**Rough cost range (monthly)**
- Airtable/CRM: free to mid tier depending records/users.
- Make.com: R200–R1,500 based on operations.
- Official WhatsApp provider: setup + message charges (varies by provider and volume).

**Setup complexity**
- Medium.
- 1–3 weeks depending on WhatsApp provider approval and template setup.

**Safe fallback if official WhatsApp is not ready**
- Automate email + SMS reminders.
- Generate daily WhatsApp task list for staff to send manually from WhatsApp Business templates.

---

# 6) IMPLEMENTATION PLAN (30/60/90)

## Day 1–7: MVP setup and manual processes
1. Create Sheets workbook with the 5 tables.
2. Create lead intake Google Form for walk-ins/manual DM capture.
3. Add message templates to a shared document.
4. Set up daily owner email digest (uncontacted leads + failed payments).
5. Train front desk on 2-minute response rule and follow-up cadence.
6. Start manual WhatsApp sends using copy/paste templates.
7. Run first weekly summary manually from sheet totals.

## Day 8–30: automate weekly summary + key alerts
1. Add Make/Zapier flows:
   - new lead acknowledgment,
   - follow-up task creation,
   - daily digest email,
   - Monday summary email.
2. Add conditional formatting in Sheets for overdue items.
3. Introduce action log discipline (every follow-up must be logged).
4. Confirm owner receives alerts reliably at fixed times.

## Day 31–60: add payment monitoring + churn prevention
1. Integrate payment status import (manual CSV or simple export).
2. Enable payment reminder Day 1/3/7 tasks and messages.
3. Enable 7-day and 14-day attendance risk flags.
4. Add staff call/voice note task flow for at-risk members.
5. Track retention outcomes (freeze, plan change, returned attendance).

## Day 61–90: tighten reliability, logs, access control, client-ready packaging
1. Lock sheet ranges and protect formulas.
2. Add owner/admin-only edit permissions for thresholds.
3. Create backup process (weekly export to Drive folder).
4. Add “data completeness” checks (missing phone, missing status, etc.).
5. Finalize standard operating pack:
   - SOP docs,
   - template library,
   - onboarding video for new staff,
   - weekly review agenda.

---

# 7) OPERATING CHECKLISTS

## Daily checklist for front desk
1. Check new leads every 15 minutes during business hours.
2. Send first response to each new lead within 2 minutes.
3. Update lead status after each interaction.
4. Confirm today’s bookings and send reminders.
5. Mark no-shows and send missed appointment message.
6. Log all follow-ups in Staff actions.
7. Before close: clear overdue Day 1/3/7 follow-up tasks.

## Daily checklist for owner
1. Review morning alert digest.
2. Check count of:
   - uncontacted leads,
   - failed/overdue payments,
   - at-risk members.
3. Reassign overdue tasks older than 24 hours.
4. Approve exceptions (grace periods, pause rules) where needed.

## Weekly checklist for system review
1. Read weekly summary every Monday.
2. Compare KPIs to thresholds.
3. Confirm each alert has an owner and due date.
4. Review top 10 cold leads and at-risk members.
5. Check conversion from booked visits to joined members.
6. Decide one adjustment for next week (script, staffing, timing).

## Monthly checklist for thresholds and cleanup
1. Review if thresholds are too sensitive or too loose.
2. Archive closed leads/members where appropriate.
3. Remove duplicates and fill missing critical fields.
4. Validate automation runs and error logs.
5. Refresh template wording and staff training notes.
6. Confirm access permissions and remove old staff access.
