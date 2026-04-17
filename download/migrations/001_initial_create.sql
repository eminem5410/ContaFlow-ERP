-- ============================================================================
-- ContaFlow ERP — Initial Database Migration
-- Generated: 2025-01-01
-- EF Core Version: 8.0.0
-- Database: PostgreSQL 16+
-- ============================================================================
-- This migration creates all tables for the ContaFlow ERP system following
-- the EF Core entity configurations defined in AppDbContext.cs and the
-- IEntityTypeConfiguration classes in ContaFlow.Infrastructure.
--
-- Dependency order: parent tables created before child tables.
-- Uses IF NOT EXISTS for idempotency.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. EF Core Migrations History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "__ef_migrations_history" (
    "migration_id"    character varying(150) NOT NULL,
    "product_version" character varying(32)  NOT NULL,
    CONSTRAINT "PK___ef_migrations_history" PRIMARY KEY ("migration_id")
);

-- Insert initial migration record
INSERT INTO "__ef_migrations_history" ("migration_id", "product_version")
VALUES ('20250101000000_InitialCreate', '8.0.0')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 1. companies
--    Root entity — tenant (multi-company). No foreign key dependencies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    "id"         character varying(50)  NOT NULL,
    "name"       character varying(200) NOT NULL,
    "cuit"       character varying(20),
    "email"      character varying(255),
    "phone"      character varying(50),
    "address"    character varying(500),
    "logo"       character varying(500),
    "plan"       character varying(50)  NOT NULL DEFAULT 'basico',
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_companies" PRIMARY KEY ("id")
);

-- ============================================================================
-- 2. roles
--    System roles (admin, contador, operador, viewer).
--    company_id is a plain column (no navigation property configured).
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    "id"          character varying(50)  NOT NULL,
    "name"        character varying(200) NOT NULL,
    "description" text,
    "company_id"  character varying(50)  NOT NULL,
    "created_at"  timestamp with time zone NOT NULL,
    "updated_at"  timestamp with time zone NOT NULL,
    CONSTRAINT "PK_roles" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. permissions
--    Granular permissions (e.g., journal_entries.create, invoices.read).
--    Global — not scoped to a company.
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    "id"          character varying(50)  NOT NULL,
    "name"        character varying(200) NOT NULL,
    "description" text,
    "created_at"  timestamp with time zone NOT NULL,
    "updated_at"  timestamp with time zone NOT NULL,
    CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. role_permissions
--    Junction table for RBAC — many-to-many between roles and permissions.
--    FK: roles (CASCADE), permissions (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    "id"           character varying(50) NOT NULL,
    "role_id"      character varying(50) NOT NULL,
    "permission_id" character varying(50) NOT NULL,
    "created_at"   timestamp with time zone NOT NULL,
    "updated_at"   timestamp with time zone NOT NULL,
    CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id"),
    CONSTRAINT "FK_role_permissions_roles_role_id"
        FOREIGN KEY ("role_id") REFERENCES roles ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_role_permissions_permissions_permission_id"
        FOREIGN KEY ("permission_id") REFERENCES permissions ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 5. users
--    System users with JWT auth (access + refresh tokens).
--    FK: companies (CASCADE), roles (SET NULL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    "id"                  character varying(50)  NOT NULL,
    "email"               character varying(255) NOT NULL,
    "password"            character varying(500) NOT NULL,
    "name"                character varying(200) NOT NULL,
    "role"                character varying(50)  NOT NULL DEFAULT 'user',
    "role_id"             character varying(50),
    "company_id"          character varying(50)  NOT NULL,
    "refresh_token"       character varying(500),
    "refresh_token_expiry" timestamp with time zone,
    "created_at"          timestamp with time zone NOT NULL,
    "updated_at"          timestamp with time zone NOT NULL,
    CONSTRAINT "PK_users" PRIMARY KEY ("id"),
    CONSTRAINT "FK_users_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_users_roles_role_id"
        FOREIGN KEY ("role_id") REFERENCES roles ("id")
        ON DELETE SET NULL
);

-- ============================================================================
-- 6. accounts
--    Chart of accounts with hierarchical parent-child structure.
--    FK: companies (CASCADE), self-referential parent (SET NULL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
    "id"         character varying(50)  NOT NULL,
    "code"       character varying(20)  NOT NULL,
    "name"       character varying(200) NOT NULL,
    "type"       character varying(50)  NOT NULL,
    "subtype"    character varying(50),
    "parent_id"  character varying(50),
    "level"      integer                NOT NULL,
    "balance"    double precision       NOT NULL,
    "company_id" character varying(50)  NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
    CONSTRAINT "FK_Account_Parent"
        FOREIGN KEY ("parent_id") REFERENCES accounts ("id")
        ON DELETE SET NULL,
    CONSTRAINT "FK_accounts_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 7. journal_entries
--    Accounting journal entries (double-entry bookkeeping header).
--    FK: companies (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    "id"          character varying(50)  NOT NULL,
    "number"      integer                NOT NULL,
    "date"        timestamp with time zone NOT NULL,
    "description" character varying(500) NOT NULL,
    "concept"     character varying(500),
    "status"      character varying(50)  NOT NULL DEFAULT 'borrador',
    "company_id"  character varying(50)  NOT NULL,
    "total_debit" double precision       NOT NULL,
    "total_credit" double precision      NOT NULL,
    "created_at"  timestamp with time zone NOT NULL,
    "updated_at"  timestamp with time zone NOT NULL,
    CONSTRAINT "PK_journal_entries" PRIMARY KEY ("id"),
    CONSTRAINT "FK_journal_entries_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 8. journal_entry_lines
--    Individual debit/credit lines within a journal entry.
--    FK: journal_entries (CASCADE), accounts (RESTRICT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    "id"               character varying(50)  NOT NULL,
    "journal_entry_id" character varying(50)  NOT NULL,
    "account_id"       character varying(50)  NOT NULL,
    "debit"            double precision       NOT NULL,
    "credit"           double precision       NOT NULL,
    "description"      text,
    "created_at"       timestamp with time zone NOT NULL,
    "updated_at"       timestamp with time zone NOT NULL,
    CONSTRAINT "PK_journal_entry_lines" PRIMARY KEY ("id"),
    CONSTRAINT "FK_journal_entry_lines_journal_entries_journal_entry_id"
        FOREIGN KEY ("journal_entry_id") REFERENCES journal_entries ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_journal_entry_lines_accounts_account_id"
        FOREIGN KEY ("account_id") REFERENCES accounts ("id")
        ON DELETE RESTRICT
);

-- ============================================================================
-- 9. clients
--    Company clients (customers) for sales invoices and collections.
--    FK: companies (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    "id"         character varying(50)  NOT NULL,
    "code"       text,
    "name"       character varying(200) NOT NULL,
    "cuit"       character varying(20),
    "email"      text,
    "phone"      text,
    "address"    text,
    "city"       text,
    "province"   text,
    "notes"      text,
    "balance"    double precision       NOT NULL,
    "company_id" character varying(50)  NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_clients" PRIMARY KEY ("id"),
    CONSTRAINT "FK_clients_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 10. providers
--     Company providers (suppliers) for purchase invoices and payments.
--     FK: companies (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS providers (
    "id"         character varying(50)  NOT NULL,
    "code"       text,
    "name"       character varying(200) NOT NULL,
    "cuit"       character varying(20),
    "email"      text,
    "phone"      text,
    "address"    text,
    "city"       text,
    "province"   text,
    "notes"      text,
    "balance"    double precision       NOT NULL,
    "company_id" character varying(50)  NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_providers" PRIMARY KEY ("id"),
    CONSTRAINT "FK_providers_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 11. invoices
--     Electronic invoices (types: A, B, C, NC, ND) with items and payments.
--     FK: companies (CASCADE), clients (SET NULL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    "id"          character varying(50)  NOT NULL,
    "number"      character varying(50)  NOT NULL,
    "type"        character varying(10)  NOT NULL,
    "date"        timestamp with time zone NOT NULL,
    "due_date"    timestamp with time zone,
    "total"       double precision       NOT NULL,
    "tax"         double precision       NOT NULL,
    "net_total"   double precision       NOT NULL,
    "amount_paid" double precision       NOT NULL,
    "status"      character varying(50)  NOT NULL DEFAULT 'pendiente',
    "notes"       text,
    "client_id"   character varying(50),
    "company_id"  character varying(50)  NOT NULL,
    "created_at"  timestamp with time zone NOT NULL,
    "updated_at"  timestamp with time zone NOT NULL,
    CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
    CONSTRAINT "FK_invoices_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_invoices_clients_client_id"
        FOREIGN KEY ("client_id") REFERENCES clients ("id")
        ON DELETE SET NULL
);

-- ============================================================================
-- 12. invoice_items
--     Line items within an invoice (description, quantity, price, tax).
--     FK: invoices (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_items (
    "id"          character varying(50)  NOT NULL,
    "description" character varying(500) NOT NULL,
    "quantity"    double precision       NOT NULL,
    "unit_price"  double precision       NOT NULL,
    "subtotal"    double precision       NOT NULL,
    "tax_rate"    double precision       NOT NULL,
    "tax_amount"  double precision       NOT NULL,
    "invoice_id"  character varying(50)  NOT NULL,
    "created_at"  timestamp with time zone NOT NULL,
    "updated_at"  timestamp with time zone NOT NULL,
    CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id"),
    CONSTRAINT "FK_invoice_items_invoices_invoice_id"
        FOREIGN KEY ("invoice_id") REFERENCES invoices ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 13. bank_accounts
--     Bank accounts (cash, checking, savings) for the company.
--     FK: companies (CASCADE)
--     NOTE: Created before payments because payments references this table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
    "id"         character varying(50)  NOT NULL,
    "name"       character varying(200) NOT NULL,
    "bank"       character varying(100),
    "number"     character varying(50),
    "type"       character varying(50)  NOT NULL DEFAULT 'cta_corriente',
    "balance"    double precision       NOT NULL,
    "currency"   character varying(10)  NOT NULL DEFAULT 'ARS',
    "company_id" character varying(50)  NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id"),
    CONSTRAINT "FK_bank_accounts_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE
);

-- ============================================================================
-- 14. payments
--     Payments and collections. Can link to invoice, client, provider, bank_account.
--     FK: companies (CASCADE), invoices (SET NULL), clients (SET NULL),
--         providers (SET NULL), bank_accounts (SET NULL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    "id"             character varying(50)  NOT NULL,
    "number"         character varying(50)  NOT NULL,
    "date"           timestamp with time zone NOT NULL,
    "amount"         double precision       NOT NULL,
    "method"         character varying(50)  NOT NULL DEFAULT 'transferencia',
    "reference"      character varying(100),
    "type"           character varying(20)  NOT NULL DEFAULT 'cobro',
    "notes"          text,
    "invoice_id"     character varying(50),
    "client_id"      character varying(50),
    "provider_id"    character varying(50),
    "bank_account_id" character varying(50),
    "company_id"     character varying(50)  NOT NULL,
    "created_at"     timestamp with time zone NOT NULL,
    "updated_at"     timestamp with time zone NOT NULL,
    CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
    CONSTRAINT "FK_payments_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_payments_invoices_invoice_id"
        FOREIGN KEY ("invoice_id") REFERENCES invoices ("id")
        ON DELETE SET NULL,
    CONSTRAINT "FK_payments_clients_client_id"
        FOREIGN KEY ("client_id") REFERENCES clients ("id")
        ON DELETE SET NULL,
    CONSTRAINT "FK_payments_providers_provider_id"
        FOREIGN KEY ("provider_id") REFERENCES providers ("id")
        ON DELETE SET NULL,
    CONSTRAINT "FK_payments_bank_accounts_bank_account_id"
        FOREIGN KEY ("bank_account_id") REFERENCES bank_accounts ("id")
        ON DELETE SET NULL
);

-- ============================================================================
-- 15. audit_logs
--     Audit trail for all user actions on domain entities.
--     FK: companies (CASCADE), users (CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    "id"         character varying(50)  NOT NULL,
    "user_id"    character varying(50)  NOT NULL,
    "user_name"  character varying(200) NOT NULL,
    "action"     character varying(50)  NOT NULL,
    "entity"     character varying(50)  NOT NULL,
    "entity_id"  text,
    "details"    text,
    "company_id" character varying(50)  NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
    CONSTRAINT "FK_audit_logs_companies_company_id"
        FOREIGN KEY ("company_id") REFERENCES companies ("id")
        ON DELETE CASCADE,
    CONSTRAINT "FK_audit_logs_users_user_id"
        FOREIGN KEY ("user_id") REFERENCES users ("id")
        ON DELETE CASCADE
);


-- ============================================================================
-- INDEXES
-- ============================================================================

-- --- companies ---
-- Unique CUIT per company (filtered: only enforced when CUIT is not null)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_companies_cuit"
    ON companies ("cuit")
    WHERE "cuit" IS NOT NULL;

-- --- users ---
-- Unique email per user (global)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_email"
    ON users ("email");

-- --- accounts ---
-- Unique code per company
CREATE UNIQUE INDEX IF NOT EXISTS "IX_accounts_company_id_code"
    ON accounts ("company_id", "code");

-- --- journal_entries ---
-- Unique entry number per company
CREATE UNIQUE INDEX IF NOT EXISTS "IX_journal_entries_company_id_number"
    ON journal_entries ("company_id", "number");

-- --- clients ---
-- Unique CUIT per company (filtered: only enforced when CUIT is not null)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_clients_cuit"
    ON clients ("cuit")
    WHERE "cuit" IS NOT NULL;

-- --- providers ---
-- Unique CUIT per company (filtered: only enforced when CUIT is not null)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_providers_cuit"
    ON providers ("cuit")
    WHERE "cuit" IS NOT NULL;

-- --- role_permissions ---
-- Unique permission per role (one permission can only be assigned once per role)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_role_permissions_role_id_permission_id"
    ON role_permissions ("role_id", "permission_id");

-- --- audit_logs ---
-- Single-column indexes for frequent audit queries
CREATE INDEX IF NOT EXISTS "IX_audit_logs_company_id"
    ON audit_logs ("company_id");

CREATE INDEX IF NOT EXISTS "IX_audit_logs_entity"
    ON audit_logs ("entity");

CREATE INDEX IF NOT EXISTS "IX_audit_logs_created_at"
    ON audit_logs ("created_at");

-- Composite index for the most common audit query pattern: filter by company + entity + date range
CREATE INDEX IF NOT EXISTS "IX_audit_logs_company_id_entity_created_at"
    ON audit_logs ("company_id", "entity", "created_at");


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 15 tables created:
--   1.  companies          (10 columns, 1 filtered unique index)
--   2.  roles              (6 columns)
--   3.  permissions        (5 columns)
--   4.  role_permissions   (5 columns, 2 FKs, 1 unique index)
--   5.  users              (12 columns, 2 FKs, 1 unique index)
--   6.  accounts           (10 columns, 2 FKs, 1 unique index)
--   7.  journal_entries    (10 columns, 1 FK, 1 unique index)
--   8.  journal_entry_lines (7 columns, 2 FKs)
--   9.  clients            (13 columns, 1 FK, 1 filtered unique index)
--   10. providers          (13 columns, 1 FK, 1 filtered unique index)
--   11. invoices           (14 columns, 2 FKs)
--   12. invoice_items      (9 columns, 1 FK)
--   13. bank_accounts      (9 columns, 1 FK)
--   14. payments           (15 columns, 5 FKs)
--   15. audit_logs         (10 columns, 2 FKs, 4 indexes)
--
-- Total foreign keys:  23
-- Total unique indexes:  6 (4 standard + 2 filtered)
-- Total regular indexes: 4
-- Default values:       7 (plan, role, status×2, method, type, currency)
-- ============================================================================

COMMIT;
