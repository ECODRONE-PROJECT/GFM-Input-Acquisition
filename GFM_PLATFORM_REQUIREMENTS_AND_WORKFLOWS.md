# Grow For Me (GFM) Platform Requirements, Functionalities, and Workflows

Version: `v1.0`  
Scope: User app + Admin app + Backend + Integrations + Operational controls

## 1) Product Goal
Build a trusted agricultural commerce and financing platform where:
- Farmers can register, verify identity/phone, buy farm inputs, track delivery, and apply for credit.
- Admin (Grow For Me) can manage inventory, orders, delivery progress, payments, credit approvals, and operational risk.
- System remains secure, auditable, responsive, and ready for production expansion.

## 2) Core Roles and Permissions
### 2.1 Farmer (User)
- Can register/login.
- Must verify phone OTP before protected actions.
- Can browse catalog, place orders, pay (cash + credit split), track delivery timeline.
- Can apply for credit and upload supporting documents.

### 2.2 Admin (Grow For Me Company)
- Can CRUD inventory items.
- Can view/manage orders, payment statuses, and delivery statuses.
- Can review credit applications and approve/reject limits.
- Can manage system-level settings (webhook tokens, payout/payment flags, delivery defaults, SMS config).

### 2.3 Distribution Integration (External System)
- Can push order status updates via secure webhook token.

### 2.4 Credit/ML Team (Internal Integration)
- Consumes user and behavioral data.
- Produces score/risk outputs for admin decisioning.

## 3) System Modules
1. Auth and Verification
2. Catalog and Inventory
3. Cart and Checkout
4. Payments (Paystack)
5. Order Tracking and Follow-up
6. Credit Scoring and Credit Accounts
7. Credit Application + Document Upload
8. Admin Operations
9. Notifications (SMS/Email)
10. Audit, Monitoring, and Security

## 4) Functional Requirements by Module

## 4.1 Auth and Verification
- Email/password registration via Supabase Auth.
- SMS OTP verification during signup (expiry: 5 minutes, max attempts configurable).
- Login blocked for unverified phone where required.
- Resend OTP with rate limiting.
- Session-safe redirects (no open redirect vulnerability).
- Back-button behavior: authenticated and authorized routes should not leak user to guest-only pages.

Observed/Managed:
- OTP sent timestamp, attempts, consumed status.
- Phone verification status per user.
- Authentication errors and lockouts.

## 4.2 Catalog and Inventory (Admin-managed)
- Inventory item fields:
  - `name`
  - `type` (`seed`, `fertilizer`)
  - `price`
  - `stock` (bulk units)
  - optional: `brand`, `size`, `weight`, `location`, `image_url`, `is_active`
- Catalog visible to users in near-real-time.
- Cache invalidated immediately on admin create/update/delete.
- Low stock and out-of-stock clearly represented.

Observed/Managed:
- Stock history deltas.
- Last modified by admin.
- Item-level audit logs.

## 4.3 Cart and Checkout
- User can add/remove/update quantity.
- Quantity constrained by available stock.
- Checkout supports:
  - credit-only
  - cash-only
  - mixed credit + cash
- Requires delivery address before payment init.
- Concurrency-safe stock deduction and order creation.

Observed/Managed:
- checkout failures by reason (stock, payment, validation).
- cart abandonment (future analytics).

## 4.4 Payments (Paystack)
- Initialize payment for cash component.
- Verify transaction after callback.
- Idempotent verification (safe re-calls).
- Persist payment intents and provider payload snapshots.

Observed/Managed:
- pending/success/failed statuses.
- payment verification latency.
- reconciliation support (reference-based).

## 4.5 Orders, Delivery Timeline, and Follow-up
- Order states:
  - `ordered` -> `pending` -> `en_route` -> `delivered`
  - side states: `cancelled`, `failed`
- Order history and per-order timeline endpoints.
- Customer follow-up message endpoint.
- External distribution webhook updates status and timeline events.

Observed/Managed:
- current order status and last update.
- ETA (default 2 days unless overridden).
- webhook auth failures and malformed updates.

## 4.6 Credit Scoring and Credit Accounts
- Weighted score output (`0-100`) and creditworthiness labels:
  - `Excellent >= 80`
  - `Good 60-79`
  - `Fair 40-59`
  - `Poor < 40`
- Spendable credit comes from admin-approved account state.
- Credit account fields:
  - assigned limit
  - available credit
  - consumed credit
  - status
- Credit decreases on purchase when applied.

Observed/Managed:
- credit utilization %
- approved vs rejected vs pending users
- post-purchase credit updates

## 4.7 Credit Application and Documents
- User submits credit application.
- User uploads support docs (MoMo statement, bank statement, ID, farm record, other).
- Document upload supports click-select and drag/drop.
- Applications support status lifecycle:
  - `submitted`, `under_review`, `pending_documents`, `approved`, `rejected`

Observed/Managed:
- application status
- reviewer notes
- document count, upload timestamps, file metadata

## 4.8 Admin Operations
- Admin dashboard must support:
  - Inventory CRUD
  - Orders and payment status monitoring
  - Delivery status updates
  - Credit application queue and decisioning
  - Audit trail viewer
- Sensitive admin actions require strong confirmation.

Observed/Managed:
- who changed what and when
- failed admin actions
- key performance dashboards

## 4.9 Notifications
- SMS provider abstraction (`mnotify` / `twilio` / log fallback).
- OTP notifications and (future) order status notifications.
- Delivery and payment success notifications (future expansion).

## 4.10 Audit, Monitoring, Security
- Structured audit events for critical flows.
- API authentication and role-based authorization.
- Secure webhook token for distribution updates.
- Admin token or RBAC session for admin endpoints.
- Validation and sanitization for inputs/files.

## 5) Mandatory Story (as requested)

## 5.1 M-US1.2
As an Admin, I want to input bulk seeds and fertilizers into the database  
So that there is aggregated data available for the storefront.

Acceptance criteria:
- Admin can add, edit, and view inventory items.
- Inputs include name, type (seed/fertilizer), price, and available bulk stock.

Implementation boxes:
- [ ] Design database model for Agricultural Inputs
- [ ] Create secure backend API routes for CRUD operations
- [ ] Develop basic data-entry UI for the Admin role
- [ ] Items in shop should be instantly updated in shop on add, edit or delete without need for refresh
- [ ] Enter password to verify before deleting items
- [ ] View status of all orders and payments (and update their progress)

Definition of done:
- Shop reflects admin item changes without manual browser refresh.
- Delete action requires re-auth/password confirmation modal.
- Admin can view and update order lifecycle + payment lifecycle.

## 6) Data Model Requirements (High-level)
Minimum entities:
- `users` (auth-managed)
- `phone_otp_challenges`
- `user_phone_verifications`
- `catalog`
- `orders`
- `payment_intents`
- `order_tracking`
- `order_tracking_events`
- `credit_applications`
- `credit_application_documents`
- `credit_application_events`
- `credit_accounts`
- `system_logs` (audit trail)

Additional recommended:
- `inventory_movements`
- `admin_users` / `admin_roles`
- `webhook_deliveries`
- `notification_events`

## 7) API Requirements (High-level)
User APIs:
- Auth register/login/initiate OTP/verify OTP/resend/status
- Catalog read
- Checkout + Paystack init/verify
- Orders history/details/follow-up
- Credit score/status/application submit/details/document upload

Admin APIs:
- Inventory CRUD
- Order list/details/status update
- Payment list/reconciliation status
- Credit applications list/decision
- Bulk credit bootstrap for initial rollout (internal admin tool)

Integration APIs:
- Distribution webhook with token verification.

## 8) Real-time Update Requirement
Shop must update when admin changes inventory:
- Primary: WebSocket or SSE push from backend/admin events.
- Fallback: smart polling every 10-30s with ETag/Last-Modified caching.
- Cache invalidation after CRUD is mandatory.

## 9) UX Requirements
- Mobile-first forms for farmers.
- Large touch targets and clear feedback.
- Empty-state clarity for no orders/no credit/no inventory.
- No dead-end screens.
- For approved credit users: show locked info state, not silent redirect loops.

## 10) Payment and Order Status Management
Admin view must expose:
- payment reference
- amount split (credit/cash)
- provider status
- verification timestamp
- order status + timeline event feed
- manual override controls with reason logging

## 11) Security and Compliance
- Hash/seal OTP values, never store raw OTP.
- Input validation on all endpoints.
- File upload restrictions:
  - accepted mime types
  - max size
  - sanitized filenames
- RLS policies for Supabase tables.
- Audit critical actions:
  - delete inventory
  - credit approval/rejection
  - order status overrides
  - payment manual reconciliations

## 12) Performance and Reliability Targets
- Catalog API p95: `< 500ms` (cache hit).
- Checkout API p95: `< 1.5s` excluding external payment redirect.
- Order history API p95: `< 800ms`.
- Error budget for critical endpoints: `< 1%` per day.
- Retry strategy for webhook and SMS calls with dead-letter/event logging.

## 13) Admin Feature Expansion (Bulk Buy + Auctions)

## 13.1 Bulk Buy (B2B/Co-op Mode)
- Farmers or groups can request large quantity quotes.
- Admin can create negotiated quote with validity window.
- Payment can be split (deposit + settlement).
- Inventory reserved for approved quote window.

## 13.2 Auction / Dynamic Pricing (Controlled Rollout)
- Admin can launch time-boxed auction for selected lots.
- Bid rules:
  - min increment
  - reserve price
  - eligible buyer groups
- Winning flow generates order/payment intent.
- Full bid history immutable for audit.

## 14) Farmer Surplus Buyback (Future Module)
Goal: farmer can offer excess produce/input to Grow For Me for discounted resale.

Required controls to prevent “buy elsewhere and resell to us” abuse:
- KYC + farm profile verification.
- Yield reasonability checks against farm size/crop profile.
- Geo-tagged proof and timestamped photos/video uploads.
- Historical production baseline (seasonal expected range).
- Supplier invoice validation and blacklist checks.
- Cooldown windows and quantity caps per farm.
- Risk score + manual review queue before acceptance.
- Commission model:
  - sale price
  - admin commission %
  - farmer net payout
  - payout status tracking

Suggested workflow:
1. Farmer submits surplus form (quantity, type, evidence).
2. System runs fraud/risk pre-check.
3. Admin reviews and accepts/rejects/requests more proof.
4. Accepted lots listed in discounted marketplace.
5. Sale closes -> commission split -> payout initiated.

## 15) Observability and Admin Reporting
Dashboards should include:
- Active users / verified users
- Conversion funnel (signup -> verified -> first order)
- Catalog stock health
- Payment success rate and pending verifications
- Delivery SLA compliance
- Credit approvals/rejections/utilization
- Fraud flags and manual review queue size

## 16) Deployment and Environment Requirements
- Separate env for dev/staging/prod.
- Secrets in environment variables only.
- DB migrations versioned and idempotent.
- Healthcheck endpoint and readiness checks.
- Automated CI checks:
  - lint
  - tests
  - migration validation

## 17) Test Requirements
Minimum required tests:
- Auth + OTP happy/edge flows
- Inventory CRUD and stock constraints
- Checkout and payment verification idempotency
- Order timeline webhook and follow-up
- Credit application + decision + balance deduction
- Admin delete verification with password
- Realtime catalog update behavior

## 18) Phase Plan
Phase 1 (Now):
- Stabilize user backend/frontend flows.
- Complete admin inventory + order/payment monitoring.
- Complete credit lifecycle and document handling.

Phase 2:
- Realtime enhancements, notification depth, admin analytics.
- Hardening and production readiness.

Phase 3:
- Bulk buy quotes, auctions, surplus buyback pilot.

## 19) Open Decisions to Finalize
- Admin authentication method (token vs full RBAC).
- Re-auth policy for sensitive actions.
- Final scoring input contract from ML team.
- Accepted document types and storage backend policy.
- Auction legal/operational guardrails.
- Buyback payout rails and settlement timelines.

