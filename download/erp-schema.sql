-- ============================================================
-- ERP CONTABLE INTELIGENTE - Schema PostgreSQL
-- Multi-tenant SaaS Architecture
-- Autor: Pablo Diez | Version: 1.0 | Abril 2026
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLAS CORE (Multi-tenant)
-- Todas las tablas incluyen tenant_id para aislamiento
-- ============================================================

-- 1. TENANTS (Empresas)
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    cuit            VARCHAR(20),
    legal_name      VARCHAR(200),
    email           VARCHAR(300),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'Argentina',
    postal_code     VARCHAR(20),
    plan            VARCHAR(50) DEFAULT 'basic',  -- basic, pro, enterprise
    plan_status     VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    afip_cert       TEXT,                          -- Certificado AFIP (encrypted)
    fiscal_config   JSONB DEFAULT '{}',            -- Configuracion fiscal por tenant
    settings        JSONB DEFAULT '{}',            -- Configuracion general
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_cuit ON tenants(cuit) WHERE cuit IS NOT NULL;
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_active ON tenants(active);

-- 2. USERS (Usuarios multi-tenant)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(300) NOT NULL,
    password_hash   VARCHAR(500) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    role            VARCHAR(50) DEFAULT 'user',   -- admin, accountant, operator, viewer
    avatar_url      TEXT,
    last_login_at   TIMESTAMPTZ,
    active          BOOLEAN DEFAULT TRUE,
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(tenant_id, role);

-- 3. ACCOUNTS (Plan de Cuentas)
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,          -- Ej: 1.1.1, 2.1.01
    name            VARCHAR(300) NOT NULL,          -- Ej: "Caja", "Banco Nacion"
    description     TEXT,
    account_type    VARCHAR(20) NOT NULL,           -- asset, liability, equity, income, expense
    account_subtype VARCHAR(50),                    -- Ej: current, non_current, bank, customer
    parent_id       UUID REFERENCES accounts(id),   -- Jerarquia de cuentas
    imputable       BOOLEAN DEFAULT TRUE,           -- Puede recibir asientos?
    current_balance DECIMAL(18, 2) DEFAULT 0,       -- Saldo actual (actualizado por triggers)
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_type ON accounts(tenant_id, account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id) WHERE parent_id IS NOT NULL;

-- 4. JOURNAL ENTRIES (Asientos Contables)
CREATE TABLE journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,           -- Numero correlativo: JE-0001
    date            DATE NOT NULL,
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'draft',    -- draft, posted, reversed, cancelled
    entry_type      VARCHAR(50) DEFAULT 'manual',   -- manual, auto_invoice, auto_payment, auto_closing
    source_ref      VARCHAR(100),                   -- Referencia al origen (ej: invoice UUID)
    source_type     VARCHAR(50),                    -- Tipo de origen: invoice, payment, adjustment
    total_debit     DECIMAL(18, 2) DEFAULT 0,       -- Total debitos (calculado)
    total_credit    DECIMAL(18, 2) DEFAULT 0,       -- Total creditos (calculado)
    posted_by       UUID REFERENCES users(id),
    posted_at       TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, number)
);

CREATE INDEX idx_je_tenant ON journal_entries(tenant_id);
CREATE INDEX idx_je_date ON journal_entries(tenant_id, date);
CREATE INDEX idx_je_status ON journal_entries(tenant_id, status);
CREATE INDEX idx_je_type ON journal_entries(tenant_id, entry_type);

-- 5. JOURNAL LINES (Lineas de Asiento - Partida Doble)
CREATE TABLE journal_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    line_number     INTEGER NOT NULL,
    account_id      UUID NOT NULL REFERENCES accounts(id),
    debit           DECIMAL(18, 2) DEFAULT 0,
    credit          DECIMAL(18, 2) DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX idx_jl_tenant ON journal_lines(tenant_id);
CREATE INDEX idx_jl_account ON journal_lines(account_id);

-- 6. ACCOUNTING PERIODS (Periodos Contables)
CREATE TABLE accounting_periods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    status          VARCHAR(20) DEFAULT 'open',     -- open, closed, adjusting
    opening_date    DATE,
    closing_date    DATE,
    closed_by       UUID REFERENCES users(id),
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, year, month)
);

-- 7. CUSTOMERS (Clientes)
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    cuit_dni        VARCHAR(20),
    email           VARCHAR(300),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    iva_condition   VARCHAR(50),                    -- responsable_inscripto, monotributo, exento, consumidor_final
    notes           TEXT,
    credit_limit    DECIMAL(18, 2) DEFAULT 0,
    current_balance DECIMAL(18, 2) DEFAULT 0,       -- Saldo deudor
    tags            JSONB DEFAULT '[]',
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_name ON customers(tenant_id, name);
CREATE INDEX idx_customers_cuit ON customers(tenant_id, cuit_dni) WHERE cuit_dni IS NOT NULL;

-- 8. SUPPLIERS (Proveedores)
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    cuit            VARCHAR(20),
    email           VARCHAR(300),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    iva_condition   VARCHAR(50),
    notes           TEXT,
    current_balance DECIMAL(18, 2) DEFAULT 0,       -- Saldo acreedor
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_name ON suppliers(tenant_id, name);

-- 9. PRODUCTS / SERVICES
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code            VARCHAR(50),
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    unit_type       VARCHAR(20) DEFAULT 'unit',      -- unit, hour, service, kit
    unit_price      DECIMAL(18, 2) NOT NULL DEFAULT 0,
    cost            DECIMAL(18, 2) DEFAULT 0,
    vat_rate        DECIMAL(5, 2) DEFAULT 21.00,     -- IVA: 21%, 10.5%, 27%, 0%
    vat_type        VARCHAR(50) DEFAULT 'gravado',   -- gravado, exento, no_gravado
    revenue_account UUID REFERENCES accounts(id),    -- Cuenta de ingreso
    cost_account    UUID REFERENCES accounts(id),    -- Cuenta de costo
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code) WHERE code IS NOT NULL
);

CREATE INDEX idx_products_tenant ON products(tenant_id);

-- 10. INVOICES (Facturas)
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_type    VARCHAR(10) NOT NULL,            -- A, B, C, M, NC_A, NC_B, NC_C
    number          VARCHAR(50) NOT NULL,
    pos_number      INTEGER,                          -- Punto de venta AFIP
    cae             VARCHAR(50),                      -- Codigo de Autorizacion Electronica
    cae_expiration  DATE,
    customer_id     UUID REFERENCES customers(id),
    date            DATE NOT NULL,
    due_date        DATE,
    subtotal        DECIMAL(18, 2) DEFAULT 0,
    vat_21          DECIMAL(18, 2) DEFAULT 0,
    vat_105         DECIMAL(18, 2) DEFAULT 0,
    vat_27          DECIMAL(18, 2) DEFAULT 0,
    vat_exempt      DECIMAL(18, 2) DEFAULT 0,
    vat_other       DECIMAL(18, 2) DEFAULT 0,
    total           DECIMAL(18, 2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'draft',    -- draft, sent, paid, cancelled, overdue
    currency        VARCHAR(10) DEFAULT 'ARS',
    exchange_rate   DECIMAL(10, 4) DEFAULT 1,
    notes           TEXT,
    payment_status  VARCHAR(20) DEFAULT 'pending',  -- pending, partial, paid
    paid_amount     DECIMAL(18, 2) DEFAULT 0,
    afip_result     JSONB,                           -- Resultado de envio a AFIP
    je_generated    BOOLEAN DEFAULT FALSE,           -- Se genero el asiento contable?
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, invoice_type, pos_number, number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_date ON invoices(tenant_id, date);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);

-- 11. INVOICE ITEMS (Items de Factura)
CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    line_number     INTEGER NOT NULL,
    product_id      UUID REFERENCES products(id),
    description     VARCHAR(500) NOT NULL,
    quantity        DECIMAL(18, 4) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(18, 2) NOT NULL,
    subtotal        DECIMAL(18, 2) NOT NULL,
    vat_rate        DECIMAL(5, 2) DEFAULT 21.00,
    vat_type        VARCHAR(50) DEFAULT 'gravado',
    vat_amount      DECIMAL(18, 2) DEFAULT 0,
    discount_pct    DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(18, 2) DEFAULT 0
);

CREATE INDEX idx_inv_items_invoice ON invoice_items(invoice_id);

-- 12. BANK ACCOUNTS (Cuentas Bancarias)
CREATE TABLE bank_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    bank_name       VARCHAR(200),
    account_number  VARCHAR(50) NOT NULL,
    account_type    VARCHAR(20),                     -- checking, savings, credit
    currency        VARCHAR(10) DEFAULT 'ARS',
    cbu             VARCHAR(30),
    alias           VARCHAR(30),
    balance         DECIMAL(18, 2) DEFAULT 0,
    chart_account_id UUID REFERENCES accounts(id),   -- Cuenta contable asociada
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_acc_tenant ON bank_accounts(tenant_id);

-- 13. BANK MOVEMENTS (Movimientos Bancarios)
CREATE TABLE bank_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    type            VARCHAR(20) NOT NULL,            -- credit, debit
    amount          DECIMAL(18, 2) NOT NULL,
    description     TEXT,
    reference       VARCHAR(100),
    category        VARCHAR(50),
    reconciled      BOOLEAN DEFAULT FALSE,
    reconciled_at   TIMESTAMPTZ,
    je_generated    BOOLEAN DEFAULT FALSE,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_mov_account ON bank_movements(bank_account_id);
CREATE INDEX idx_bank_mov_tenant ON bank_movements(tenant_id);
CREATE INDEX idx_bank_mov_date ON bank_movements(tenant_id, date);
CREATE INDEX idx_bank_mov_reconciled ON bank_movements(reconciled) WHERE reconciled = FALSE;

-- 14. PAYMENTS (Cobros/Pagos)
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_type    VARCHAR(20) NOT NULL,            -- receivable (cobro), payable (pago)
    customer_id     UUID REFERENCES customers(id),
    supplier_id     UUID REFERENCES suppliers(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    amount          DECIMAL(18, 2) NOT NULL,
    date            DATE NOT NULL,
    method          VARCHAR(30),                     -- cash, transfer, check, card, other
    reference       VARCHAR(100),
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'confirmed',-- pending, confirmed, cancelled
    applied_amount  DECIMAL(18, 2) DEFAULT 0,
    je_generated    BOOLEAN DEFAULT FALSE,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (
        (payment_type = 'receivable' AND customer_id IS NOT NULL AND supplier_id IS NULL) OR
        (payment_type = 'payable' AND supplier_id IS NOT NULL AND customer_id IS NULL)
    )
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_customer ON payments(tenant_id, customer_id);
CREATE INDEX idx_payments_date ON payments(tenant_id, date);

-- 15. PAYMENT ALLOCATIONS (Aplicaciones de Pago)
CREATE TABLE payment_allocations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount          DECIMAL(18, 2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (amount > 0)
);

CREATE INDEX idx_pay_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_pay_alloc_invoice ON payment_allocations(invoice_id);

-- 16. TAX CONFIGURATIONS (Configuracion de Impuestos)
CREATE TABLE tax_configurations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tax_type        VARCHAR(50) NOT NULL,            -- iva, iibb, ganancias, gross_income, municipal
    tax_name        VARCHAR(100) NOT NULL,
    rate            DECIMAL(5, 2) DEFAULT 0,
    category        VARCHAR(50),
    account_id      UUID REFERENCES accounts(id),    -- Cuenta contable del impuesto
    jurisdiction   VARCHAR(100),                     -- Jurisdiccion fiscal
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TAX DECLARATIONS (Declaraciones Juradas)
CREATE TABLE tax_declarations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tax_config_id   UUID REFERENCES tax_configurations(id),
    period_year     INTEGER NOT NULL,
    period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    taxable_base    DECIMAL(18, 2) DEFAULT 0,
    tax_amount      DECIMAL(18, 2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'draft',    -- draft, filed, paid
    filed_date      DATE,
    payment_date    DATE,
    filing_number   VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDITORIA
-- ============================================================

-- 18. AUDIT LOGS (Registro de Cambios)
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    user_id         UUID,
    entity_type     VARCHAR(100) NOT NULL,           -- invoice, journal_entry, account, etc.
    entity_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL,            -- create, update, delete, post, reverse
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(50),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Partition sugerida para produccion (por fecha):
-- CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- ============================================================
-- AI / AUTOMATIZACION
-- ============================================================

-- 19. AI CLASSIFICATIONS (Clasificaciones automaticas por IA)
CREATE TABLE ai_classifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     VARCHAR(100) NOT NULL,           -- invoice_item, bank_movement, journal_line
    entity_id       UUID NOT NULL,
    suggested_category VARCHAR(200),
    suggested_account_id UUID REFERENCES accounts(id),
    confidence      DECIMAL(5, 4),                   -- 0.0000 a 1.0000
    model_version   VARCHAR(50),
    applied         BOOLEAN DEFAULT FALSE,
    reviewed_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ALERTS (Alertas Inteligentes)
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type      VARCHAR(50) NOT NULL,            -- cash_flow_negative, overdue_invoice, tax_due, credit_limit
    severity        VARCHAR(20) DEFAULT 'info',      -- info, warning, critical
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    entity_type     VARCHAR(100),
    entity_id       UUID,
    action_required BOOLEAN DEFAULT FALSE,
    dismissed       BOOLEAN DEFAULT FALSE,
    dismissed_by    UUID REFERENCES users(id),
    dismissed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_active ON alerts(tenant_id, dismissed) WHERE dismissed = FALSE;
CREATE INDEX idx_alerts_type ON alerts(tenant_id, alert_type);

-- 21. CASH FLOW PREDICTIONS (Predicciones de Flujo de Caja)
CREATE TABLE cash_flow_predictions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    predicted_inflow  DECIMAL(18, 2) DEFAULT 0,
    predicted_outflow DECIMAL(18, 2) DEFAULT 0,
    predicted_balance DECIMAL(18, 2) DEFAULT 0,
    confidence      DECIMAL(5, 4),
    model_version   VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, prediction_date)
);

-- ============================================================
-- VISTAS UTILES
-- ============================================================

-- Balance de comprobacion (Sumas y Saldos)
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT 
    a.id AS account_id,
    a.tenant_id,
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(jl.debit), 0) AS total_debit,
    COALESCE(SUM(jl.credit), 0) AS total_credit,
    a.current_balance + COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) AS new_balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.entry_id AND je.status = 'posted'
WHERE a.active = TRUE
GROUP BY a.id, a.tenant_id, a.code, a.name, a.account_type, a.current_balance;

-- Flujo de caja consolidado
CREATE OR REPLACE VIEW v_cash_flow AS
SELECT 
    bm.tenant_id,
    ba.name AS bank_account,
    bm.date,
    SUM(CASE WHEN bm.type = 'credit' THEN bm.amount ELSE 0 END) AS inflow,
    SUM(CASE WHEN bm.type = 'debit' THEN bm.amount ELSE 0 END) AS outflow,
    SUM(CASE WHEN bm.type = 'credit' THEN bm.amount ELSE -bm.amount END) AS net
FROM bank_movements bm
JOIN bank_accounts ba ON ba.id = bm.bank_account_id
WHERE bm.reconciled = TRUE
GROUP BY bm.tenant_id, ba.name, bm.date;

-- Estado de cuentas por cliente
CREATE OR REPLACE VIEW v_customer_aging AS
SELECT 
    i.tenant_id,
    i.customer_id,
    c.name AS customer_name,
    COUNT(DISTINCT i.id) AS total_invoices,
    SUM(i.total) AS total_invoiced,
    SUM(i.paid_amount) AS total_paid,
    SUM(i.total) - SUM(i.paid_amount) AS outstanding_balance,
    SUM(CASE WHEN i.status = 'overdue' THEN i.total - i.paid_amount ELSE 0 END) AS overdue_amount
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.status NOT IN ('cancelled', 'draft')
GROUP BY i.tenant_id, i.customer_id, c.name;

-- ============================================================
-- TRIGGERS DE INTEGRIDAD CONTABLE
-- ============================================================

-- Validacion de partida doble: sum(debit) = sum(credit) al postear
CREATE OR REPLACE FUNCTION fn_validate_double_entry()
RETURNS TRIGGER AS $$
DECLARE
    total_debit DECIMAL(18,2);
    total_credit DECIMAL(18,2);
BEGIN
    IF NEW.status = 'posted' AND OLD.status IS DISTINCT FROM 'posted' THEN
        SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
        INTO total_debit, total_credit
        FROM journal_lines WHERE entry_id = NEW.id;
        
        IF ABS(total_debit - total_credit) > 0.01 THEN
            RAISE EXCEPTION 'Partida doble invalida: debitos (%) != creditos (%)', total_debit, total_credit;
        END IF;
        
        -- Actualizar totales del asiento
        NEW.total_debit := total_debit;
        NEW.total_credit := total_credit;
        NEW.posted_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_double_entry
BEFORE UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION fn_validate_double_entry();

-- Actualizar saldo de cuenta al postear asiento
CREATE OR REPLACE FUNCTION fn_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts 
        SET current_balance = current_balance + NEW.debit - NEW.credit,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE accounts 
        SET current_balance = current_balance + NEW.debit - NEW.credit - OLD.debit + OLD.credit,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts 
        SET current_balance = current_balance - OLD.debit + OLD.credit,
            updated_at = NOW()
        WHERE id = OLD.account_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Nota: Este trigger debe activarse SOLO cuando el journal_entry esta en estado 'posted'
-- Se recomienda manejar esta logica desde la aplicacion (.NET) via Accounting Facade

-- ============================================================
-- POLITICAS DE SEGURIDAD (Row-Level Security)
-- ============================================================

-- Habilitar RLS para todas las tablas tenant-scoped
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Politica basica de aislamiento por tenant
-- Nota: La aplicacion debe setear app.current_tenant_id antes de cada query
-- CREATE POLICY tenant_isolation ON accounts USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- DATOS INICIALES (Seed Data)
-- ============================================================

-- Plan de cuentas estandar argentino (basico)
-- INSERT INTO accounts (tenant_id, code, name, account_type, account_subtype) VALUES
-- (DEFAULT, '1', 'ACTIVO', 'asset', NULL),
-- (DEFAULT, '1.1', 'ACTIVO CORRIENTE', 'asset', 'current'),
-- (DEFAULT, '1.1.1', 'Caja', 'asset', 'cash'),
-- (DEFAULT, '1.1.2', 'Bancos', 'asset', 'bank'),
-- (DEFAULT, '1.1.3', 'Clientes', 'asset', 'customer'),
-- (DEFAULT, '1.1.4', 'IVA Credito Fiscal', 'asset', 'vat_credit'),
-- (DEFAULT, '1.2', 'ACTIVO NO CORRIENTE', 'asset', 'non_current'),
-- (DEFAULT, '2', 'PASIVO', 'liability', NULL),
-- (DEFAULT, '2.1', 'PASIVO CORRIENTE', 'liability', 'current'),
-- (DEFAULT, '2.1.1', 'Proveedores', 'liability', 'supplier'),
-- (DEFAULT, '2.1.2', 'IVA Debito Fiscal', 'liability', 'vat_debit'),
-- (DEFAULT, '3', 'PATRIMONIO NETO', 'equity', NULL),
-- (DEFAULT, '3.1', 'Capital', 'equity', 'capital'),
-- (DEFAULT, '3.2', 'Resultados Acumulados', 'equity', 'retained_earnings'),
-- (DEFAULT, '4', 'INGRESOS', 'income', NULL),
-- (DEFAULT, '4.1', 'Ventas', 'income', 'sales'),
-- (DEFAULT, '5', 'GASTOS', 'expense', NULL),
-- (DEFAULT, '5.1', 'Gastos Administrativos', 'expense', 'admin'),
-- (DEFAULT, '5.2', 'Gastos Comerciales', 'expense', 'commercial');
