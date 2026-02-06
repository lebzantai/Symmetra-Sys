# Phase 2 – Itensity Integration Plan

## Assumptions
- Itensity may not expose an API.
- Most realistic integration is CSV export/import or manual data sync.

## Integration options
1. **CSV export from Itensity**
   - Export member list weekly.
   - Map fields to `LEADS` columns (email, phone, package, start date).
   - Use a script to update leads and flag existing members.

2. **CSV import to Itensity**
   - Export `BOOKED` or `JOINED` leads from Google Sheets.
   - Import into Itensity to avoid double entry.

3. **Screen automation (last resort)**
   - If no CSV, use a lightweight RPA (Playwright/Robocorp) to push data.

## Data mapping
| Itensity Field | Sheet Column |
| --- | --- |
| Member Name | full_name |
| Phone | phone_e164 |
| Package | package_interest |
| Join Date | created_at |
| Notes | notes |

## Next steps
- Confirm if Itensity has API or export. If yes, replace CSV sync with API calls.
- Add nightly sync job and reconciliation report.
