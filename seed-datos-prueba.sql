-- ============================================================
-- ContaFlow ERP - Datos de Prueba
-- ============================================================

DELETE FROM "AuditLog" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "JournalEntryLine" WHERE "journalEntryId" IN (SELECT id FROM "JournalEntry" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b');
DELETE FROM "JournalEntry" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "Payment" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b');
DELETE FROM "Invoice" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "BankAccount" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "Provider" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "Client" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';
DELETE FROM "Account" WHERE "companyId" = 'cmo0p45e00000lq01dnyoaj4b';

-- 1. PLAN DE CUENTAS
INSERT INTO "Account" (id, code, name, type, subtype, "parentId", level, balance, "companyId") VALUES
('act_001', '1.1.1', 'Caja', 'activo', 'corriente', NULL, 1, 125000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_002', '1.1.2', 'Banco Nacion Cta. Cte.', 'activo', 'corriente', NULL, 1, 1850000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_003', '1.1.3', 'Banco Provincia Cta. Cte.', 'activo', 'corriente', NULL, 1, 980000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_004', '1.2.1', 'Clientes', 'activo', 'corriente', NULL, 1, 620000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_005', '1.2.2', 'Deudores Varios', 'activo', 'corriente', NULL, 1, 0.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_006', '1.3.1', 'Mercaderias', 'activo', 'corriente', NULL, 1, 950000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_007', '1.3.2', 'Materias Primas', 'activo', 'corriente', NULL, 1, 380000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_008', '1.4.1', 'IVA Credito Fiscal', 'activo', 'corriente', NULL, 1, 156750.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_009', '1.5.1', 'Muebles y Utiles', 'activo', 'no_corriente', NULL, 1, 320000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_010', '1.5.2', 'Equipos de Computacion', 'activo', 'no_corriente', NULL, 1, 480000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_011', '1.5.3', 'Rodados', 'activo', 'no_corriente', NULL, 1, 1500000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_012', '1.6.1', 'Depreciacion Acumulada Muebles', 'activo', 'no_corriente', NULL, 1, -64000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_013', '1.6.2', 'Depreciacion Acumulada Equipos', 'activo', 'no_corriente', NULL, 1, -96000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('act_014', '1.6.3', 'Depreciacion Acumulada Rodados', 'activo', 'no_corriente', NULL, 1, -300000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_001', '2.1.1', 'Proveedores', 'pasivo', 'corriente', NULL, 1, -410000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_002', '2.1.2', 'Acreedores Varios', 'pasivo', 'corriente', NULL, 1, 0.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_003', '2.1.3', 'Sueldos a Pagar', 'pasivo', 'corriente', NULL, 1, -285000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_004', '2.1.4', 'Cargas Sociales a Pagar', 'pasivo', 'corriente', NULL, 1, -95000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_005', '2.1.5', 'IVA Debito Fiscal', 'pasivo', 'corriente', NULL, 1, -189000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_006', '2.1.6', 'Impuesto a las Ganancias', 'pasivo', 'corriente', NULL, 1, -65000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pas_007', '2.2.1', 'Prestamos Bancarios', 'pasivo', 'no_corriente', NULL, 1, -800000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pat_001', '3.1.1', 'Capital Social', 'patrimonio', NULL, NULL, 1, 5000000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pat_002', '3.2.1', 'Reserva Legal', 'patrimonio', NULL, NULL, 1, 250000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pat_003', '3.3.1', 'Resultado del Ejercicio', 'patrimonio', NULL, NULL, 1, 2745750.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_001', '5.1.1', 'Compras de Mercaderias', 'gasto', NULL, NULL, 1, -1800000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_002', '5.1.2', 'Costo Mercaderia Vendida', 'gasto', NULL, NULL, 1, -1420000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_003', '5.2.1', 'Sueldos y Jornales', 'gasto', NULL, NULL, 1, -850000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_004', '5.2.2', 'Cargas Sociales', 'gasto', NULL, NULL, 1, -285000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_005', '5.3.1', 'Alquileres', 'gasto', NULL, NULL, 1, -180000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_006', '5.3.2', 'Servicios Publicos', 'gasto', NULL, NULL, 1, -45000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_007', '5.3.3', 'Seguros', 'gasto', NULL, NULL, 1, -36000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_008', '5.4.1', 'Depreciacion Muebles', 'gasto', NULL, NULL, 1, -64000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_009', '5.4.2', 'Depreciacion Equipos', 'gasto', NULL, NULL, 1, -96000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_010', '5.4.3', 'Depreciacion Rodados', 'gasto', NULL, NULL, 1, -300000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_011', '5.5.1', 'Gastos Bancarios', 'gasto', NULL, NULL, 1, -12000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('gas_012', '5.5.2', 'Gastos Varios', 'gasto', NULL, NULL, 1, -28000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('ing_001', '4.1.1', 'Ventas de Mercaderias', 'ingreso', NULL, NULL, 1, 4520000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('ing_002', '4.2.1', 'Servicios de Consultoria', 'ingreso', NULL, NULL, 1, 850000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('ing_003', '4.3.1', 'Intereses Ganados', 'ingreso', NULL, NULL, 1, 35000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('ing_004', '4.3.2', 'Descuentos Obtenidos', 'ingreso', NULL, NULL, 1, 8750.00, 'cmo0p45e00000lq01dnyoaj4b');

-- 2. CLIENTES
INSERT INTO "Client" (id, code, name, cuit, email, phone, address, city, province, notes, balance, "companyId") VALUES
('cli_001', 'CLI-001', 'Garcia y Asociados S.A.', '30-71234567-8', 'contacto@garciasa.com.ar', '011-4567-8901', 'Av. Corrientes 1234, Piso 8', 'CABA', 'Buenos Aires', 'Cliente corporativo desde 2023', 350000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('cli_002', 'CLI-002', 'Lopez Comercial S.R.L.', '30-82345678-9', 'info@lopezcomercial.com', '011-5555-1234', 'Av. Rivadavia 5678', 'CABA', 'Buenos Aires', 'Compra mensual de mercaderia', 120000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('cli_003', 'CLI-003', 'Martinez Industrias', '30-93456789-0', 'ventas@martinezind.com.ar', '0351-444-5566', 'Bv. Illia 234, Parque Industrial', 'Cordoba', 'Cordoba', 'Cliente del interior', 0.00, 'cmo0p45e00000lq01dnyoaj4b'),
('cli_004', 'CLI-004', 'Rodriguez Constructora', '20-12345678-1', 'admin@rodriguezconst.com', '0221-433-2211', 'Calle 12 Nro 567', 'La Plata', 'Buenos Aires', 'Obras en curso', 150000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('cli_005', 'CLI-005', 'Fernandez Servicios Profesionales', '23-23456789-0', 'maria@fernandezsp.com', '011-6677-8899', 'Av. Santa Fe 3210, Of. 5', 'CABA', 'Buenos Aires', 'Monotributista - Factura C', 0.00, 'cmo0p45e00000lq01dnyoaj4b');

-- 3. PROVEEDORES
INSERT INTO "Provider" (id, code, name, cuit, email, phone, address, city, province, notes, balance, "companyId") VALUES
('pro_001', 'PRO-001', 'Distribuidora Nacional S.A.', '30-11112222-3', 'ventas@distnacional.com', '011-4000-1111', 'Autopista Ricchieri Km 15', 'Lomas de Zamora', 'Buenos Aires', 'Distribuidor mayorista principal', 180000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pro_002', 'PRO-002', 'Tech Solutions S.R.L.', '30-22223333-4', 'soporte@techsolutions.com', '011-5000-2222', 'Av. Independencia 1500', 'CABA', 'Buenos Aires', 'Equipamiento informatico', 95000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pro_003', 'PRO-003', 'Papelera del Sur', '30-33334444-5', 'pedidos@papelerasur.com', '0223-488-3300', 'Calle 50 Nro 890', 'Mar del Plata', 'Buenos Aires', 'Insumos de oficina', 45000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pro_004', 'PRO-004', 'Transportes Ruta S.A.', '30-44445555-6', 'despacho@transportesruta.com', '011-6000-4444', 'Darsena Sur, Puerto Nuevo', 'CABA', 'Buenos Aires', 'Logistica y fletes', 90000.00, 'cmo0p45e00000lq01dnyoaj4b'),
('pro_005', 'PRO-005', 'Seguros La Boca Cia.', '30-55556666-7', 'polizas@seguroslaboca.com', '011-4361-5500', 'Av. Pedro de Mendoza 2500', 'CABA', 'Buenos Aires', 'Aseguradora', 0.00, 'cmo0p45e00000lq01dnyoaj4b');

-- 4. CUENTAS BANCARIAS
INSERT INTO "BankAccount" (id, name, bank, number, type, balance, currency, "companyId") VALUES
('ban_001', 'Banco Nacion', 'Banco Nacion Argentina', '00000345-6', 'cta_corriente', 1850000.00, 'ARS', 'cmo0p45e00000lq01dnyoaj4b'),
('ban_002', 'Banco Provincia', 'Banco de la Provincia de Buenos Aires', '00000789-0', 'cta_corriente', 980000.00, 'ARS', 'cmo0p45e00000lq01dnyoaj4b');

-- 5. FACTURAS DE VENTA
INSERT INTO "Invoice" (id, number, type, date, "dueDate", total, tax, "netTotal", "amountPaid", status, notes, "clientId", "companyId") VALUES
('inv_001', 'FEA-0001', 'factura_a', '2026-03-15 10:00:00', '2026-04-15 00:00:00', 363000.00, 63000.00, 300000.00, 363000.00, 'pagada', 'Factura venta mensual Marzo 2026', 'cli_001', 'cmo0p45e00000lq01dnyoaj4b'),
('inv_002', 'FEB-0002', 'factura_b', '2026-03-20 14:30:00', '2026-04-20 00:00:00', 484000.00, 84000.00, 400000.00, 242000.00, 'parcial', 'Venta de mercaderia variada', 'cli_002', 'cmo0p45e00000lq01dnyoaj4b'),
('inv_003', 'FEA-0003', 'factura_a', '2026-04-01 09:15:00', '2026-05-01 00:00:00', 181500.00, 31500.00, 150000.00, 0.00, 'pendiente', 'Materiales para obra Avellaneda', 'cli_004', 'cmo0p45e00000lq01dnyoaj4b'),
('inv_004', 'FEC-0001', 'factura_c', '2026-04-05 11:00:00', '2026-04-05 00:00:00', 85000.00, 0.00, 85000.00, 85000.00, 'pagada', 'Asesoria impositiva abril', 'cli_005', 'cmo0p45e00000lq01dnyoaj4b'),
('inv_005', 'FEB-0003', 'factura_b', '2026-04-10 16:45:00', '2026-05-10 00:00:00', 242000.00, 42000.00, 200000.00, 0.00, 'pendiente', 'Equipos seguridad industrial', 'cli_003', 'cmo0p45e00000lq01dnyoaj4b'),
('inv_006', 'FCA-0001', 'factura_a', '2026-03-10 08:00:00', '2026-04-10 00:00:00', 363000.00, 63000.00, 300000.00, 180000.00, 'parcial', 'Compra mercaderia reventa Marzo', NULL, 'cmo0p45e00000lq01dnyoaj4b'),
('inv_007', 'FCA-0002', 'factura_a', '2026-03-25 11:30:00', '2026-04-25 00:00:00', 121000.00, 21000.00, 100000.00, 0.00, 'pendiente', '5 notebooks Lenovo ThinkPad', NULL, 'cmo0p45e00000lq01dnyoaj4b');

-- 6. ITEMS DE FACTURA
INSERT INTO "InvoiceItem" (id, description, quantity, "unitPrice", subtotal, "taxRate", "taxAmount", "invoiceId") VALUES
('iti_001a', 'Servicio de consultoria contable - Marzo', 1, 200000.00, 200000.00, 21.00, 42000.00, 'inv_001'),
('iti_001b', 'Auditoria trimestral', 1, 100000.00, 100000.00, 21.00, 21000.00, 'inv_001'),
('iti_002a', 'Repuestos industriales x100', 100, 2500.00, 250000.00, 21.00, 52500.00, 'inv_002'),
('iti_002b', 'Herramientas mecanicas x50', 50, 3000.00, 150000.00, 21.00, 31500.00, 'inv_002'),
('iti_003a', 'Cemento Portland x200 bolsas', 200, 750.00, 150000.00, 21.00, 31500.00, 'inv_003'),
('iti_004a', 'Asesoria impositiva mensual', 1, 85000.00, 85000.00, 0.00, 0.00, 'inv_004'),
('iti_005a', 'Casco de seguridad x200', 200, 500.00, 100000.00, 21.00, 21000.00, 'inv_005'),
('iti_005b', 'Guantes de trabajo x500 pares', 500, 200.00, 100000.00, 21.00, 21000.00, 'inv_005'),
('iti_006a', 'Mercaderia tipo A x500 uds', 500, 400.00, 200000.00, 21.00, 42000.00, 'inv_006'),
('iti_006b', 'Mercaderia tipo B x250 uds', 250, 400.00, 100000.00, 21.00, 21000.00, 'inv_006'),
('iti_007a', 'Notebook Lenovo ThinkPad T14', 5, 20000.00, 100000.00, 21.00, 21000.00, 'inv_007');

-- 7. PAGOS
INSERT INTO "Payment" (id, number, date, amount, method, reference, type, notes, "invoiceId", "clientId", "providerId", "bankAccountId", "companyId") VALUES
('pag_001', 'REC-001', '2026-03-20 14:00:00', 363000.00, 'transferencia', 'TRF-2026-0001', 'cobro', 'Transferencia recibida Garcia', 'inv_001', 'cli_001', NULL, 'ban_001', 'cmo0p45e00000lq01dnyoaj4b'),
('pag_002', 'REC-002', '2026-04-01 10:00:00', 242000.00, 'transferencia', 'TRF-2026-0002', 'cobro', 'Pago parcial Lopez', 'inv_002', 'cli_002', NULL, 'ban_001', 'cmo0p45e00000lq01dnyoaj4b'),
('pag_003', 'REC-003', '2026-04-05 11:30:00', 85000.00, 'efectivo', 'REC-2026-0003', 'cobro', 'Pago efectivo Fernandez', 'inv_004', 'cli_005', NULL, NULL, 'cmo0p45e00000lq01dnyoaj4b'),
('pag_004', 'PAG-001', '2026-04-01 09:00:00', 180000.00, 'transferencia', 'TRF-2026-0004', 'pago', 'Pago parcial Distribuidora', 'inv_006', NULL, 'pro_001', 'ban_002', 'cmo0p45e00000lq01dnyoaj4b'),
('pag_005', 'PAG-002', '2026-04-01 00:00:00', 180000.00, 'transferencia', 'TRF-2026-0005', 'pago', 'Alquiler oficina Abril', NULL, NULL, NULL, 'ban_002', 'cmo0p45e00000lq01dnyoaj4b');

-- 8. ASIENTOS CONTABLES
INSERT INTO "JournalEntry" (id, number, date, description, concept, status, "companyId", "totalDebit", "totalCredit") VALUES
('aje_001', 1, '2026-01-01 00:00:00', 'Asiento de Apertura del Ejercicio 2026', 'apertura', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 5375000.00, 5375000.00),
('aje_002', 2, '2026-03-15 10:00:00', 'Factura A FEA-0001 - Garcia y Asociados', 'venta', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 363000.00, 363000.00),
('aje_003', 3, '2026-03-20 14:00:00', 'Cobro factura Garcia - Transferencia', 'cobro', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 363000.00, 363000.00),
('aje_004', 4, '2026-03-20 14:30:00', 'Factura B FEB-0002 - Lopez Comercial', 'venta', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 484000.00, 484000.00),
('aje_005', 5, '2026-03-10 08:00:00', 'Compra FCA-0001 - Distribuidora Nacional', 'compra', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 363000.00, 363000.00),
('aje_006', 6, '2026-04-01 09:00:00', 'Pago parcial Distribuidora Nacional', 'pago', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 180000.00, 180000.00),
('aje_007', 7, '2026-04-01 10:00:00', 'Cobro parcial Lopez Comercial', 'cobro', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 242000.00, 242000.00),
('aje_008', 8, '2026-04-01 00:00:00', 'Pago alquiler oficina Abril 2026', 'gasto', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 180000.00, 180000.00),
('aje_009', 9, '2026-03-31 00:00:00', 'Liquidacion sueldos Marzo 2026', 'sueldos', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 285000.00, 285000.00),
('aje_010', 10, '2026-04-05 11:30:00', 'Cobro efectivo Fernandez Servicios', 'cobro', 'confirmado', 'cmo0p45e00000lq01dnyoaj4b', 85000.00, 85000.00);

INSERT INTO "JournalEntryLine" (id, "journalEntryId", "accountId", debit, credit, description) VALUES
('jal_001a', 'aje_001', 'act_001', 125000.00, 0.00, 'Caja inicial'),
('jal_001b', 'aje_001', 'act_002', 1850000.00, 0.00, 'Saldo Banco Nacion'),
('jal_001c', 'aje_001', 'act_003', 980000.00, 0.00, 'Saldo Banco Provincia'),
('jal_001d', 'aje_001', 'act_006', 950000.00, 0.00, 'Stock mercaderias'),
('jal_001e', 'aje_001', 'act_007', 380000.00, 0.00, 'Materias primas'),
('jal_001f', 'aje_001', 'act_009', 320000.00, 0.00, 'Muebles y utiles'),
('jal_001g', 'aje_001', 'act_010', 480000.00, 0.00, 'Equipos computacion'),
('jal_001h', 'aje_001', 'act_011', 1500000.00, 0.00, 'Rodado vehiculo'),
('jal_001i', 'aje_001', 'act_012', 0.00, 64000.00, 'Deprec acum muebles'),
('jal_001j', 'aje_001', 'act_013', 0.00, 96000.00, 'Deprec acum equipos'),
('jal_001k', 'aje_001', 'act_014', 0.00, 300000.00, 'Deprec acum rodados'),
('jal_001l', 'aje_001', 'pas_001', 0.00, 410000.00, 'Deuda proveedores'),
('jal_001m', 'aje_001', 'pas_003', 0.00, 285000.00, 'Sueldos a pagar'),
('jal_001n', 'aje_001', 'pas_004', 0.00, 95000.00, 'Cargas sociales a pagar'),
('jal_001o', 'aje_001', 'pas_007', 0.00, 800000.00, 'Prestamo bancario'),
('jal_001p', 'aje_001', 'pat_001', 0.00, 5000000.00, 'Capital social'),
('jal_002a', 'aje_002', 'act_004', 363000.00, 0.00, 'Clientes Garcia'),
('jal_002b', 'aje_002', 'ing_001', 0.00, 300000.00, 'Ventas gravadas'),
('jal_002c', 'aje_002', 'pas_005', 0.00, 63000.00, 'IVA debito fiscal'),
('jal_003a', 'aje_003', 'act_002', 363000.00, 0.00, 'Banco Nacion - cobro'),
('jal_003b', 'aje_003', 'act_004', 0.00, 363000.00, 'Clientes Garcia saldado'),
('jal_004a', 'aje_004', 'act_004', 484000.00, 0.00, 'Clientes Lopez'),
('jal_004b', 'aje_004', 'ing_001', 0.00, 400000.00, 'Ventas gravadas'),
('jal_004c', 'aje_004', 'pas_005', 0.00, 84000.00, 'IVA debito fiscal'),
('jal_005a', 'aje_005', 'gas_001', 300000.00, 0.00, 'Compras mercaderias'),
('jal_005b', 'aje_005', 'act_008', 63000.00, 0.00, 'IVA credito fiscal'),
('jal_005c', 'aje_005', 'pas_001', 0.00, 363000.00, 'Proveedores Distribuidora'),
('jal_006a', 'aje_006', 'pas_001', 180000.00, 0.00, 'Proveedores parcial'),
('jal_006b', 'aje_006', 'act_003', 0.00, 180000.00, 'Banco Prov transferencia'),
('jal_007a', 'aje_007', 'act_002', 242000.00, 0.00, 'Banco Nacion cobro'),
('jal_007b', 'aje_007', 'act_004', 0.00, 242000.00, 'Clientes Lopez parcial'),
('jal_008a', 'aje_008', 'gas_005', 180000.00, 0.00, 'Alquiler del mes'),
('jal_008b', 'aje_008', 'act_003', 0.00, 180000.00, 'Banco Prov alquiler'),
('jal_009a', 'aje_009', 'gas_003', 285000.00, 0.00, 'Sueldos personal'),
('jal_009b', 'aje_009', 'pas_003', 0.00, 285000.00, 'Remuneraciones pagar'),
('jal_010a', 'aje_010', 'act_001', 85000.00, 0.00, 'Caja efectivo'),
('jal_010b', 'aje_010', 'ing_002', 0.00, 85000.00, 'Ingresos consultoria');

-- 9. AUDIT LOG
INSERT INTO "AuditLog" (id, "userId", "userName", action, entity, "entityId", details, "companyId") VALUES
('aud_001', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'login', 'Auth', NULL, 'Inicio de sesion exitoso', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_002', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'Invoice', 'inv_001', 'Factura A FEA-0001 creada', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_003', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'Invoice', 'inv_002', 'Factura B FEB-0002 creada', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_004', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'Payment', 'pag_001', 'Cobro REC-001 recibido', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_005', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'JournalEntry', 'aje_002', 'Asiento Nro 2 - Venta Garcia', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_006', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'JournalEntry', 'aje_003', 'Asiento Nro 3 - Cobro Garcia', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_007', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'JournalEntry', 'aje_004', 'Asiento Nro 4 - Venta Lopez', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_008', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'JournalEntry', 'aje_005', 'Asiento Nro 5 - Compra Distribuidora', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_009', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'Payment', 'pag_004', 'Pago PAG-001 a Distribuidora', 'cmo0p45e00000lq01dnyoaj4b'),
('aud_010', 'cmo0p45e00000lq01dnyoaj4', 'Admin Demo', 'create', 'JournalEntry', 'aje_006', 'Asiento Nro 6 - Pago Distribuidora', 'cmo0p45e00000lq01dnyoaj4b');
