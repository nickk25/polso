# Polso Architecture

Financial management and expense intelligence SaaS platform.

## Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Banking API**: GoCardless Bank Account Data (formerly Nordigen)

## Modules

| Module | Function |
|--------|----------|
| **Banking** | Bank connection, automatic sync, real-time balance |
| **Expenses** | Expenses with invoice, category, vendor, status |
| **Intelligence** | Recurring detection, auto-categorization |
| **Analytics** | Burn rate, runway, cash flow, ratios, trends, alerts |
| **Export** | ZIP with invoices + CSV/PDF for accountant |

## Core Entities

```
Account (connected bank)
Transaction (from bank)
Expense (transaction + metadata + invoice)
Category
Vendor (detected/created supplier)
RecurringPattern (detected fixed expenses)
```

## Analytics KPIs

- Current balance
- Burn rate (monthly)
- Runway (months remaining)
- Total fixed expenses
- Total variable expenses
- Fixed/variable ratio
- Monthly trend
- Projected cash flow
- Smart alerts

## Core Flow

```
Santander ──→ Banking API ──→ Transactions
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ¿Recurring?              ¿One-time?
                    │                       │
                    ▼                       ▼
              Fixed Expense         Variable Expense
                    │                       │
                    └───────────┬───────────┘
                                ▼
                       Auto-categorize
                                │
                                ▼
                    Attach invoice (manual)
                                │
                                ▼
                      Dashboard + Analytics
                                │
                                ▼
                    Export → Accountant (ZIP)
```

---

## Database Schema

### organizations
Multi-tenant root table.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### accounts
Connected bank accounts.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- GoCardless fields
  gocardless_requisition_id TEXT,
  gocardless_account_id TEXT UNIQUE,
  gocardless_institution_id TEXT,

  -- Bank metadata
  name TEXT NOT NULL,
  iban TEXT,
  bic TEXT,
  currency TEXT DEFAULT 'EUR',
  institution_name TEXT,
  institution_logo TEXT,

  -- Sync status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'error')),
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Balances (cached)
  balance_available DECIMAL(15,2),
  balance_booked DECIMAL(15,2),

  access_valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### transactions
Raw transactions from bank sync.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  external_transaction_id TEXT,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  booking_date DATE NOT NULL,
  value_date DATE,

  remittance_information TEXT,
  creditor_name TEXT,
  debtor_name TEXT,

  transaction_type TEXT,
  status TEXT DEFAULT 'booked',
  counterparty_name TEXT, -- normalized for matching

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, external_transaction_id)
);
```

### categories
Expense categories (system + custom).

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  is_system BOOLEAN DEFAULT FALSE,
  expense_type TEXT CHECK (expense_type IN ('fixed', 'variable', 'income', 'transfer')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);
```

### vendors
Detected/created suppliers.

```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  tax_id TEXT,

  default_category_id UUID REFERENCES categories(id),
  default_expense_type TEXT CHECK (default_expense_type IN ('fixed', 'variable')),

  is_auto_detected BOOLEAN DEFAULT TRUE,
  detection_patterns TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, normalized_name)
);
```

### expenses
Enriched transactions with metadata and invoices.

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  date DATE NOT NULL,
  description TEXT,

  category_id UUID REFERENCES categories(id),
  vendor_id UUID REFERENCES vendors(id),
  expense_type TEXT CHECK (expense_type IN ('fixed', 'variable')) DEFAULT 'variable',
  recurring_pattern_id UUID REFERENCES recurring_patterns(id),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'documented', 'excluded')),
  is_manual BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### expense_invoices
Invoice attachments.

```sql
CREATE TABLE expense_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  invoice_number TEXT,
  invoice_date DATE,
  vendor_tax_id TEXT,
  total_amount DECIMAL(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### recurring_patterns
Detected recurring expense patterns.

```sql
CREATE TABLE recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  vendor_id UUID REFERENCES vendors(id),

  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  expected_amount DECIMAL(15,2),
  amount_variance_pct DECIMAL(5,2) DEFAULT 10.00,
  expected_day_of_month INTEGER,

  category_id UUID REFERENCES categories(id),
  expense_type TEXT DEFAULT 'fixed',

  is_active BOOLEAN DEFAULT TRUE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(5,2),
  first_occurrence DATE,
  last_occurrence DATE,
  occurrence_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### alerts
Smart financial alerts.

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'low_balance', 'high_expense', 'missed_recurring',
    'unusual_activity', 'runway_warning', 'budget_exceeded'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),

  account_id UUID REFERENCES accounts(id),
  expense_id UUID REFERENCES expenses(id),
  recurring_pattern_id UUID REFERENCES recurring_patterns(id),

  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### exports
Export history for accountant packages.

```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  expense_count INTEGER,
  invoice_count INTEGER,

  includes_csv BOOLEAN DEFAULT TRUE,
  includes_pdf BOOLEAN DEFAULT TRUE,
  includes_invoices BOOLEAN DEFAULT TRUE,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### RLS Helper Function

```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_organizations
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- All tables use policies like:
-- USING (organization_id = get_user_organization_id())
```

---

## Feature Module Structure

```
/features/
├── banking/
│   ├── actions/        # connect-bank, disconnect-bank, sync-transactions
│   ├── queries/        # get-accounts, get-institutions
│   ├── schemas/        # Zod validation
│   └── lib/            # api-client, transaction-mapper
│
├── expenses/
│   ├── actions/        # create, update, categorize, upload-invoice
│   ├── queries/        # get-expenses, get-uncategorized
│   └── schemas/
│
├── intelligence/
│   ├── actions/        # detect-recurring, confirm-pattern, auto-categorize
│   ├── queries/        # get-patterns, get-suggestions
│   └── lib/            # recurring-detector, categorizer, vendor-matcher
│
├── analytics/
│   ├── queries/        # get-kpis, get-burn-rate, get-runway
│   └── lib/            # kpi-calculator, projection-engine
│
├── vendors/
│   ├── actions/        # create, update, merge, delete
│   └── queries/
│
├── categories/
│   ├── actions/
│   └── queries/
│
├── export/
│   ├── actions/        # create-export
│   └── lib/            # zip-generator, csv-generator, pdf-generator
│
└── alerts/
    ├── actions/        # dismiss, mark-read
    └── queries/
```

---

## Dashboard Routes

```
/app/(dashboard)/
├── layout.tsx              # Sidebar layout
├── page.tsx                # Overview with KPIs
│
├── banking/
│   ├── page.tsx            # Account list
│   ├── connect/page.tsx    # Connection flow
│   └── [accountId]/page.tsx
│
├── expenses/
│   ├── page.tsx            # Expense list
│   ├── new/page.tsx        # Manual entry
│   ├── uncategorized/page.tsx
│   └── [expenseId]/page.tsx
│
├── recurring/
│   ├── page.tsx            # Fixed expenses
│   └── suggestions/page.tsx
│
├── analytics/
│   ├── page.tsx            # Full dashboard
│   ├── burn-rate/page.tsx
│   └── cash-flow/page.tsx
│
├── vendors/page.tsx
├── categories/page.tsx
├── export/page.tsx
└── settings/page.tsx
```

---

## Intelligence Engine

### Recurring Detection Algorithm

1. Group transactions by normalized counterparty name
2. Filter groups with >= 3 occurrences
3. Calculate intervals between transactions
4. Match against frequencies (weekly/biweekly/monthly/quarterly/yearly)
5. Check amount consistency (< 15% variance)
6. Calculate confidence score
7. Suggest patterns above 70% confidence

### Auto-Categorization Priority

1. **Exact vendor match** → Use vendor's default category (95% confidence)
2. **Similar transactions** → Vote from past categorizations (70-85%)
3. **Keyword patterns** → Match against Spanish keywords (70-80%)

---

## Export Package Structure

```
export_enero_2024.zip
├── gastos.csv
├── informe_gastos.pdf
└── facturas/
    ├── 2024-01-15_Netflix_factura.pdf
    └── ...
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GoCardless Bank Account Data
GOCARDLESS_SECRET_ID=
GOCARDLESS_SECRET_KEY=

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
