import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting ERP seed...')

  // ============================================================
  // 1. DEFAULT COMPANY
  // ============================================================
  console.log('📦 Creating demo company...')
  const company = await prisma.company.create({
    data: {
      name: 'Empresa Demo S.R.L.',
      cuit: '30-12345678-9',
      email: 'admin@empresademo.com.ar',
      phone: '+54 11 4567-8900',
      address: 'Av. Corrientes 1234, CABA',
      plan: 'pro',
    },
  })
  console.log(`  ✓ Company created: ${company.name} (${company.id})`)

  // ============================================================
  // 2. DEFAULT ADMIN USER
  // ============================================================
  console.log('👤 Creating admin user...')
  const user = await prisma.user.create({
    data: {
      email: 'admin@empresademo.com.ar',
      password: 'admin123',
      name: 'Administrador',
      role: 'admin',
      companyId: company.id,
    },
  })
  console.log(`  ✓ User created: ${user.name} <${user.email}>`)

  // ============================================================
  // 3. CHART OF ACCOUNTS (Plan de Cuentas)
  // ============================================================
  console.log('📊 Creating chart of accounts...')

  // We store accounts by code for parent references
  const accountMap: Record<string, string> = {}

  // Helper to create an account and store its id
  async function createAccount(data: {
    code: string
    name: string
    type: string
    subtype?: string
    parentId?: string
    level: number
  }) {
    const account = await prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        subtype: data.subtype ?? null,
        parentId: data.parentId ?? null,
        level: data.level,
        balance: 0,
        companyId: company.id,
      },
    })
    accountMap[data.code] = account.id
    return account
  }

  // --- LEVEL 1: Root accounts ---
  await createAccount({ code: '1', name: 'ACTIVO', type: 'activo', level: 1 })
  await createAccount({ code: '2', name: 'PASIVO', type: 'pasivo', level: 1 })
  await createAccount({ code: '3', name: 'PATRIMONIO NETO', type: 'patrimonio', level: 1 })
  await createAccount({ code: '4', name: 'INGRESOS', type: 'ingreso', level: 1 })
  await createAccount({ code: '5', name: 'EGRESOS', type: 'egreso', level: 1 })

  // --- LEVEL 2: Subcategories ---
  await createAccount({ code: '1.1', name: 'Activo Corriente', type: 'activo', parentId: accountMap['1'], level: 2 })
  await createAccount({ code: '1.2', name: 'Activo No Corriente', type: 'activo', parentId: accountMap['1'], level: 2 })
  await createAccount({ code: '2.1', name: 'Pasivo Corriente', type: 'pasivo', parentId: accountMap['2'], level: 2 })
  await createAccount({ code: '3.1', name: 'Capital', type: 'patrimonio', parentId: accountMap['3'], level: 2 })
  await createAccount({ code: '3.2', name: 'Reservas', type: 'patrimonio', parentId: accountMap['3'], level: 2 })
  await createAccount({ code: '3.3', name: 'Resultados', type: 'patrimonio', parentId: accountMap['3'], level: 2 })
  await createAccount({ code: '4.1', name: 'Ventas', type: 'ingreso', parentId: accountMap['4'], level: 2 })
  await createAccount({ code: '4.2', name: 'Otros Ingresos', type: 'ingreso', parentId: accountMap['4'], level: 2 })
  await createAccount({ code: '5.1', name: 'Costo de Ventas', type: 'egreso', parentId: accountMap['5'], level: 2 })
  await createAccount({ code: '5.2', name: 'Gastos Operativos', type: 'egreso', parentId: accountMap['5'], level: 2 })
  await createAccount({ code: '5.3', name: 'Gastos Financieros', type: 'egreso', parentId: accountMap['5'], level: 2 })
  await createAccount({ code: '5.4', name: 'Impuestos', type: 'egreso', parentId: accountMap['5'], level: 2 })

  // --- LEVEL 3: Groups ---
  // Activo Corriente
  await createAccount({ code: '1.1.01', name: 'Caja y Bancos', type: 'activo', parentId: accountMap['1.1'], level: 3 })
  await createAccount({ code: '1.1.02', name: 'Cuentas por Cobrar', type: 'activo', parentId: accountMap['1.1'], level: 3 })
  await createAccount({ code: '1.1.03', name: 'Inventarios', type: 'activo', parentId: accountMap['1.1'], level: 3 })
  await createAccount({ code: '1.1.04', name: 'Créditos Fiscales', type: 'activo', parentId: accountMap['1.1'], level: 3 })
  // Activo No Corriente
  await createAccount({ code: '1.2.01', name: 'Bienes de Uso', type: 'activo', parentId: accountMap['1.2'], level: 3 })
  // Pasivo Corriente
  await createAccount({ code: '2.1.01', name: 'Cuentas por Pagar', type: 'pasivo', parentId: accountMap['2.1'], level: 3 })
  await createAccount({ code: '2.1.02', name: 'Obligaciones Fiscales', type: 'pasivo', parentId: accountMap['2.1'], level: 3 })
  // Patrimonio
  await createAccount({ code: '3.1.01', name: 'Capital Social', type: 'patrimonio', parentId: accountMap['3.1'], level: 3 })
  await createAccount({ code: '3.1.02', name: 'Aportes Irrevocables', type: 'patrimonio', parentId: accountMap['3.1'], level: 3 })
  await createAccount({ code: '3.2.01', name: 'Reserva Legal', type: 'patrimonio', parentId: accountMap['3.2'], level: 3 })
  await createAccount({ code: '3.2.02', name: 'Reserva Estatutaria', type: 'patrimonio', parentId: accountMap['3.2'], level: 3 })
  await createAccount({ code: '3.3.01', name: 'Resultado del Ejercicio', type: 'patrimonio', parentId: accountMap['3.3'], level: 3 })
  await createAccount({ code: '3.3.02', name: 'Resultados Acumulados', type: 'patrimonio', parentId: accountMap['3.3'], level: 3 })
  // Ingresos
  await createAccount({ code: '4.1.01', name: 'Ventas de Mercaderías', type: 'ingreso', parentId: accountMap['4.1'], level: 3 })
  await createAccount({ code: '4.1.02', name: 'Servicios Prestados', type: 'ingreso', parentId: accountMap['4.1'], level: 3 })
  await createAccount({ code: '4.1.03', name: 'Intereses Ganados', type: 'ingreso', parentId: accountMap['4.1'], level: 3 })
  await createAccount({ code: '4.2.01', name: 'Otros Ingresos Ordinarios', type: 'ingreso', parentId: accountMap['4.2'], level: 3 })
  // Egresos - Costo de Ventas
  await createAccount({ code: '5.1.01', name: 'Costo Mercaderías Vendidas', type: 'egreso', parentId: accountMap['5.1'], level: 3 })
  await createAccount({ code: '5.1.02', name: 'Compras', type: 'egreso', parentId: accountMap['5.1'], level: 3 })
  // Egresos - Gastos Operativos
  await createAccount({ code: '5.2.01', name: 'Sueldos y Jornales', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.02', name: 'Cargas Sociales', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.03', name: 'Alquileres', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.04', name: 'Servicios', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.05', name: 'Luz, Gas y Teléfono', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.06', name: 'Mantenimiento', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.07', name: 'Seguros', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  await createAccount({ code: '5.2.08', name: 'Depreciaciones', type: 'egreso', parentId: accountMap['5.2'], level: 3 })
  // Egresos - Gastos Financieros
  await createAccount({ code: '5.3.01', name: 'Intereses Pagados', type: 'egreso', parentId: accountMap['5.3'], level: 3 })
  // Egresos - Impuestos
  await createAccount({ code: '5.4.01', name: 'Impuesto a las Ganancias', type: 'egreso', parentId: accountMap['5.4'], level: 3 })
  await createAccount({ code: '5.4.02', name: 'Ingresos Brutos', type: 'egreso', parentId: accountMap['5.4'], level: 3 })

  // --- LEVEL 4: Leaf accounts (with subtype) ---
  // Caja y Bancos
  await createAccount({ code: '1.1.01.001', name: 'Caja', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.01'], level: 4 })
  await createAccount({ code: '1.1.01.002', name: 'Banco Nación Cta. Cte.', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.01'], level: 4 })
  await createAccount({ code: '1.1.01.003', name: 'Banco Galicia Cta. Cte.', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.01'], level: 4 })
  // Cuentas por Cobrar
  await createAccount({ code: '1.1.02.001', name: 'Deudores por Ventas', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.02'], level: 4 })
  await createAccount({ code: '1.1.02.002', name: 'Documentos a Cobrar', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.02'], level: 4 })
  await createAccount({ code: '1.1.02.003', name: 'Anticipos a Proveedores', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.02'], level: 4 })
  // Inventarios
  await createAccount({ code: '1.1.03.001', name: 'Mercaderías', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.03'], level: 4 })
  await createAccount({ code: '1.1.03.002', name: 'Materias Primas', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.03'], level: 4 })
  // Créditos Fiscales
  await createAccount({ code: '1.1.04.001', name: 'IVA Crédito Fiscal', type: 'activo', subtype: 'corriente', parentId: accountMap['1.1.04'], level: 4 })
  // Bienes de Uso
  await createAccount({ code: '1.2.01.001', name: 'Rodados', type: 'activo', subtype: 'no_corriente', parentId: accountMap['1.2.01'], level: 4 })
  await createAccount({ code: '1.2.01.002', name: 'Muebles y Útiles', type: 'activo', subtype: 'no_corriente', parentId: accountMap['1.2.01'], level: 4 })
  await createAccount({ code: '1.2.01.003', name: 'Equipos de Computación', type: 'activo', subtype: 'no_corriente', parentId: accountMap['1.2.01'], level: 4 })
  await createAccount({ code: '1.2.01.004', name: 'Depreciación Acumulada', type: 'activo', subtype: 'no_corriente', parentId: accountMap['1.2.01'], level: 4 })
  // Cuentas por Pagar
  await createAccount({ code: '2.1.01.001', name: 'Proveedores', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.01'], level: 4 })
  await createAccount({ code: '2.1.01.002', name: 'Documentos a Pagar', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.01'], level: 4 })
  await createAccount({ code: '2.1.01.003', name: 'Sueldos a Pagar', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.01'], level: 4 })
  await createAccount({ code: '2.1.01.004', name: 'Cargas Sociales a Pagar', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.01'], level: 4 })
  // Obligaciones Fiscales
  await createAccount({ code: '2.1.02.001', name: 'IVA Débito Fiscal', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.02'], level: 4 })
  await createAccount({ code: '2.1.02.002', name: 'Ganancias a Pagar', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.02'], level: 4 })
  await createAccount({ code: '2.1.02.003', name: 'IIBB a Pagar', type: 'pasivo', subtype: 'corriente', parentId: accountMap['2.1.02'], level: 4 })

  const totalAccounts = Object.keys(accountMap).length
  console.log(`  ✓ Created ${totalAccounts} accounts`)

  // ============================================================
  // 4. SAMPLE CLIENTS
  // ============================================================
  console.log('🤝 Creating sample clients...')
  const clientsData = [
    { code: 'CLI-001', name: 'Tech Solutions S.A.', cuit: '30-98765432-1', email: 'info@techsol.com' },
    { code: 'CLI-002', name: 'Consultora ABC', cuit: '20-55566677-8', email: 'contacto@abc.com' },
    { code: 'CLI-003', name: 'Gimnasio FitPro', cuit: '23-11223344-5', email: 'admin@fitpro.com' },
    { code: 'CLI-004', name: 'Dr. García - Consultorio', cuit: '20-99887766-5', email: 'drgarcia@mail.com' },
    { code: 'CLI-005', name: 'Agencia Creativa X', cuit: '30-44556677-8', email: 'hello@agenciax.com' },
  ]

  for (const c of clientsData) {
    await prisma.client.create({
      data: { ...c, companyId: company.id },
    })
  }
  console.log(`  ✓ Created ${clientsData.length} clients`)

  // ============================================================
  // 5. SAMPLE PROVIDERS
  // ============================================================
  console.log('🏭 Creating sample providers...')
  const providersData = [
    { code: 'PROV-001', name: 'Distribuidora Mayorista S.A.', cuit: '30-11112222-3' },
    { code: 'PROV-002', name: 'Servicios de Limpieza SRL', cuit: '30-33334444-5' },
    { code: 'PROV-003', name: 'Proveedor de Tecnología', cuit: '30-55556666-7' },
    { code: 'PROV-004', name: 'Seguros La Caja', cuit: '30-77778888-9' },
  ]

  for (const p of providersData) {
    await prisma.provider.create({
      data: { ...p, companyId: company.id },
    })
  }
  console.log(`  ✓ Created ${providersData.length} providers`)

  // ============================================================
  // 6. JOURNAL ENTRIES (Asientos Contables)
  // ============================================================
  console.log('📝 Creating journal entries...')

  // Asiento 1 - Apertura de ejercicio
  console.log('  → Asiento 1: Apertura de ejercicio...')
  const je1 = await prisma.journalEntry.create({
    data: {
      number: 1,
      date: new Date('2025-01-01'),
      description: 'Apertura de ejercicio',
      concept: 'apertura',
      status: 'confirmado',
      totalDebit: 2800000,
      totalCredit: 2800000,
      companyId: company.id,
      lines: {
        create: [
          { accountId: accountMap['1.1.01.001'], debit: 500000, credit: 0 },
          { accountId: accountMap['1.1.01.002'], debit: 1500000, credit: 0 },
          { accountId: accountMap['1.1.03.001'], debit: 800000, credit: 0 },
          { accountId: accountMap['3.1.01'], debit: 0, credit: 2800000 },
        ],
      },
    },
    include: { lines: true },
  })
  console.log(`    ✓ ${je1.lines.length} lines, D=${je1.totalDebit} C=${je1.totalCredit}`)

  // Asiento 2 - Venta de servicios Factura A001
  console.log('  → Asiento 2: Venta de servicios - Factura A001...')
  const je2 = await prisma.journalEntry.create({
    data: {
      number: 2,
      date: new Date('2025-01-15'),
      description: 'Venta de servicios - Factura A001',
      concept: 'normal',
      status: 'confirmado',
      totalDebit: 605000,
      totalCredit: 605000,
      companyId: company.id,
      lines: {
        create: [
          { accountId: accountMap['1.1.02.001'], debit: 605000, credit: 0 },
          { accountId: accountMap['4.1.02'], debit: 0, credit: 500000 },
          { accountId: accountMap['2.1.02.001'], debit: 0, credit: 105000 },
        ],
      },
    },
    include: { lines: true },
  })
  console.log(`    ✓ ${je2.lines.length} lines, D=${je2.totalDebit} C=${je2.totalCredit}`)

  // Asiento 3 - Compra de mercaderías
  console.log('  → Asiento 3: Compra de mercaderías - Factura de proveedor...')
  const je3 = await prisma.journalEntry.create({
    data: {
      number: 3,
      date: new Date('2025-01-20'),
      description: 'Compra de mercaderías - Factura de proveedor',
      concept: 'normal',
      status: 'confirmado',
      totalDebit: 484000,
      totalCredit: 484000,
      companyId: company.id,
      lines: {
        create: [
          { accountId: accountMap['5.1.02'], debit: 400000, credit: 0 },
          { accountId: accountMap['1.1.04.001'], debit: 84000, credit: 0 },
          { accountId: accountMap['2.1.01.001'], debit: 0, credit: 484000 },
        ],
      },
    },
    include: { lines: true },
  })
  console.log(`    ✓ ${je3.lines.length} lines, D=${je3.totalDebit} C=${je3.totalCredit}`)

  // Asiento 4 - Pago de alquiler
  console.log('  → Asiento 4: Pago de alquiler del mes...')
  const je4 = await prisma.journalEntry.create({
    data: {
      number: 4,
      date: new Date('2025-02-01'),
      description: 'Pago de alquiler del mes',
      concept: 'normal',
      status: 'confirmado',
      totalDebit: 150000,
      totalCredit: 150000,
      companyId: company.id,
      lines: {
        create: [
          { accountId: accountMap['5.2.03'], debit: 150000, credit: 0 },
          { accountId: accountMap['1.1.01.002'], debit: 0, credit: 150000 },
        ],
      },
    },
    include: { lines: true },
  })
  console.log(`    ✓ ${je4.lines.length} lines, D=${je4.totalDebit} C=${je4.totalCredit}`)

  // Asiento 5 - Cobro de cliente Tech Solutions
  console.log('  → Asiento 5: Cobro de cliente Tech Solutions...')
  const je5 = await prisma.journalEntry.create({
    data: {
      number: 5,
      date: new Date('2025-02-10'),
      description: 'Cobro de cliente Tech Solutions',
      concept: 'normal',
      status: 'confirmado',
      totalDebit: 605000,
      totalCredit: 605000,
      companyId: company.id,
      lines: {
        create: [
          { accountId: accountMap['1.1.01.002'], debit: 605000, credit: 0 },
          { accountId: accountMap['1.1.02.001'], debit: 0, credit: 605000 },
        ],
      },
    },
    include: { lines: true },
  })
  console.log(`    ✓ ${je5.lines.length} lines, D=${je5.totalDebit} C=${je5.totalCredit}`)

  console.log(`  ✓ Created 5 journal entries`)

  // ============================================================
  // 7. BANK ACCOUNTS
  // ============================================================
  console.log('🏦 Creating bank accounts...')
  const bankAccountsData = [
    { name: 'Caja General', bank: null, type: 'caja', balance: 500000 },
    { name: 'Banco Nación Cta. Cte.', bank: 'Banco Nación', type: 'cta_corriente', balance: 1955000 },
    { name: 'Banco Galicia Caja de Ahorro', bank: 'Banco Galicia', type: 'caja_ahorro', balance: 0 },
  ]

  for (const b of bankAccountsData) {
    await prisma.bankAccount.create({
      data: { ...b, currency: 'ARS', companyId: company.id },
    })
  }
  console.log(`  ✓ Created ${bankAccountsData.length} bank accounts`)

  // Get client IDs for invoice references
  const clients = await prisma.client.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  const providers = await prisma.provider.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  // ============================================================
  // 8. SAMPLE INVOICES
  // ============================================================
  console.log('🧾 Creating sample invoices...')

  const invoicesData = [
    {
      number: 'FAC-A-0001',
      type: 'A',
      date: new Date('2025-01-15'),
      dueDate: new Date('2025-02-15'),
      netTotal: 500000,
      tax: 105000,
      total: 605000,
      amountPaid: 605000,
      status: 'pagada',
      clientId: clients[0]?.id,
      items: [
        { description: 'Desarrollo Web - Landing Page', quantity: 1, unitPrice: 300000, subtotal: 300000, taxRate: 21, taxAmount: 63000 },
        { description: 'Diseño UI/UX', quantity: 10, unitPrice: 20000, subtotal: 200000, taxRate: 21, taxAmount: 42000 },
      ],
    },
    {
      number: 'FAC-A-0002',
      type: 'A',
      date: new Date('2025-02-01'),
      dueDate: new Date('2025-03-01'),
      netTotal: 350000,
      tax: 73500,
      total: 423500,
      amountPaid: 200000,
      status: 'pagada_parcial',
      clientId: clients[1]?.id,
      items: [
        { description: 'Consultoría ERP - 20hs', quantity: 20, unitPrice: 17500, subtotal: 350000, taxRate: 21, taxAmount: 73500 },
      ],
    },
    {
      number: 'FAC-B-0001',
      type: 'B',
      date: new Date('2025-02-10'),
      dueDate: new Date('2025-03-10'),
      netTotal: 180000,
      tax: 37800,
      total: 217800,
      amountPaid: 0,
      status: 'pendiente',
      clientId: clients[2]?.id,
      items: [
        { description: 'Mantenimiento mensual servidor', quantity: 1, unitPrice: 180000, subtotal: 180000, taxRate: 21, taxAmount: 37800 },
      ],
    },
    {
      number: 'FAC-B-0002',
      type: 'B',
      date: new Date('2025-02-15'),
      dueDate: new Date('2025-03-15'),
      netTotal: 95000,
      tax: 19950,
      total: 114950,
      amountPaid: 0,
      status: 'pendiente',
      clientId: clients[3]?.id,
      items: [
        { description: 'Hosting y dominio anual', quantity: 1, unitPrice: 55000, subtotal: 55000, taxRate: 21, taxAmount: 11550 },
        { description: 'Certificado SSL', quantity: 1, unitPrice: 40000, subtotal: 40000, taxRate: 21, taxAmount: 8400 },
      ],
    },
    {
      number: 'FAC-C-0001',
      type: 'C',
      date: new Date('2025-01-25'),
      dueDate: new Date('2025-01-25'),
      netTotal: 45000,
      tax: 0,
      total: 45000,
      amountPaid: 45000,
      status: 'pagada',
      clientId: clients[4]?.id,
      items: [
        { description: 'Diseño logo corporativo', quantity: 1, unitPrice: 45000, subtotal: 45000, taxRate: 0, taxAmount: 0 },
      ],
    },
  ]

  const createdInvoices = []
  for (const inv of invoicesData) {
    const invoice = await prisma.invoice.create({
      data: {
        number: inv.number,
        type: inv.type,
        date: inv.date,
        dueDate: inv.dueDate,
        netTotal: inv.netTotal,
        tax: inv.tax,
        total: inv.total,
        amountPaid: inv.amountPaid,
        status: inv.status,
        clientId: inv.clientId || null,
        companyId: company.id,
        items: {
          create: inv.items,
        },
      },
    })
    createdInvoices.push(invoice)
  }
  console.log(`  ✓ Created ${invoicesData.length} invoices`)

  // ============================================================
  // 9. SAMPLE PAYMENTS
  // ============================================================
  console.log('💰 Creating sample payments...')

  const paymentsData = [
    {
      number: 'REC-0001',
      date: new Date('2025-02-10'),
      amount: 605000,
      method: 'transferencia',
      reference: 'TRF-001234',
      type: 'cobro',
      invoiceId: createdInvoices[0]?.id,
      clientId: clients[0]?.id,
      bankAccountId: bankAccounts[1]?.id,
    },
    {
      number: 'REC-0002',
      date: new Date('2025-02-20'),
      amount: 200000,
      method: 'transferencia',
      reference: 'TRF-005678',
      type: 'cobro',
      invoiceId: createdInvoices[1]?.id,
      clientId: clients[1]?.id,
      bankAccountId: bankAccounts[1]?.id,
    },
    {
      number: 'REC-0003',
      date: new Date('2025-01-28'),
      amount: 45000,
      method: 'efectivo',
      type: 'cobro',
      invoiceId: createdInvoices[4]?.id,
      clientId: clients[4]?.id,
      bankAccountId: bankAccounts[0]?.id,
    },
    {
      number: 'PAG-0001',
      date: new Date('2025-02-05'),
      amount: 150000,
      method: 'transferencia',
      reference: 'TRF-009999',
      type: 'pago',
      providerId: providers[1]?.id,
      bankAccountId: bankAccounts[1]?.id,
      notes: 'Alquiler febrero 2025',
    },
    {
      number: 'PAG-0002',
      date: new Date('2025-01-20'),
      amount: 484000,
      method: 'transferencia',
      reference: 'TRF-001111',
      type: 'pago',
      providerId: providers[0]?.id,
      bankAccountId: bankAccounts[1]?.id,
      notes: 'Compra mercaderías',
    },
  ]

  for (const p of paymentsData) {
    await prisma.payment.create({
      data: {
        number: p.number,
        date: p.date,
        amount: p.amount,
        method: p.method,
        reference: p.reference || null,
        type: p.type,
        notes: (p as Record<string, unknown>).notes as string || null,
        invoiceId: p.invoiceId || null,
        clientId: p.clientId || null,
        providerId: p.providerId || null,
        bankAccountId: p.bankAccountId || null,
        companyId: company.id,
      },
    })
  }
  console.log(`  ✓ Created ${paymentsData.length} payments`)

  // ============================================================
  // 10. SAMPLE CHEQUES
  // ============================================================
  console.log('🏦 Creating sample cheques...')

  const chequesData = [
    {
      number: '00012345',
      bank: 'Banco Nación',
      branch: 'Sucursal Microcentro',
      accountType: 'cta_corriente',
      chequeType: 'tercero',
      status: 'en_cartera',
      amount: 450000,
      currency: 'ARS',
      issueDate: new Date('2025-03-01'),
      paymentDate: new Date('2025-04-15'),
      issuerName: 'Tech Solutions S.A.',
      issuerCuit: '30-98765432-1',
      clientId: clients[0]?.id,
      notes: 'Cheque recibido por servicios de desarrollo',
    },
    {
      number: '00067890',
      bank: 'Banco Galicia',
      branch: 'Sucursal Caballito',
      accountType: 'cta_corriente',
      chequeType: 'tercero',
      status: 'depositado',
      amount: 320000,
      currency: 'ARS',
      issueDate: new Date('2025-02-20'),
      paymentDate: new Date('2025-03-20'),
      depositDate: new Date('2025-03-10'),
      issuerName: 'Consultora ABC',
      issuerCuit: '20-55566677-8',
      clientId: clients[1]?.id,
      bankAccountId: bankAccounts[1]?.id,
      notes: 'Deposito en Banco Nación',
    },
    {
      number: '00011111',
      bank: 'Banco Provincia',
      accountType: 'caja_ahorro',
      chequeType: 'propio',
      status: 'emitido',
      amount: 180000,
      currency: 'ARS',
      issueDate: new Date('2025-03-05'),
      paymentDate: new Date('2025-04-05'),
      issuerName: 'Empresa Demo S.R.L.',
      issuerCuit: '30-12345678-9',
      providerId: providers[1]?.id,
      notes: 'Pago a proveedor de limpieza',
    },
    {
      number: '00022222',
      bank: 'Banco Nación',
      branch: 'Sucursal Centro',
      accountType: 'cta_corriente',
      chequeType: 'tercero',
      status: 'cobrado',
      amount: 750000,
      currency: 'ARS',
      issueDate: new Date('2025-01-10'),
      paymentDate: new Date('2025-02-10'),
      depositDate: new Date('2025-01-25'),
      clearanceDate: new Date('2025-02-10'),
      issuerName: 'Agencia Creativa X',
      issuerCuit: '30-44556677-8',
      clientId: clients[4]?.id,
      bankAccountId: bankAccounts[1]?.id,
    },
    {
      number: '00033333',
      bank: 'Banco Macro',
      branch: 'Sucursal Palermo',
      accountType: 'cta_corriente',
      chequeType: 'tercero',
      status: 'rechazado',
      amount: 200000,
      currency: 'ARS',
      issueDate: new Date('2025-02-01'),
      paymentDate: new Date('2025-03-01'),
      depositDate: new Date('2025-02-20'),
      rejectionReason: 'Fondos insuficientes',
      issuerName: 'Cliente Inexistente S.A.',
      issuerCuit: '20-00000000-0',
      bankAccountId: bankAccounts[1]?.id,
    },
  ]

  for (const ch of chequesData) {
    await prisma.cheque.create({
      data: {
        number: ch.number,
        bank: ch.bank,
        branch: ch.branch || null,
        accountType: ch.accountType,
        chequeType: ch.chequeType,
        status: ch.status,
        amount: ch.amount,
        currency: ch.currency,
        issueDate: ch.issueDate,
        paymentDate: ch.paymentDate || null,
        depositDate: (ch as Record<string, unknown>).depositDate ? new Date((ch as Record<string, unknown>).depositDate as string) : null,
        clearanceDate: (ch as Record<string, unknown>).clearanceDate ? new Date((ch as Record<string, unknown>).clearanceDate as string) : null,
        rejectionReason: (ch as Record<string, unknown>).rejectionReason as string || null,
        issuerName: ch.issuerName || null,
        issuerCuit: ch.issuerCuit || null,
        notes: ch.notes || null,
        clientId: ch.clientId || null,
        providerId: ch.providerId || null,
        bankAccountId: ch.bankAccountId || null,
        companyId: company.id,
      },
    })
  }
  console.log(`  ✓ Created ${chequesData.length} cheques`)

  // ============================================================
  // SUMMARY
  // ============================================================
  const accountCount = await prisma.account.count({ where: { companyId: company.id } })
  const clientCount = await prisma.client.count({ where: { companyId: company.id } })
  const providerCount = await prisma.provider.count({ where: { companyId: company.id } })
  const journalCount = await prisma.journalEntry.count({ where: { companyId: company.id } })
  const lineCount = await prisma.journalEntryLine.count()
  const bankCount = await prisma.bankAccount.count({ where: { companyId: company.id } })
  const invoiceCount = await prisma.invoice.count({ where: { companyId: company.id } })
  const paymentCount = await prisma.payment.count({ where: { companyId: company.id } })

  console.log('')
  console.log('════════════════════════════════════════════')
  console.log('  ✅ ERP Seed completed successfully!')
  console.log('════════════════════════════════════════════')
  console.log(`  Company:      ${company.name}`)
  console.log(`  User:         ${user.email}`)
  console.log(`  Accounts:     ${accountCount}`)
  console.log(`  Clients:      ${clientCount}`)
  console.log(`  Providers:    ${providerCount}`)
  console.log(`  J. Entries:   ${journalCount}`)
  console.log(`  J. Lines:     ${lineCount}`)
  console.log(`  Invoices:     ${invoiceCount}`)
  console.log(`  Payments:     ${paymentCount}`)
  console.log(`  Bank Accts:   ${bankCount}`)
  console.log(`  Cheques:      ${chequesData.length}`)
  console.log('════════════════════════════════════════════')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
