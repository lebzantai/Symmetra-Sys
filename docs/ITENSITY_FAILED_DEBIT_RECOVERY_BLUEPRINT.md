# ITensity Failed Debit Recovery System Blueprint

## 1. Problem Diagnosis

### Why failed debit orders cause revenue leakage in gyms
- **Service continues while payment fails:** If access control (turnstile/door check-in) is not linked to collections status in near real time, members keep training despite arrears.
- **Collections timing decay:** Recovery likelihood drops quickly after failure date; each day without contact lowers recoverability and increases eventual churn.
- **Operational inconsistency:** Different staff members use different follow-up styles, channels, and timing, creating uneven outcomes.
- **No closed-loop process:** If ITensity records failure but no automation creates tasks/escalations, failures remain unresolved in “report-only” mode.

### Typical operational weak points

#### Staff workflow weak points
- No clear owner per failed transaction.
- Follow-up tasks are ad hoc and undocumented.
- Front-desk promises ("I’ll sort it") are not tracked in a system.
- Recovery actions are not timestamped, so accountability is weak.

#### ITensity reporting weak points
- Reliance on end-of-day exports instead of event-level alerts.
- Failure reason codes are not normalized (e.g., insufficient funds vs account closed).
- Branch-level reports exist, but staff-level performance segmentation is missing.
- No direct SLA monitoring (0–1h, 24h, 48h, 72h action windows).

#### Member engagement weak points
- Generic reminders with no payment links or clear next action.
- Wrong-channel outreach (email only, no WhatsApp/SMS fallback).
- Escalation language either too soft (ignored) or too aggressive (disputes/churn).
- No automated “payment confirmed” closure message.

### Cash-flow impact of inconsistent follow-up (practical benchmark)
- Typical recovery probability by first-contact timing (industry-operational benchmark):
  - Contact <1 hour: **65–80%** eventual recovery.
  - Contact at 24 hours: **45–60%**.
  - Contact at 72+ hours: **20–35%**.
- For every 100 failed debits, delaying first contact from <1 hour to 72 hours can reduce recovery by **30–40 accounts equivalent**.
- The result is **double leakage**: immediate lost cash + downstream churn from disengaged debtors.

---

## 2. System Architecture

### End-to-end architecture (single branch, scalable to multi-branch)

```text
[Payment Gateway/Bank]
   |  (debit success/fail event, reason code)
   v
[ITensity Core]
   |-- webhook/event push OR scheduled export (CSV/API pull)
   v
[Automation Layer (Clawdbot / n8n / Make / custom worker)]
   |-- Rule Engine (timers, retries, exceptions)
   |-- Message Orchestrator (WhatsApp/SMS/Email)
   |-- Task Engine (assign staff, SLA countdown)
   |-- Access Control Connector (suspend/reinstate)
   |-- Audit Log Store (every action + actor)
   v
[Comms Providers] --------> [Member]
   |                           ^
   |                           |
   +--> WhatsApp API           | payment proof / reply / dispute
   +--> SMS gateway            |
   +--> Email service          |
                               |
[Staff Channels] <-------------+
   | Slack/Telegram/internal dashboard alerts + tasks
   v
[Ops Dashboard + BI Layer]
   |-- Daily collections dashboard
   |-- Staff KPI dashboard
   |-- Branch comparison dashboard
   v
[Management / Finance]
```

### Data flows by process

#### Detection
1. Gateway posts failed debit event (member_id, amount, timestamp, reason_code, mandate_ref).
2. ITensity stores event and updates account ledger.
3. Automation layer ingests event (webhook preferred; otherwise polling/export every 15 min).
4. Rule engine classifies event (hard fail vs soft fail vs bank outage).

#### Messaging
1. Message orchestrator picks best channel priority: WhatsApp → SMS → email.
2. Sends personalized payment recovery link + due amount.
3. Captures delivery/read/reply statuses.
4. Updates ITensity note/activity + internal audit log.

#### Escalation
1. No payment after 24h: create assigned staff task with SLA.
2. No payment after 48h: escalation alert to collections lead/manager.
3. No payment after 72h: trigger conditional suspension workflow.

#### Reporting
1. Dashboard refresh every 15–60 min.
2. Branch/staff metrics aggregated daily.
3. Executive daily digest sent at fixed local time (e.g., 07:00).

### Required integration components
- **Triggers:** Webhooks from payment provider/ITensity or schedule-based event polling.
- **APIs:** ITensity member/account API (if available), messaging APIs, access-control API.
- **Exports:** Fallback CSV export job for failed debits + open balances.
- **Dashboards:** Google Looker Studio / Power BI / Metabase over central collections dataset.

---

## 3. Automation Logic

### Real-time failed payment detection
- Trigger when transaction status in ITensity = `FAILED`.
- Mandatory payload fields: `member_id`, `branch_id`, `amount_due`, `failed_at`, `reason_code`, `contact_channels`.
- Dedup key: `member_id + debit_cycle_date + amount` to prevent duplicate workflows.

### Time-based follow-up sequence

#### T+0–1 hour (Immediate alert)
- Auto-send initial message with one-click payment link.
- Create task owner = assigned collections staff (or front desk if no collector).
- Mark case status = `OPEN_STAGE_1`.

#### T+24 hours
- If unpaid, send reminder with urgency + assistance option.
- Notify assigned staff in Slack/Telegram with “Action required in next 24h”.
- Case status = `OPEN_STAGE_2`.

#### T+48 hours
- If unpaid, escalate to manager queue.
- Trigger outbound call task + mandatory outcome code entry.
- Case status = `ESCALATED_STAGE_3`.

#### T+72 hours (final action)
- If unpaid and no approved exception: mark `SUSPEND_PENDING`.
- Auto-suspend check-in privileges; send suspension notice with reinstatement steps.
- Case status = `SUSPENDED_STAGE_4`.

### Suspension and reinstatement rules
- Suspend only if all true:
  1. Failed debit unresolved for >=72h.
  2. No active dispute ticket.
  3. No approved payment plan.
  4. No bank outage flag.
- Reinstate automatically when payment confirmed (webhook success) or staff applies approved override.
- Every suspension/reinstatement writes audit log: who/what/when/why.

### Exception handling
- **Disputes:** Freeze escalation clock for 48h, route to finance queue.
- **Partial payment:** Keep access active if partial >= threshold (e.g., 50%) and auto-create payment plan.
- **Bank/provider outage:** Suppress member warnings, send “system issue” notice, retry after outage clear.
- **Duplicate fail event:** Ignore based on dedup key.

### Retry logic for failed debit attempts
- Soft fail (insufficient funds): retry at T+24h and T+72h.
- Hard fail (account closed, mandate cancelled): no auto-retry; immediate member update + mandate refresh flow.
- Retry caps: max 2 retries per cycle.
- Stop retries if payment received via alternate method.

### Pseudo-code example

```pseudo
on payment_event(event):
  if event.status != "FAILED": return
  case_id = upsert_case(event.member_id, event.cycle_date, event.amount)
  if is_duplicate(event, case_id): return

  classify = classify_reason(event.reason_code)
  if classify == "BANK_OUTAGE": mark_hold(case_id); notify_internal(); return

  send_message(case_id, template="initial_fail")
  schedule(case_id, +24h, step_24h)
  schedule(case_id, +48h, step_48h)
  schedule(case_id, +72h, step_72h)

step_72h(case_id):
  if paid(case_id) or dispute_open(case_id) or approved_plan(case_id): return
  suspend_access(member(case_id))
  send_message(case_id, template="final_suspension")
  close_or_monitor(case_id)
```

---

## 4. Messaging Sequences & Scripts

### Tone guide
- **Professional:** clear facts and account details.
- **Firm:** explicit deadlines and consequences.
- **Polite:** respectful language and support option.
- **Urgent:** time-bound call to action.

### A) Initial failed payment notification (T+0–1h)

#### WhatsApp
> Hi {{first_name}}, we were unable to process your gym membership debit of **R{{amount}}** on {{date}}.
> 
> Please settle securely here now: {{payment_link}}
> 
> If already paid, reply with POP and we’ll update your account immediately.
> 
> – {{gym_name}} Accounts Team

#### SMS
> {{gym_name}}: Debit of R{{amount}} failed on {{date}}. Pay now: {{short_link}}. Need help? Reply HELP.

#### Email (Subject)
> Action Required: Membership Payment Failed (R{{amount}})

#### Email (Body)
> Dear {{first_name}},
> 
> Your scheduled membership debit of **R{{amount}}** on {{date}} was unsuccessful.
> 
> Please make payment here: {{payment_link}}
> 
> To avoid service interruption, please settle within 72 hours.
> 
> If you’ve already paid, reply with proof of payment.
> 
> Regards,
> {{gym_name}} Accounts Team

### B) 24-hour reminder

#### WhatsApp
> Reminder: Your outstanding membership amount is **R{{amount}}**. Please pay by {{deadline}} to avoid account escalation.
> 
> Pay now: {{payment_link}}

#### SMS
> Reminder from {{gym_name}}: R{{amount}} outstanding. Pay before {{deadline}}: {{short_link}}

#### Email Subject
> Reminder: Outstanding Membership Balance (R{{amount}})

### C) 48-hour escalation

#### WhatsApp
> Urgent: Your account is now in escalation due to unpaid balance of **R{{amount}}**.
> Please settle today to prevent access suspension.
> {{payment_link}}

#### SMS
> Urgent {{gym_name}} notice: Account escalated. R{{amount}} due today to avoid suspension. {{short_link}}

#### Email Subject
> Final Reminder Before Suspension – R{{amount}} Due

### D) 72-hour final warning / suspension notice

#### WhatsApp
> Final Notice: Your gym access has been **temporarily suspended** due to unpaid membership fees (R{{amount}}).
> 
> Immediate reinstatement upon payment: {{payment_link}}
> 
> For assistance, reply SUPPORT.

#### SMS
> {{gym_name}}: Access suspended due to unpaid R{{amount}}. Reinstate now: {{short_link}}

#### Email Subject
> Access Suspended – Immediate Reinstatement Available

### Staff notifications (Slack/Telegram/internal)

#### New failed debit alert
> :warning: Failed Debit Detected
> Member: {{name}} ({{member_id}})
> Amount: R{{amount}}
> Branch: {{branch}}
> Stage: 1 (0–1h)
> Owner: {{staff_owner}}
> SLA: Contact by {{deadline}}
> Case: {{case_link}}

#### Escalation alert (48h)
> :rotating_light: Escalation Required (48h)
> Member: {{name}} | Outstanding: R{{amount}}
> No successful payment after 2 attempts.
> Required action: call member + log outcome within 2h.

---

## 5. Staff Accountability Layer

### Tracking model
- Each case must capture:
  - `case_id`, `member_id`, `branch_id`, `owner_staff_id`
  - timestamps for each outreach attempt
  - channel used + delivery status
  - staff action notes + outcome code
  - escalation events and manager interventions
- Enforce mandatory disposition codes:
  - `PAID`, `PROMISE_TO_PAY`, `DISPUTE`, `UNREACHABLE`, `REFUSED`, `SUSPENDED`

### KPI definitions
- **Response Time SLA:** median minutes from fail event to first outreach.
- **Recovery Rate per Staff:** recovered amount / assigned failed amount.
- **Escalation Handling Rate:** escalations closed within SLA / total escalations.
- **Contact Effectiveness:** payments within 24h after staff contact.
- **Data Hygiene Score:** % cases with complete logs and valid outcome codes.

### Daily staff summary format
- Staff | Assigned Cases | Contacted <1h | Recovered Today | Open >48h | SLA Breaches
- Highlight red flags: >3 overdue cases or <40% contact SLA.

### Weekly performance review format
- Leaderboard: recovery % by staff and by branch.
- Trend: week-over-week response time improvement.
- Coaching list: staff below threshold for 2 consecutive weeks.

---

## 6. Reporting Framework

### Executive daily dashboard (must-have widgets)
1. Failed debit count (today / MTD).
2. Outstanding revenue (today / MTD).
3. Recovery rate (same-day and rolling 7-day).
4. Overdue accounts by aging bucket (0–24h, 24–48h, 48–72h, >72h).
5. Suspended members count + reinstated count today.

### Weekly reporting
- Branch comparison table:
  - failed debits, recovered revenue, recovery %, median response time, suspensions.
- Cohort chart: recovery by “day since fail”.
- Reason-code heatmap: insufficient funds vs technical vs mandate issues.

### Monthly reporting
- Net recovered revenue vs prior month.
- Automation impact: % cases closed without manual intervention.
- Churn correlation: suspended >7 days vs cancellation likelihood.
- Forecast: expected recoveries from open pipeline.

### Visualization suggestions
- **Line chart:** daily failed amount vs recovered amount.
- **Stacked bar:** aging bucket distribution.
- **Funnel:** failed → contacted → promised → paid → reinstated.
- **Color-coded alerts:**
  - Green: recovery >=70%
  - Amber: 50–69%
  - Red: <50%

---

## 7. Implementation Plan

### Tier 1: Low-tech/manual system (1–2 weeks)

#### Step-by-step
1. Pull ITensity failed debit report every morning + midday.
2. Assign each failed case to named staff owner in a shared tracker.
3. Use scripted WhatsApp/SMS templates manually.
4. Log action timestamps and outcomes in tracker.
5. Run daily 16:00 escalation meeting for unresolved >48h cases.
6. Suspend manually at 72h based on approved SOP checklist.

#### Manual escalation SOP
- Stage 1: message + call attempt.
- Stage 2: manager call + payment arrangement offer.
- Stage 3: suspension approval from duty manager.
- Reinstatement within 15 min of payment confirmation.

### Tier 2: Semi-automated system (2–4 weeks)
- Scheduled ITensity export (every 15/30 min) into automation tool.
- Auto-create staff alerts/tasks in Slack/Telegram.
- Auto-send Stage 1 and Stage 2 messages; staff executes calls/escalations.
- Dashboard auto-refresh daily.

### Tier 3: Fully automated (Clawdbot or equivalent) (4–8 weeks)
- Real-time webhook ingestion of payment failures.
- Fully automated message journey (0h/24h/48h/72h).
- Rule-based suspension + auto-reinstatement.
- Auto-updated KPI and executive dashboards.
- Multi-branch tenant model with branch-level RBAC and benchmarking.

### Technical requirements checklist
- ITensity API credentials (read/write members, billing status, notes).
- Payment gateway webhook setup + signature validation secret.
- WhatsApp API (Meta/Twilio), SMS gateway key, SMTP or email API key.
- Access-control integration endpoint (suspend/reinstate member).
- Central data store (PostgreSQL/BigQuery/Sheets for MVP).
- Workflow engine (Clawdbot/n8n/Make/Zapier/custom Node service).
- BI tool credentials and scheduled refresh configuration.

### Implementation timeline (example)
- Week 1: process mapping, templates, SOPs, tracker.
- Week 2: exports, alerts, dashboard v1.
- Week 3–4: automated messaging + audit logs.
- Week 5–6: suspension/reinstatement integration.
- Week 7–8: multi-branch rollout, QA, tuning.

### Packaging and selling this model (if you want commercialization)
- Build it as a **“Collections Ops-in-a-Box”** offer:
  1. Productized audit (2 days)
  2. Setup sprint (2–4 weeks)
  3. Managed optimization retainer (monthly)
- Recommended packaging tools:
  - **Notion/Confluence:** playbooks + SOP portal.
  - **Loom:** demo walkthroughs for prospects.
  - **HubSpot/Pipedrive:** pipeline and sales automation.
  - **Stripe + PandaDoc:** recurring invoicing and e-sign proposals.
  - **Looker Studio share links:** proof-of-value dashboards.

---

## 8. Risk Controls

### Prevent false suspensions
- Two-condition gate: unpaid + no exception flag.
- 15-minute pre-suspension verification job.
- Manager override queue before final suspension for VIP/high-risk disputes.

### Handle disputes safely
- One-click dispute flag pauses automation.
- Mandatory evidence capture: POP, bank statement snippet, call notes.
- Finance SLA: resolve disputes within 1 business day.

### Protect sensitive data
- Encrypt PII at rest and in transit.
- Least-privilege API keys by function (messaging vs billing vs admin).
- Log access and administrative actions.

### Prevent duplicate messaging
- Idempotent message keys per stage and case.
- Cooldown windows (e.g., no repeated message within 6 hours unless status changes).
- Channel fallback rules only after delivery failure.

### Checks and balances in automated decisions
- Rule versioning and change approvals.
- Daily anomaly scan (suspensions spike, message failure spikes).
- Human review sample (5–10% cases weekly) for quality control.

---

## 9. Revenue Impact Model

### Base assumptions
- Members: **300**
- Failed debit rate: **5–10%**
- Average monthly fee: **R600**

### Monthly failed debit value
- 5% fail rate: 15 members × R600 = **R9,000** at risk/month
- 10% fail rate: 30 members × R600 = **R18,000** at risk/month

### Recovered revenue scenarios

| Recovery Rate | 5% Fail (R9,000) | 10% Fail (R18,000) |
|---|---:|---:|
| 50% | R4,500 | R9,000 |
| 70% | R6,300 | R12,600 |
| 90% | R8,100 | R16,200 |

### Improvement example
- If current effective recovery is 35% and automation lifts to 70%:
  - 5% fail case: +R3,150/month (+R37,800/year)
  - 10% fail case: +R6,300/month (+R75,600/year)

### Cost-benefit rationale
- Even with tooling + implementation cost, breakeven is typically fast when recovered cash exceeds monthly automation cost.
- Additional gains: lower churn, better staff productivity, cleaner forecasting, fewer member disputes.

---

## 10. Scalability & Long-Term Optimization

### Multi-branch design principles
- Central automation engine + branch-specific policy layer.
- Branch tags on all events (`branch_id`, `timezone`, `policy_profile`).
- Shared template library with branch-local language/contact details.
- Central BI with branch drill-down and benchmark ranking.

### Continuous improvement cycle (monthly cadence)
1. Review KPI outliers (response delays, low-recovery branches).
2. Analyze failure reason-code shifts.
3. A/B test message timing and wording.
4. Tune retry and suspension thresholds.
5. Retrain staff using real case playback.

### AI/automation extensions
- **Retention saves:** trigger save offers before long suspension periods.
- **Upsell/cross-sell:** after successful recovery, offer PT/annual plans.
- **Predictive risk scoring:** model members likely to fail next cycle and pre-empt with reminders.
- **Smart assistant for staff:** next-best-action suggestions and auto-drafted response text.

### Go-live testing checklist
- Simulate failed debit events by reason type.
- Verify stage messages fire once and at correct times.
- Confirm suspension only after rule conditions are met.
- Test instant reinstatement after successful payment webhook.
- Validate dashboard totals against ITensity source data.

