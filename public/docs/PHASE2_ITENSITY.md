# Phase 2 – Itensity Integration Plan

## Assumption
Itensity does not expose a public API initially. Phase 2 uses CSV export/import or a limited integration if available.

## Option A: CSV Export/Import

1. **Export Members from Itensity**
   - Schedule weekly export (CSV).
   - Fields needed: full name, phone, join date, membership type, status.

2. **CSV Ingest to Google Sheets**
   - Use a scheduled n8n workflow:
     - Watch for CSV file in Google Drive.
     - Parse rows and upsert into a `MEMBERS` sheet.

3. **Matching Logic**
   - Match on `phone_e164` or normalized phone.
   - Update lead outcome to `JOINED` when match found.

## Option B: API (If Available)

1. Request API docs/credentials from Itensity.
2. Use a secure backend service to sync member updates daily.
3. Replace CSV flow with API pull.

## Mapping Suggestion

| Itensity Field | Google Sheet Field |
| --- | --- |
| Full Name | full_name |
| Mobile | phone_e164 |
| Join Date | outcome_date |
| Membership | package_interest |
| Status | outcome |

## Benefits
- Automated join tracking
- Cleaner conversion reporting
- Reduced manual updates
