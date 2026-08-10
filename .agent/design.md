# ERP+CRM Platform — Design Instructions

## Reference points

- Stripe: restrained color use, dense data tables that stay legible, precise micro-typography on numbers, dashboard cards that surface one metric clearly.
- Linear: fast-feeling UI, keyboard-first interaction cues, monochrome base with a single accent, minimal chrome, command palette pattern.
- Odoo: module-based navigation (Sales, Inventory, Accounting, CRM as distinct apps under one shell), breadcrumb-driven drill-down from list to record.

Use these as behavioral references, not visual templates. Do not copy Stripe's purple or Linear's exact typeface. Derive the palette and type from this brief.

## Design tokens

**Color**
- Base surface: near-white, not pure white (e.g. `#FAFAFA`).
- Secondary surface: light neutral gray for cards and panels (e.g. `#F2F2F3`).
- Border: hairline neutral gray, low contrast (e.g. `#E4E4E7`).
- Text primary: near-black, not pure black (e.g. `#1A1A1E`).
- Text secondary: mid gray for metadata and labels (e.g. `#6B6B70`).
- Accent: single functional color, used only for primary actions, active states, and links. Not decorative. Pick one hue and derive it from the product's domain rather than defaulting to blue or purple.
- Status colors: distinct hues for success, warning, error, and info states, used only on badges, stock alerts, and challan status — never as page backgrounds.

**Typography**
- Display/UI face: a grotesk sans, e.g. Inter, Geist, or IBM Plex Sans. Used for headings, buttons, nav.
- Body face: same family as UI face, lighter weight, for descriptions and body text. ERP+CRM software does not need a second display face — consistency matters more than personality here.
- Data/mono face: a monospace or tabular-figure font for numbers, SKUs, invoice totals, timestamps. This is non-negotiable for a platform with pricing, stock counts, and challan numbers — misaligned digits in tables read as unfinished.
- Scale: base 14px for dense UI (tables, forms), 13px for metadata, 20–28px range for page titles. Avoid large display type outside of empty states and login screens.

**Layout**
- Persistent left sidebar for module navigation (Dashboard, CRM, Inventory, Sales/Challans, Accounts, Users), collapsible to icon-only.
- Top bar reserved for search, notifications, and user menu only. No navigation duplication between sidebar and top bar.
- List views: dense tables with sortable columns, inline status badges, row-level actions on hover, not persistent icons.
- Record views: two-column layout — primary details and activity/timeline on the left, metadata and quick actions in a fixed-width right rail. This matches how CRM follow-ups and challan history should be surfaced next to the record they belong to.
- Forms: single column, grouped by section with clear labels above fields, not floating labels. Inline validation, not toast-only.

## Structure by module

- **Dashboard**: a small number of real metrics (open leads, low-stock items, pending challans, revenue this month), not a generic KPI grid. Each metric should link directly to its filtered list view.
- **CRM**: pipeline as a kanban by `CustomerStatus` (Lead → Active → Inactive) or a filterable table, with follow-up date visible and overdue follow-ups visually flagged.
- **Inventory**: table view keyed on stock level vs. `minimumStockAlertQuantity`, with low-stock rows flagged using the warning status color, not a full-row red fill.
- **Sales/Challans**: challan list by status (Draft/Confirmed/Cancelled), record view showing line items in a table with product, SKU, quantity, and unit price columns using the tabular data face.
- **Users/Accounts**: simple role-based table, no unnecessary visual weight since this is low-frequency admin surface.

## Motion

- Use motion only for state transitions that need continuity: sidebar collapse, panel open/close, row expand. Duration under 200ms, ease-out.
- No page-load animation sequences, no decorative hover effects on data tables. This is a tool people use for hours a day — motion should never slow down repeated actions.
- Respect `prefers-reduced-motion`.

## Copy and voice

- Name actions by what the user controls: "Confirm challan," not "Submit." "Add follow-up," not "Create entry."
- Button label and resulting confirmation must match: "Confirm challan" produces "Challan confirmed," not "Success."
- Empty states state what will appear and how to create the first one: "No customers yet. Add your first lead to start tracking follow-ups." Not "No data."
- Errors state what happened and how to resolve it: "Stock quantity cannot be negative. Enter a value of 0 or more," not "Invalid input."
- No exclamation marks, no marketing language, no filler transitions anywhere in the product UI.

## Signature element

Pick one: a live low-stock indicator that pulses subtly in the sidebar module icon when any product crosses its alert threshold, or a command palette (`Cmd+K`) for jumping directly to any customer, product, or challan by number. Choose whichever fits the actual usage pattern of the target users; do not implement both as a default.

## Explicit non-goals

- No cream background, no serif display face, no terracotta accent.
- No numbered process markers (01/02/03) anywhere — this is not a marketing site.
- No illustration-heavy empty states or mascots.
- No dark-mode-only design; default to light, dark mode optional if time allows.
