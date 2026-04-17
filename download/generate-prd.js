const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableOfContents, LevelFormat
} = require("docx");

// ─── Palette GO-1 ───
const P = {
  primary: "FFFFFF", accent: "D4875A", body: "000000",
  bg: "1A2330",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
};

// ─── Helpers ───
const FONT = { ascii: "Calibri", eastAsia: "Microsoft YaHei", english: "Times New Roman" };
const BODY_SIZE = 24;
const LINE_SPACING = 312;

function bodyText(text) {
  return new Paragraph({
    spacing: { line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE, color: P.body })],
  });
}

function bodyTextBold(text) {
  return new Paragraph({
    spacing: { line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE, color: P.body, bold: true })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200, line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: P.bg })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150, line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: 28, bold: true, color: P.bg })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: P.bg })],
  });
}

function emptyPara(space = 100) {
  return new Paragraph({ spacing: { before: space }, children: [] });
}

function captionPara(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200, line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text, font: FONT, size: 20, italics: true, color: "64748B" })],
  });
}

function imgParagraph(filePath, wPx, hPx) {
  const buf = fs.readFileSync(filePath);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 0 },
    children: [
      new ImageRun({
        data: buf,
        transformation: { width: wPx, height: hPx },
        type: "png",
      }),
    ],
  });
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map(h =>
          new TableCell({
            children: [new Paragraph({ spacing: { line: LINE_SPACING, lineRule: "atLeast" }, children: [new TextRun({ text: h, bold: true, size: 21, color: P.table.headerText, font: FONT })] })],
            shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
          })
        ),
      }),
      ...rows.map((row, i) =>
        new TableRow({
          cantSplit: true,
          children: row.map(cell =>
            new TableCell({
              children: [new Paragraph({ spacing: { line: LINE_SPACING, lineRule: "atLeast" }, children: [new TextRun({ text: cell, size: 21, color: P.body, font: FONT })] })],
              shading: i % 2 === 0 ? { type: ShadingType.CLEAR, fill: P.table.surface } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
            })
          ),
        })
      ),
    ],
  });
}

// ─── Images ───
const IMG_DIR = "/home/z/my-project/download/erp-diagrams";

// ─── COVER SECTION (R4: Top Color Block) ───
const coverSection = {
  properties: {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  },
  children: [
    new Table({
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          height: { value: 5000, rule: "exact" },
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: P.bg },
              verticalAlign: "top",
              children: [
                new Paragraph({ spacing: { before: 2000 }, children: [] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 600, lineRule: "atLeast" },
                  children: [new TextRun({ text: "ERP CONTABLE INTELIGENTE", font: FONT, size: 48, bold: true, color: P.cover.titleColor })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 200 },
                  children: [new TextRun({ text: "Documento de Requisitos del Producto", font: FONT, size: 28, color: P.cover.subtitleColor })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 400 },
                  children: [new TextRun({ text: "SaaS Multi-Tenant | LATAM | Arquitectura Modular", font: FONT, size: 22, color: P.cover.metaColor })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          height: { value: 11838, rule: "exact" },
          children: [
            new TableCell({
              verticalAlign: "top",
              children: [
                new Paragraph({ spacing: { before: 1200 }, children: [] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Autor: Pablo Diez", font: FONT, size: 24, color: "475569" })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                  children: [new TextRun({ text: "SaaS Architect & Full Stack Developer", font: FONT, size: 22, color: "64748B" })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                  children: [new TextRun({ text: "Version 1.0 | Abril 2026", font: FONT, size: 22, color: "64748B" })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 300 },
                  children: [new TextRun({ text: "CONFIDENCIAL", font: FONT, size: 20, bold: true, color: P.accent })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
};

// ─── BODY PAGE PROPERTIES ───
const bodyPageProps = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
  },
};

// ─── SECTIONS CONTENT ───

// 1. Resumen Ejecutivo
const sec1 = [
  h1("1. Resumen Ejecutivo"),
  bodyText(
    "El ERP Contable Inteligente es una plataforma SaaS multi-tenant disenada para revolucionar la gestion contable y financiera de pequenas y medianas empresas (PYMES) en America Latina, con foco inicial en Argentina. El sistema combina las funcionalidades clsicas de un ERP contable con capacidades avanzadas de inteligencia artificial, ofreciendo automatizacion de tareas repetitivas, clasificacion inteligente de transacciones, prediccion de flujos de caja y recomendaciones proactivas para la toma de decisiones financieras."
  ),
  bodyText(
    "A diferencia de las soluciones tradicionales del mercado argentino, que se caracterizan por interfaces obsoletas, arquitecturas monolíticas propietarias y costosas licencias perpetuas, nuestro producto adopta un modelo de suscripcion mensual accesible, una arquitectura moderna basada en microservicios y una experiencia de usuario web nativa que no requiere instalacion ni configuracion local. El diferencial clave radica en la integracion de modelos de IA que aprenden del comportamiento financiero de cada empresa para ofrecer insights personalizados y automatizar procesos que hoy consumen horas de trabajo manual."
  ),
  bodyText(
    "El mercado objetivo incluye freelancers, monotributistas, pequenas empresas y estudios contables que gestionan multiples clientes. Argentina presenta un escenario ideal para esta solucion dado el alto grado de complejidad normativa tributaria, la necesidad de actualizaciones constantes ante cambios regulatorios de AFIP y la creciente adopcion de herramientas cloud en el segmento PYME. La estrategia de entrada al mercado contempla un enfoque bottom-up: comenzar con un producto simple orientado a freelancers y monotributistas, validar la propuesta de valor, y luego expandir iterativamente hacia funcionalidades de ERP completo para empresas mas grandes y estudios contables."
  ),
  bodyText(
    "Este documento de requisitos del producto (PRD) define en detalle la vision, arquitectura, modulos funcionales, roadmap de desarrollo, stack tecnologico, modelo de negocio y estrategia go-to-market del proyecto. Su objetivo es servir como referencia unica para el equipo de desarrollo, stakeholders y posibles inversores, asegurando alineacion estrategica y ejecucion coherente durante todo el ciclo de vida del producto."
  ),
];

// 2. Vision y Alcance
const sec2 = [
  h1("2. Vision y Alcance"),
  h2("2.1 Vision del Producto"),
  bodyText(
    "Convertirse en el ERP contable de referencia para el mercado LATAM, siendo reconocido por la simplicidad de uso, la potencia de sus funcionalidades de inteligencia artificial y la capacidad de adaptarse rapidamente a los cambios normativos de cada jurisdiccion. La vision a largo plazo es que cualquier empresa, independientemente de su tamano, pueda gestionar su contabilidad con la misma facilidad con la que usa una aplicacion de mensajeria, sin sacrificar precision ni cumplimiento normativo."
  ),
  h2("2.2 Mercado Objetivo"),
  bodyText(
    "El producto se dirige a tres segmentos principales en Argentina, con planes de expansion gradual a otros paises de LATAM como Colombia, Mexico y Chile. El primer segmento est conformado por freelancers y monotributistas, que necesitan un registro simple de ingresos y egresos con generacion automatica de declaraciones juradas. El segundo segmento son las pequenas empresas (responsables inscriptos) que requieren gestion completa de facturacion electronica, libros contables, liquidacion de impuestos y reporting financiero. El tercer segmento lo constituyen los estudios contables que buscan una herramienta centralizada para administrar la contabilidad de multiples clientes desde una unica interfaz."
  ),
  h2("2.3 Alcance Inicial (MVP)"),
  bodyText(
    "El alcance inicial del producto (MVP) se concentra en las funcionalidades criticas para el segmento de freelancers y monotributistas argentinos, dejando funcionalidades avanzadas para iteraciones posteriores. El MVP incluye: autenticacion y gestion multi-tenant, registro de ingresos y egresos, clasificacion automatica de gastos mediante IA, emision de comprobantes electronicos (Factura Electronica - AFIP), dashboard financiero basico con graficos de flujo de caja, y exportacion de datos a formatos compatibles con herramientas contables tradicionales. Funcionalidades fuera del alcance inicial incluyen: liquidacion automatica de IVA y Ganancias, gestion de stock e inventario, integracion con bancos para conciliacion automatica, y modulo de recursos humanos y nominas."
  ),
  h2("2.4 Arquitectura Multi-Tenant"),
  bodyText(
    "La plataforma adopta un modelo multi-tenant desde su concepcion, lo que permite servir a multiples organizaciones desde una unica instancia de la aplicacion, manteniendo completa separacion logica de datos mediante un tenant_id en cada tabla de la base de datos. Este enfoque maximiza la eficiencia operativa, reduce costos de infraestructura y facilita la entrega continua de actualizaciones. Cada tenant puede configurar su propia moneda, regimen fiscal, plan de cuentas personalizado y preferencias de notificacion, garantizando flexibilidad sin comprometer la seguridad o el aislamiento de datos entre organizaciones."
  ),
];

// 3. Arquitectura del Sistema
const sec3 = [
  h1("3. Arquitectura del Sistema"),
  h2("3.1 Enfoque Arquitectonico"),
  bodyText(
    "La arquitectura del sistema sigue una evolucion incremental que comienza con un Monolito Modular y avanza progresivamente hacia Microservicios a medida que el producto madura y la complejidad operacional lo justifique. Esta estrategia, conocida como Extract Evolutionary Architecture, permite al equipo moverse rapidamente en las etapas iniciales sin incurrir en la sobrecarga operativa de una arquitectura de microservicios desde el dia uno, al tiempo que establece los limites de contexto y contratos entre modulos que facilitaran la extraccion futura de servicios independientes."
  ),
  bodyText(
    "El monolito modular se estructura siguiendo los principios de Clean Architecture (Arquitectura Limpia) y Domain-Driven Design (DDD), con una clara separacion en capas: dominio, aplicacion, infraestructura y presentacion. Cada modulo funcional (Accounting, Billing, Payments, etc.) se define como un Bounded Context con sus propias entidades, reglas de negocio y puertos de comunicacion, de modo que la dependencia entre modulos se mantiene a traves de interfaces y eventos, nunca mediante acoplamiento directo a nivel de base de datos o codigo."
  ),
  h2("3.2 Clean Architecture y DDD"),
  bodyText(
    "Clean Architecture garantiza que las reglas de negocio nucleares del sistema residan en la capa de dominio, libre de dependencias externas como frameworks, bases de datos o servicios de terceros. La capa de aplicacion orquesta los casos de uso (use cases), mientras que la capa de infraestructura implementa las adaptaciones concretas (repositorios, servicios externos, persistencia). DDD complementa este enfoque definiendo un lenguaje ubicuo compartido entre el equipo de desarrollo y los expertos del dominio contable, lo que reduce la brecha comunicacional y minimiza errores de interpretacion en los requisitos."
  ),
  h2("3.3 Patrones de Comunicacion"),
  bodyText(
    "La comunicacion entre modulos sigue patrones definidos por CQRS (Command Query Responsibility Segregation) y Event Sourcing parcial. Los comandos (escritura) y las consultas (lectura) se separan en flujos distintos, lo que permite optimizar cada lado independientemente. Los cambios de estado importante se publican como eventos de dominio (por ejemplo, invoice.created, payment.received) que son consumidos por otros modulos de forma asincrona. En la etapa de monolito modular, esta comunicacion se implementa mediante MediatR (patron Mediator) con handlers en proceso. A medida que se evoluciona hacia microservicios, los eventos se migran a Apache Kafka como broker de mensajes, manteniendo la misma semantica de dominio."
  ),
  imgParagraph(`${IMG_DIR}/01-arquitectura-del-sistema.png`, 480, 818),
  captionPara("Figura 1: Arquitectura del Sistema - Monolito Modular a Microservicios"),
  h2("3.4 Estrategia de Escalabilidad"),
  bodyText(
    "La escalabilidad horizontal se logra mediante containerizacion con Docker y orquestacion con Kubernetes en entornos cloud (Azure o AWS). La base de datos PostgreSQL opera en modo de unica instancia con separacion logica por tenant en la primera etapa, migrando a un esquema de sharding por tenant o base de datos por tenant si el volumen de datos lo requiere. Redis actua como capa de cache para consultas frecuentes y sesiones de usuario, reduciendo la latencia percibida. Todas las integraciones externas (AFIP, pasarelas de pago, proveedores de IA) se acceden a traves de servicios adaptador que implementan el patron Circuit Breaker para garantizar resiliencia ante fallos externos."
  ),
];

// 4. Modelo de Datos
const sec4 = [
  h1("4. Modelo de Datos"),
  h2("4.1 Estrategia de Persistencia Multi-Tenant"),
  bodyText(
    "El modelo de datos se implementa sobre PostgreSQL utilizando la estrategia de tenant_id discriminatorio en todas las tablas. Cada registro de cada tabla incluye un campo tenant_id que identifica a que organizacion pertenece, lo que permite servir a multiples organizaciones desde una unica base de datos con consultas que siempre filtran por tenant. Se implementan Row-Level Security Policies (RLS) a nivel de base de datos como capa adicional de seguridad, garantizando que ninguna consulta pueda acceder a datos de otro tenant, incluso si el codigo de aplicacion presenta un bug o vulnerabilidad."
  ),
  bodyText(
    "La estrategia de identificacion del tenant activo se realiza mediante una variable de sesion PostgreSQL (SET app.current_tenant) que se establece al inicio de cada request y es verificada automaticamente por las politicas RLS. A nivel de aplicacion, un middleware de Entity Framework intercepta todas las consultas LINQ e inyecta automaticamente el filtro Where(t => t.TenantId == currentTenantId), garantizando que los desarrolladores no necesiten agregar este filtro manualmente en cada consulta."
  ),
  h2("4.2 Entidades Principales"),
  bodyText(
    "El modelo de datos se organiza alrededor de las siguientes entidades nucleares, cada una con sus relaciones y restricciones correspondientes. El diseno sigue las convenciones de DDD con agregados raiz que protegen sus invariantes de negocio y entidades de valor (value objects) para conceptos inmutables como Money, Currency y Percentage."),
  makeTable(
    ["Entidad", "Agregado Raiz", "Descripcion Principal"],
    [
      ["Tenant", "TenantContext", "Organizacion, plan, configuracion regional y preferencias"],
      ["User", "TenantContext", "Usuario con roles, permisos y vinculo a tenant"],
      ["Account", "AccountingEngine", "Cuenta contable del plan de cuentas con codigo y tipo"],
      ["JournalEntry", "AccountingEngine", "Asiento contable con lineas de debito y credito"],
      ["JournalLine", "AccountingEngine", "Linea de asiento: cuenta, debito, credito, centro de costo"],
      ["Invoice", "BillingService", "Comprobante fiscal (Factura A/B/C, Nota de Credito, etc.)"],
      ["InvoiceLine", "BillingService", "Linea de comprobante: concepto, cantidad, precio, alicuota IVA"],
      ["Payment", "PaymentsService", "Recibo de cobro o pago con vinculo a comprobantes"],
      ["TaxPeriod", "Reporting", "Periodo fiscal con declaraciones juradas y liquidaciones"],
      ["AIPrediction", "AIService", "Registro de predicciones de flujo de caja y alertas generadas"],
    ]
  ),
  emptyPara(100),
  bodyText(
    "El plan de cuentas sigue la estructura estandar argentina con cuentas patrimoniales (Activo, Pasivo, Patrimonio Neto), cuentas de resultado (Ingresos, Gastos) y cuentas de orden. Cada tenant puede personalizar su plan de cuentas agregando subcuentas o cuentas especificas de su industria, pero no puede eliminar cuentas base requeridas por la normativa AFIP. Los asientos contables siguen el principio de partida doble: cada asiento debe tener al menos dos lineas donde la suma de debitos sea exactamente igual a la suma de creditos, con tolerancia cero."
  ),
  imgParagraph(`${IMG_DIR}/02-modelo-de-datos-er.png`, 520, 470),
  captionPara("Figura 2: Modelo Entidad-Relacion (ER) del Sistema"),
  h2("4.3 Integridad y Auditoria"),
  bodyText(
    "Todas las entidades implementan auditoria temporal (created_at, updated_at, deleted_at) y soft delete para mantener la trazabilidad completa de cambios sin perder informacion historica. Los asientos contables, una vez confirmados (posted), son inmutables: no pueden modificarse ni eliminarse. Si se detecta un error, se genera un asiento de reversa que cancela el original y un nuevo asiento con los valores correctos, dejando un rastro audit completo. Esta politica de inmutabilidad es un requisito fundamental para el cumplimiento normativo ante AFIP."
  ),
];

// 5. Modulos del Sistema
const sec5 = [
  h1("5. Modulos del Sistema"),
  bodyText(
    "El sistema se estructura en modulos funcionales que corresponden a Bounded Contexts definidos mediante Domain-Driven Design. Cada modulo encapsula su propia logica de negocio, entidades de dominio, repositorios y casos de uso, comunicandose con otros modulos exclusivamente a traves de eventos de dominio y comandos. A continuacion se describen los modulos principales y sus responsabilidades."),
  makeTable(
    ["Modulo", "Bounded Context", "Responsabilidad"],
    [
      ["Accounting Engine", "Contabilidad", "Plan de cuentas, asientos contables, partida doble, mayores, balance"],
      ["Billing Service", "Facturacion", "Comprobantes electronicos AFIP, cobros, notas de credito/debito"],
      ["Payments Service", "Tesoreria", "Recibos, pagos a proveedores, conciliacion bancaria"],
      ["Reporting", "Reportes", "Balance de sumas y saldos, flujo de caja, libro diario, libro IVA"],
      ["AI Service", "Inteligencia Artificial", "Clasificacion de gastos, predicciones, alertas, recomendaciones"],
      ["Auth / Tenant / User", "Identidad", "Autenticacion, multi-tenant, roles RBAC, configuracion"],
    ]
  ),
  emptyPara(100),
  h2("5.1 Accounting Engine (Modulo Core)"),
  bodyText(
    "El Accounting Engine es el nucleo del sistema y contiene toda la logica contable fundamental. Gestiona el plan de cuentas de cada tenant con soporte para la estructura jerarquica estandar argentina, permite la creacion y confirmacion de asientos contables bajo el principio de partida doble, y genera los mayores y balances requeridos. Cada asiento contable pasa por un proceso de validacion que verifica el balance entre debitos y creditos, la existencia de las cuentas involucradas, la vigencia del periodo contable y los permisos del usuario. Una vez validado y confirmado, el asiento se vuelve inmutable y se publica un evento journal.entry_posted que otros modulos pueden consumir para actualizar sus estados."
  ),
  h2("5.2 Billing Service"),
  bodyText(
    "El Billing Service gestiona la emision de comprobantes electronicos conforme a las especificaciones de AFIP. Soporta los tipos de comprobante principales: Facturas A, B, C, Notas de Credito, Notas de Debito y Recibos. La integracion con AFIP se realiza a traves del Web Service de Factura Electronica (FEv1/FEv2), manejando la autorizacion, numeracion correlativa y almacenamiento del CAE (Codigo de Autorizacion Electronico). El modulo incluye validaciones de negocio como verificacion de CUIT, limites de facturacion segun categoria de IVA, y control de numeracion por punto de venta. Cada comprobante emitido publica un evento invoice.created que alimenta al Accounting Engine para la generacion automatica del asiento contable correspondiente."
  ),
  h2("5.3 Payments Service"),
  bodyText(
    "El Payments Service gestiona los cobros de clientes y pagos a proveedores, manteniendo un registro detallado de cada transaccion con su vinculo a los comprobantes asociados. Soporta cobros parciales (una factura puede pagarse en multiples cuotas), pagos anticipados, retenciones y percepciones. La conciliacion bancaria permite vincular movimientos de extractos bancarios con los registros internos, identificando automaticamente coincidencias y marcando diferencias para revision manual. El modulo publica eventos payment.received y payment.made que actualizan el estado de comprobantes en el Billing Service y generan asientos contables en el Accounting Engine."
  ),
  h2("5.4 AI Service"),
  bodyText(
    "El modulo de Inteligencia Artificial es el diferencial competitivo principal del producto. Implementa cuatro capacidades centrales: clasificacion automatica de gastos que categoriza transacciones en cuentas contables appropriadas utilizando un modelo entrenado con datos historicos del propio tenant; prediccion de flujo de caja que proyecta ingresos y egresos futuros basandose en patrones estacionales y tendencias historicas; alertas inteligentes que notifican proactivamente sobre situaciones relevantes como liquidez baja, vencimientos proximos o anomalias en el patron de gastos; y recomendaciones de optimizacion fiscal que sugieren estrategias de deduccion y planificacion tributaria personalizadas. Los modelos se ejecutan tanto en tiempo real (clasificacion de gastos al registrar una transaccion) como en batch (predicciones mensuales de flujo de caja)."
  ),
  h2("5.5 Auth / Tenant / User"),
  bodyText(
    "El modulo de Identidad gestiona el registro, autenticacion y autorizacion de usuarios dentro del sistema multi-tenant. Implementa JWT (JSON Web Tokens) con refresh tokens para sesiones seguras, registration flows con verificacion de email, y recuperacion de contrasenias. El control de acceso basado en roles (RBAC) define permisos granulares que determinan que acciones puede realizar cada usuario dentro de su organizacion: administrador, contador, operador, y solo lectura. La gestion de tenants incluye creacion de organizaciones, invitacion de miembros, configuracion del plan de suscripcion, y parametros regionales como moneda, regimen fiscal y localizacion. Un usuario puede pertenecer a multiples tenants con roles diferentes en cada uno."
  ),
  imgParagraph(`${IMG_DIR}/05-bounded-contexts-ddd.png`, 520, 305),
  captionPara("Figura 3: Bounded Contexts - Domain-Driven Design"),
];

// 6. Event-Driven Design
const sec6 = [
  h1("6. Event-Driven Design"),
  h2("6.1 Patrones de Eventos de Dominio"),
  bodyText(
    "El sistema adopta un enfoque event-driven donde los cambios de estado significativos se comunican entre modulos mediante eventos de dominio asincronos. Este patron desacopla los modulos de forma efectiva: el Billing Service no necesita conocer la existencia del Accounting Engine, simplemente publica un evento invoice.created y cualquier modulo interesado reacciona en consecuencia. Esto facilita agregar nuevos modulos o funcionalidades sin modificar el codigo existente, mejorando la mantenibilidad y la capacidad de evolucion del sistema."
  ),
  bodyText(
    "Los eventos de dominio siguen una convencion de nomenclatura estructurada: {aggregate}.{event_type} en pasado (por ejemplo, invoice.created, payment.received, journal.entry_posted). Cada evento contiene un payload con los datos necesarios para que el consumidor reaccione, incluyendo el tenant_id, el aggregate_id, la timestamp y los campos relevantes del cambio de estado. Los eventos son inmutables y se almacenan en un event log para auditoria y replay si es necesario."
  ),
  makeTable(
    ["Evento", "Productor", "Consumidor Potencial", "Trigger"],
    [
      ["invoice.created", "BillingService", "AccountingEngine, Reporting", "Emision de comprobante fiscal"],
      ["invoice.cancelled", "BillingService", "AccountingEngine, Reporting", "Cancelacion o anulacion de comprobante"],
      ["payment.received", "PaymentsService", "BillingService, AccountingEngine", "Registro de cobro de cliente"],
      ["payment.made", "PaymentsService", "AccountingEngine, Reporting", "Registro de pago a proveedor"],
      ["journal.entry_posted", "AccountingEngine", "Reporting, AIService", "Confirmacion de asiento contable"],
      ["user.invited", "AuthModule", "NotificationService", "Invitacion de nuevo usuario a tenant"],
      ["expense.classified", "AIService", "AccountingEngine", "Clasificacion automatica de gasto por IA"],
    ]
  ),
  emptyPara(100),
  h2("6.2 Implementacion: MediatR a Kafka"),
  bodyText(
    "En la etapa de monolito modular, la comunicacion entre modulos se implementa mediante MediatR, una biblioteca .NET que implementa el patron Mediator. Cada evento de dominio tiene un handler (manejador) registrado que reacciona al evento cuando es publicado. Esta implementacion es sincrona en proceso, pero el codigo esta disenado con interfaces abstractas que permiten intercambiar la implementacion por un broker de mensajes sin modificar los handlers de dominio."
  ),
  bodyText(
    "La transicion hacia Kafka se realiza extrayendo los handlers a servicios independientes y reemplazando la publicacion en proceso por produccion de mensajes a topic de Kafka. Cada tipo de evento tiene su propio topic, y los consumidores se agrupan en consumer groups para balancear la carga. La garantia de entrega se configura con exactly-once semantics donde sea critico (asientos contables, comprobantes fiscales) y at-least-once para eventos no criticos (notificaciones, metricas). Los dead letter queues capturan eventos que no pueden procesarse para revision manual y reintento programado."
  ),
  imgParagraph(`${IMG_DIR}/03-flujo-contable-partida-doble.png`, 460, 566),
  captionPara("Figura 4: Flujo Contable de Partida Doble - Event-Driven"),
];

// 7. Diferencial Competitivo (IA)
const sec7 = [
  h1("7. Diferencial Competitivo: Inteligencia Artificial"),
  h2("7.1 Vision Estrategica de IA"),
  bodyText(
    "La integracion de inteligencia artificial no es un complemento superficial del producto sino un pilar estrategico que reDefine la propuesta de valor frente a competidores. Mientras los ERPs tradicionales del mercado argentino se limitan a registrar y reportar datos contables de forma pasiva, nuestro sistema proactivamente asiste al usuario en la toma de decisiones, reduce la carga operativa de tareas repetitivas y anticipa problemas financieros antes de que se materialicen. La IA opera como un contador virtual que trabaja las 24 horas, analizando patrones, detectando anomalias y generando insights que de otro modo requeririan horas de analisis humano."
  ),
  h2("7.2 Clasificacion Automatica de Gastos"),
  bodyText(
    "La primera capacidad de IA implementada es la clasificacion automatica de gastos. Cuando un usuario registra un gasto, el sistema analiza la descripcion, el monto, la fecha y el proveedor para sugerir la cuenta contable correspondiente. El modelo se entaina inicialmente con categorias genericas y luego se personaliza con los datos historicos del propio tenant, aprendiendo sus patrones de gasto y preferencias de clasificacion. A medida que el usuario confirma o corrige las sugerencias, el modelo mejora iterativamente, alcanzando precisiones superiores al 90% tras un periodo de calibracion de aproximadamente 4 a 6 semanas de uso regular. Esta funcionalidad reduce drasticamente el tiempo de carga de gastos y minimiza errores de clasificacion que suelen generar inconsistencias en los balances."
  ),
  h2("7.3 Prediccion de Flujo de Caja"),
  bodyText(
    "El motor de prediccion de flujo de caja utiliza modelos de series temporales que analizan los historicos de ingresos y egresos de la empresa para proyectar el flujo futuro con horizontes de 30, 60 y 90 dias. El modelo considera estacionalidad, tendencias de crecimiento, pagos recurrentes (alquileres, servicios, salarios), vencimientos fiscales conocidos y el pipeline de facturas emitidas pendientes de cobro. Las predicciones se presentan en el dashboard principal con graficos interactivos que muestran tres escenarios: optimista, esperado y pesimista, permitiendo al usuario planificar decisiones financieras con mayor certeza."
  ),
  h2("7.4 Alertas Inteligentes"),
  bodyText(
    "El sistema de alertas inteligentes monitorea continuamente los indicadores financieros del tenant y notifica proactivamente cuando detecta situaciones que requieren atencion. Las alertas incluyen: liquidez proyectada por debajo de un umbral critico en los proximos 30 dias, facturas vencidas sin cobro, gastos inusuales que se desvian significativamente del patron historico, vencimientos de impuestos proximos, y oportunidades de deduccion fiscal identificadas por el modelo. Las alertas se entregan via email y notificaciones in-app con diferentes niveles de urgencia, y el usuario puede configurar sus preferencias de notificacion y umbrales personalizados."
  ),
  h2("7.5 Recomendaciones de Optimizacion"),
  bodyText(
    "El modulo de recomendaciones genera sugerencias personalizadas de optimizacion fiscal y financiera basadas en el perfil del tenant, su historial contable y la normativa vigente. Las recomendaciones incluyen: sugerencias de categorias de gastos elegibles para deduccion, oportunidades para anticipar o diferir gastos segun la proyeccion de utilidades, alertas sobre cambios recientes en la normativa AFIP que podrian impactar al tenant, y recomendaciones de estructura societaria o de regimen fiscal (monotributo vs. responsable inscripto) basadas en el volumen de operaciones. Cada recomendacion incluye una explicacion clara del beneficio esperado y los pasos necesarios para implementarla, con enlaces directos a las secciones relevantes del sistema."
  ),
];

// 8. Roadmap de Desarrollo
const sec8 = [
  h1("8. Roadmap de Desarrollo"),
  bodyText(
    "El roadmap de desarrollo sigue una estrategia incremental y iterativa, dividida en fases que entregan valor funcional progresivo. Cada fase esta disenada para producir un producto util y potencialmente entregable, siguiendo los principios del desarrollo agil y la metodologia Scrum. Las fases iniciales se enfocan en construir los cimientos tecnicos y el modulo minimo funcional, mientras que las fases avanzadas agregan diferenciadores competitivos como la inteligencia artificial y las integraciones avanzadas."
  ),
  makeTable(
    ["Fase", "Nombre", "Duracion", "Entregables Clave"],
    [
      ["Fase 0", "Fundamentos", "3-5 dias", "Repo, CI/CD, Docker, scaffolding, limpieza de codigos"],
      ["Fase 1", "Auth + Core", "3-4 semanas", "Multi-tenant, auth JWT, Accounting Engine, CRUD cuentas/asientos"],
      ["Fase 2", "Facturacion + Eventos", "3-5 semanas", "Comprobantes AFIP, MediatR, eventos dominio, web services"],
      ["Fase 3", "Tesoreria + Proveedores", "3-5 semanas", "Recibos, pagos, conciliacion, ordenes de compra"],
      ["Fase 4", "IA + Dashboard", "1-2 meses", "Clasificacion gastos, prediccion flujo, alertas, dashboard Next.js"],
      ["Fase 5", "Escalabilidad", "1 mes", "Kafka, Kubernetes, monitoring, tests de carga"],
      ["Fase 6", "Go-to-Market", "Continuo", "Landing, onboarding, soporte, feedback loop"],
    ]
  ),
  emptyPara(100),
  h2("8.1 Fase 0: Fundamentos (3-5 dias)"),
  bodyText(
    "La fase de fundamentos establece la infraestructura tecnica base del proyecto. Incluye la creacion del repositorio de codigo con estructura de carpetas alineada a Clean Architecture, la configuracion de pipelines de CI/CD (GitHub Actions o Azure DevOps), la preparacion de entornos Docker para desarrollo local consistente, el scaffolding del backend en .NET 8 con Swagger, y la configuracion del frontend en Next.js 15 con Tailwind CSS. Tambien se realizan las configuraciones iniciales de PostgreSQL con migraciones de Entity Framework y la preparacion del entorno de staging. Esta fase es puramente tecnica y no produce funcionalidades visibles para el usuario final."
  ),
  h2("8.2 Fase 1: Auth + Core (3-4 semanas)"),
  bodyText(
    "La primera fase funcional implementa el modulo de autenticacion y el nucleo del Accounting Engine. Se desarrolla el registro e inicio de sesion con JWT, la gestion multi-tenant con aislamiento de datos, los roles y permisos RBAC basicos (admin, operador, solo lectura), y el CRUD completo del plan de cuentas. El Accounting Engine incluye la creacion de asientos contables con validacion de partida doble, la confirmacion de asientos (posting) con inmutabilidad, y la generacion de consultas de mayor y balance de sumas y saldos. Esta fase produce el primer producto funcional: un sistema capaz de gestionar la contabilidad basica de una organizacion."
  ),
  h2("8.3 Fase 2: Facturacion + Eventos (3-5 semanas)"),
  bodyText(
    "La segunda fase agrega la capacidad de emision de comprobantes electronicos y la infraestructura de eventos de dominio. Se implementa la integracion con los Web Services de AFIP para facturacion electronica (FEv1), el modulo de emision de facturas A/B/C con generacion de CAE, las notas de credito y debito, y la vinculacion automatica entre comprobantes y asientos contables. Paralelamente, se introduce MediatR como mecanismo de comunicacion entre modulos, los primeros eventos de dominio (invoice.created, journal.entry_posted) y el logging estructurado. El frontend muestra la interfaz de facturacion y un listado basico de comprobantes emitidos."
  ),
  h2("8.4 Fase 3: Tesoreria + Proveedores (3-5 semanas)"),
  bodyText(
    "La tercera fase implementa el Payments Service con gestion completa de cobros y pagos. Incluye la emision de recibos de cobro vinculados a facturas, el registro de pagos a proveedores con retenciones, la conciliacion bancaria con carga de extractos y matching automatico, y un dashboard basico de tesoreria con saldo actual y proyecciones. Se agregan ordenes de compra como modulo auxiliar para el ciclo completo de compras: solicitud, aprobacion, orden, recepcion y facturacion. Los eventos payment.received y payment.made alimentan la generacion automatica de asientos contables y actualizan el estado de comprobantes en el Billing Service."
  ),
  h2("8.5 Fase 4: IA + Dashboard (1-2 meses)"),
  bodyText(
    "La cuarta fase introduce el diferencial competitivo de inteligencia artificial y el dashboard integral en Next.js. Se implementa la clasificacion automatica de gastos con un modelo de NLP, la prediccion de flujo de caja con modelos de series temporales, el sistema de alertas inteligentes con notificaciones email e in-app, y las recomendaciones de optimizacion fiscal. El dashboard muestra graficos interactivos de flujo de caja, balances, cuentas por cobrar y pagar, y KPIs financieros clave. Esta fase transforma el producto de un ERP contable estandar en una plataforma inteligente de gestion financiera."
  ),
  h2("8.6 Fases 5 y 6: Escalabilidad y Go-to-Market"),
  bodyText(
    "La fase 5 se enfoca en preparar la plataforma para produccion a escala: migracion de eventos a Kafka, containerizacion completa, despliegue en Kubernetes, implementacion de monitoring y alertas operativas, pruebas de carga, y optimizacion de queries y cache. La fase 6 es continua e incluye el desarrollo de la pagina de marketing, el flujo de onboarding guiado para nuevos usuarios, la documentacion de ayuda, el sistema de soporte, y la captura y analisis sistematica de feedback para priorizar el desarrollo posterior."
  ),
  imgParagraph(`${IMG_DIR}/04-roadmap-de-desarrollo.png`, 440, 833),
  captionPara("Figura 5: Roadmap de Desarrollo - Fases y Entregables"),
];

// 9. Stack Tecnologico
const sec9 = [
  h1("9. Stack Tecnologico"),
  h2("9.1 Criterios de Seleccion"),
  bodyText(
    "La seleccion del stack tecnologico se basa en cinco criterios principales: productividad del desarrollador (tiempo de desarrollo vs. valor entregado), performance y escalabilidad (capacidad de crecer con la base de usuarios), ecosistema y comunidad (disponibilidad de librerias, documentacion y soporte), madurez y estabilidad (tecnologias probadas en produccion con roadmap claro), y afinidad del equipo (experiencia previa y curva de aprendizaje). La combinacion de .NET 8 en el backend y Next.js en el frontend ofrece un balance optimo entre rendimiento, productividad y ecosistema, mientras que PostgreSQL y Kafka son soluciones maduras y confiables para persistencia y mensajeria."
  ),
  makeTable(
    ["Capa", "Tecnologia", "Justificacion"],
    [
      ["Backend", ".NET 8 (C#)", "Alto rendimiento, tipado fuerte, ecosistema empresarial maduro"],
      ["Frontend", "Next.js 15 (React)", "SSR/SSG, App Router, ecosistema NPM, excelente DX"],
      ["Estilos", "Tailwind CSS 4", "Utility-first, diseo rapido, consistencia visual"],
      ["Base de datos", "PostgreSQL 16", "Relacional, soporte JSONB, RLS, extensions, maduro"],
      ["Cache", "Redis", "Cache en memoria, sesiones, pub/sub, alta performance"],
      ["Mensajeria", "Apache Kafka", "Event streaming, escalabilidad horizontal, persistencia"],
      ["ORM", "Entity Framework Core", "Migrations, LINQ, multi-tenant query filters"],
      ["Contenedores", "Docker + K8s", "Containerizacion estandar, orquestacion y escalabilidad"],
      ["Cloud", "Azure / AWS", "Infraestructura global, servicios gestionados, compliance"],
      ["CI/CD", "GitHub Actions", "Integracion nativa con repos, workflows flexibles"],
      ["Auth", "JWT + Refresh Tokens", "Stateless auth, escalabilidad, estandar de industria"],
      ["IA/ML", "Python + ONNX Runtime", "Modelos de NLP y series temporales, inferencia eficiente"],
    ]
  ),
  emptyPara(100),
  h2("9.2 Arquitectura de Despliegue"),
  bodyText(
    "El entorno de produccion se despliega en Azure (o AWS como alternativa) utilizando Kubernetes como orquestador de contenedores. El backend .NET se ejecuta en contenedores Linux optimizados con runtime AOT para minimizar el consumo de memoria y maximizar el rendimiento de inicio. Next.js se despliega en modo standalone con un servidor Node.js dedicado, aprovechando el ISR (Incremental Static Regeneration) para paginas de marketing y el SSR (Server-Side Rendering) para el dashboard. PostgreSQL se gestiona mediante Azure Database for PostgreSQL con extensiones requeridas (pg_trgm, pgcrypto) y backups automaticos. Redis se implementa como Azure Cache for Redis con clustering para alta disponibilidad. Todos los servicios se comunican a traves de una red privada de Kubernetes, exponiendo solo los endpoints necesarios via un Ingress Controller con terminacion TLS."
  ),
];

// 10. Modelo de Monetizacion
const sec10 = [
  h1("10. Modelo de Monetizacion"),
  h2("10.1 Estrategia de Precios"),
  bodyText(
    "El modelo de monetizacion se basa en suscripciones mensuales con tres niveles de servicio, alineados con las necesidades y capacidades de pago de los segmentos objetivo. Los precios estan denominados en dolares estadounidenses para proteger el valor contra la volatilidad cambiaria de la region. Cada plan incluye un limite de operaciones mensuales, usuarios simultaneos, funcionalidades habilitadas y nivel de soporte. Se ofrece un periodo de prueba gratuito de 14 dias con acceso completo al plan Pro, sin requerimiento de tarjeta de credito."
  ),
  makeTable(
    ["Caracteristica", "Basico ($10-20 USD/mes)", "Pro ($30-50 USD/mes)", "Empresa ($100+ USD/mes)"],
    [
      ["Usuarios", "1-2", "Hasta 5", "Ilimitados"],
      ["Operaciones/mes", "100", "1,000", "Ilimitadas"],
      ["Facturacion electronica", "No", "Si (AFIP)", "Si (AFIP + multi-jurisdiccion)"],
      ["Clasificacion IA", "No", "Si", "Si + modelos personalizados"],
      ["Prediccion flujo de caja", "No", "30 dias", "90 dias + escenarios custom"],
      ["Dashboard financiero", "Basico", "Completo", "Completo + white-label"],
      ["Reportes", "Estandar", "Avanzados + export", "Custom + API"],
      ["Soporte", "Email (48hs)", "Email + chat (24hs)", "Dedicado + SLA"],
      ["API Access", "No", "Read-only", "Full CRUD"],
      ["SSO / SAML", "No", "No", "Si"],
    ]
  ),
  emptyPara(100),
  h2("10.2 Proyecciones de Ingresos"),
  bodyText(
    "Con base en un crecimiento orgánico y las metas de adquisicion de usuarios para el primer ano, se proyecta alcanzar 500 usuarios activos al finalizar los primeros 12 meses, distribuidos aproximadamente en 300 planes Basico, 170 planes Pro y 30 planes Empresa. Esto generaria un ingreso mensual recurrente (MRR) estimado entre USD 10,000 y USD 15,000, con margen bruto superior al 80% dado el modelo SaaS y la eficiencia de la infraestructura cloud. El punto de equilibrio se estima entre el mes 8 y 12, dependiendo de la velocidad de adquisicion de usuarios del plan Pro y Empresa, que tienen mayor margen de contribucion."
  ),
  h2("10.3 Estrategia de Upsell"),
  bodyText(
    "La estrategia de upsell se basa en la activacion natural de usuarios que superan los limites de su plan actual. Cuando un usuario del plan Basico alcanza el limite de 100 operaciones mensuales, recibe una notificacion sugerendo el upgrade al plan Pro con un descuento del 20% en el primer mes. De forma similar, las empresas que requieren mas de 5 usuarios o integracion via API son naturalmente canalizadas hacia el plan Empresa. Adicionalmente, se ofrecen funcionalidades premium como modelos de IA personalizados y reportes a medida como add-ons opcionales para cualquier plan, generando ingresos incrementales sin modificar la estructura de planes base."
  ),
];

// 11. Analisis de Competencia
const sec11 = [
  h1("11. Analisis de Competencia"),
  h2("11.1 Panorama Competitivo"),
  bodyText(
    "El mercado argentino de software contable para PYMES esta dominado por soluciones locales con amplia trayectoria, siendo Tango Gestion y Bejerman los referentes principales. Estas plataformas ofrecen funcionalidades completas de ERP pero presentan debilidades significativas en areas como experiencia de usuario, adopcion de tecnologias modernas, modelo de precios y flexibilidad de despliegue. La oportunidad para nuestro producto radica en cubrir las brechas que estas soluciones dejan abiertas, particularmente en el segmento de freelancers y pequenas empresas que no necesitan ni pueden costear un ERP completo pero requieren herramientas profesionales de gestion contable."
  ),
  makeTable(
    ["Criterio", "ERP Contable Inteligente", "Tango Gestion", "Bejerman"],
    [
      ["Modelo", "SaaS cloud", "Desktop + cloud limitado", "Desktop + cloud"],
      ["Precio", "$10-100 USD/mes", "Desde ~$50,000 ARS/mes", "Desde ~$30,000 ARS/mes"],
      ["Instalacion", "No requiere", "Si (desktop) o servidor", "Si (desktop) o servidor"],
      ["UX / UI", "Web moderna, responsive", "Interfaz clasica de escritorio", "Interfaz clasica de escritorio"],
      ["IA integrada", "Si (clasificacion, prediccion)", "No", "No"],
      ["Actualizaciones", "Continuas (deploy automatico)", "Parches periodicos", "Parches periodicos"],
      ["API abierta", "Si (Planes Pro/Empresa)", "Limitada", "Limitada"],
      ["Multi-tenant", "Si (nativo)", "No (instancia por cliente)", "No (instancia por cliente)"],
      ["Onboarding", "Self-service, minutos", "Requiere capacitacion", "Requiere capacitacion"],
      ["Segmento PYME", "Foco principal", "Empresas medianas/grandes", "Empresas medianas"],
    ]
  ),
  emptyPara(100),
  h2("11.2 Ventajas Competitivas"),
  bodyText(
    "Nuestras principales ventajas competitivas son: (1) Experiencia de usuario web moderna y responsive que permite acceder desde cualquier dispositivo sin instalacion, reduciendo dramaticamente la barrera de entrada; (2) Inteligencia artificial integrada como diferencial unico en el mercado, no disponible en ninguno de los competidores actuales; (3) Modelo de suscripcion accesible en dolares con periodo de prueba gratuita, eliminando la necesidad de inversion inicial significativa; (4) Despliegue continuo que garantiza acceso inmediato a nuevas funcionalidades y actualizaciones normativas sin intervención del usuario; (5) Arquitectura cloud-native con API abierta que permite integraciones con herramientas de productividad, CRM y otros servicios que el ecosistema del usuario ya utiliza."
  ),
  h2("11.3 Riesgos Competitivos"),
  bodyText(
    "Los principales riesgos competitivos incluyen la posible reaccion de competidores establecidos (Tango, Bejerman) que podrian acelerar sus propios procesos de modernizacion cloud o incorporar funcionalidades de IA, la entrada de jugadores internacionales (QuickBooks, Xero) al mercado argentino, y la resistencia de los usuarios a migrar desde plataformas establecidas con las que ya estan familiarizados. Las estrategias de mitigacion incluyen: enfocarse primero en segmentos desatendidos por los competidores (freelancers, monotributistas), construir una comunidad activa de usuarios que genere network effects, y mantener un ciclo de desarrollo rapido que permita incorporar mejoras antes de que los competidores reaccionen."
  ),
];

// 12. Estrategia Go-to-Market
const sec12 = [
  h1("12. Estrategia Go-to-Market"),
  h2("12.1 Enfoque Bottom-Up"),
  bodyText(
    "La estrategia de entrada al mercado sigue un enfoque bottom-up que comienza con los segmentos mas accesibles y expande progresivamente hacia arriba. La primera ola de usuarios objetivo esta compuesta por freelancers y monotributistas que actualmente gestionan su contabilidad de forma manual con herramientas genericas como Excel o Google Sheets, o que no la gestionan de forma sistematica. Este segmento es atractivo porque tiene una necesidad clara pero no satisfecha, baja barrera de adopcion (decision individual, sin aprobacion gerencial), alta sensibilidad al precio (nuestro plan Basico es competitivo), y alto potencial de viralidad dentro de comunidades de freelancers y emprendedores."
  ),
  h2("12.2 Canales de Adquisicion"),
  bodyText(
    "Los canales de adquisicion iniciales se concentran en marketing digital y contenido educativo. El SEO con contenido dirigido a consultas como 'como facturar como monotributista', 'mejor software contable para freelancers argentina' y 'emision de factura electronica AFIP' captura demanda organica con alta intencion de compra. El contenido en redes sociales (LinkedIn, Twitter/X, Instagram) educa sobre temas contables y fiscales mientras posiciona el producto como solucion. Las alianzas con comunidades de freelancers, coworkings y aceleradoras de startups proporcionan acceso directo al segmento objetivo. La estrategia de product-led growth incluye invitar a colegas como mecanismo de crecimiento viral, con incentivos como meses gratuitos por referidos exitosos."
  ),
  h2("12.3 Expansion a Estudios Contables"),
  bodyText(
    "Una vez consolidada la base de usuarios individuales, la segunda fase de go-to-market se dirige a estudios contables como canal de distribucion. Los contadores que gestionan las finanzas de multiples clientes pueden convertirse en multiplicadores del producto: al adoptar la plataforma para sus propios clientes, cada nuevo estudio contable incorpora decenas de organizaciones al sistema. El plan Empresa esta disenado especificamente para este segmento, con funcionalidades de gestion multi-cliente, consolidacion de reportes, branding personalizado (white-label) y un nivel de soporte dedicado. La estrategia de venta a estudios contables requiere un enfoque B2B con demostraciones personalizadas, periodos de prueba extendidos y accompanamiento en la migracion desde sistemas existentes."
  ),
  h2("12.4 Metricas Clave de Growth"),
  bodyText(
    "Las metricas clave para medir el exito de la estrategia go-to-market incluyen: Customer Acquisition Cost (CAC), target por debajo de USD 50 para plan Basico y USD 150 para plan Pro; Monthly Recurring Revenue (MRR) growth rate, target del 15-20% mensual; Churn rate, target por debajo del 5% mensual; Net Promoter Score (NPS), target superior a 40; Time to Value (TTV), target de que el usuario emita su primera factura dentro de los 30 minutos de registro; y Activation rate, porcentaje de usuarios de prueba que se convierten en pagantes, target del 15-20%."
  ),
];

// 13. Riesgos y Mitigaciones
const sec13 = [
  h1("13. Riesgos y Mitigaciones"),
  h2("13.1 Riesgos Regulatorios y Normativos"),
  bodyText(
    "El mayor riesgo del proyecto es la dependencia de las normativas de AFIP, que pueden cambiar de forma repentina y sin periodo de transicion significativo. Argentina tiene un historial de cambios frecuentes en la legislacion fiscal, incluyendo modificaciones a alicuotas de IVA, cambios en los regimenes de retencion, nuevas obligaciones de informacion y actualizaciones a los web services de facturacion electronica. Un cambio normativo puede invalidar funcionalidades existentes del sistema o requerir desarrollo urgente para mantener la conformidad. La mitigacion incluye: diseno modular que aisla la logica fiscal en un servicio dedicado facil de actualizar, monitoreo activo de comunicaciones de AFIP con alertas automaticas ante cambios relevantes, sistema de feature flags que permite activar rapidamente nuevas versiones de logica fiscal, y mantenimiento de un buffer de capacidad de desarrollo para emergencias regulatorias."
  ),
  h2("13.2 Complejidad Contable"),
  bodyText(
    "La contabilidad argentina presenta un nivel de complejidad significativamente superior al de otros paises, con multiples regimenes impositivos superpuestos (IVA, Ganancias, IIBB, Bienes Personales), retenciones y percepciones en multiples niveles (nacional, provincial, municipal), y particularidades como el regimen de facturacion electronica con multiples tipos de comprobante y categorias de IVA. El riesgo de implementar incorrectamente una regla contable o fiscal puede resultar en errores que impacten al usuario final ante AFIP. La mitigacion incluye: revision exhaustiva de cada regla de negocio por un contador publico antes de su implementacion, suite de tests automatizados con escenarios reales validados por profesionales, y proceso de release con validacion dual (tecnica + contable) para cualquier cambio en logica fiscal."
  ),
  h2("13.3 Edge Cases y Escenarios Limites"),
  bodyText(
    "Los sistemas contables son particularmente sensibles a edge cases que pueden no ser evidentes durante el desarrollo pero que aparecen con frecuencia en produccion. Ejemplos incluyen: asientos de cierre de ejercicio con ajustes de inflacion, facturas con multiple formas de pago (parcial tarjeta, parcial transferencia), comprobantes de moneda extranjera con conversion a pesos al tipo de cambio del dia, operaciones con retenciones de multiple jurisdiccion simultanea, y procesamiento de notas de credito que afectan multiple facturas. La mitigacion incluye: banco de datos de escenarios reales obtenidos de contadores colaboradores, testing exploratorio sistematico con usuarios beta antes de cada release, y mecanismo de feedback in-app que permite a los usuarios reportar comportamientos inesperados con captura automatica del contexto y los datos involucrados."
  ),
  h2("13.4 Riesgos de UX y Adopcion"),
  bodyText(
    "Un riesgo critico es que la complejidad inherente de la gestion contable se refleje negativamente en la experiencia de usuario, generando friccion en el onboarding, confusion en el uso diario y eventual abandono. Los ERPs tradicionales sufren de este problema: funcionales pero intimidantes para usuarios no contables. La mitigacion incluye: enfoque en progressive disclosure, mostrando solo la informacion necesaria en cada momento y revelando complejidad gradualmente segun el nivel del usuario; onboarding guiado interactivo que ensena los conceptos basicos mientras el usuario completa las primeras tareas; wizards contextuales que asisten paso a paso en procesos complejos como la emision de la primera factura o la carga del primer gasto; y ciclo continuo de user research con entrevistas, sesiones de usabilidad y analisis de grabaciones de sesiones para identificar y corregir puntos de friccion."
  ),
  makeTable(
    ["Riesgo", "Probabilidad", "Impacto", "Estrategia de Mitigacion"],
    [
      ["Cambios normativos AFIP", "Alta", "Alto", "Servicio fiscal aislado, feature flags, buffer de capacidad"],
      ["Complejidad contable erronea", "Media", "Critico", "Revision por contador, tests automatizados, release dual"],
      ["Edge cases no previstos", "Alta", "Medio", "Banco de escenarios, testing exploratorio, feedback in-app"],
      ["Friccion UX / baja adopcion", "Media", "Alto", "Progressive disclosure, onboarding guiado, user research"],
      ["Reaccion de competidores", "Media", "Medio", "Foco en segmentos desatendidos, desarrollo rapido, comunidad"],
      ["Problemas de escalabilidad", "Baja", "Alto", "Arquitectura modular, tests de carga, monitoring proactivo"],
      ["Fallo de servicios AFIP", "Media", "Alto", "Circuit breaker, colas de reintento, comunicacion proactiva"],
      ["Brecha de seguridad multi-tenant", "Baja", "Critico", "RLS PostgreSQL, middleware tenant, audits de seguridad"],
    ]
  ),
  emptyPara(100),
  h2("13.5 Plan de Contingencia General"),
  bodyText(
    "El plan de contingencia general incluye protocolos para cada tipo de riesgo identificado. Para riesgos de seguridad, se tiene un plan de respuesta a incidentes con tiempos de deteccion y resolucion definidos, backups diarios con retencion de 30 dias y restauracion testada mensualmente, y politicas de acceso con principio de minimo privilegio y autenticacion multi-factor para cuentas administrativas. Para riesgos operativos, se mantiene un runbook actualizado con procedimientos de recovery ante fallos de base de datos, caida de servicios de mensajeria y fallos de integracion con servicios externos. Para riesgos regulatorios, se mantiene un canal directo de comunicacion con expertos en normativa tributaria y un proceso escalonado de actualizacion que permite desplegar parches criticos en menos de 4 horas."
  ),
];

// ─── BUILD DOCUMENT ───
const bodyChildren = [
  // TOC
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 200, line: LINE_SPACING, lineRule: "atLeast" },
    children: [new TextRun({ text: "Indice", font: FONT, size: 32, bold: true, color: P.bg })],
  }),
  new TableOfContents("Indice", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ spacing: { before: 100, after: 0 }, children: [new TextRun({ text: "", size: 2 }), new PageBreak()] }),
  // All sections
  ...sec1,
  ...sec2,
  ...sec3,
  ...sec4,
  ...sec5,
  ...sec6,
  ...sec7,
  ...sec8,
  ...sec9,
  ...sec10,
  ...sec11,
  ...sec12,
  ...sec13,
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: BODY_SIZE, color: P.body },
        paragraph: { spacing: { line: LINE_SPACING, lineRule: "atLeast" } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, color: P.bg, font: FONT },
        paragraph: { spacing: { before: 400, after: 200, line: LINE_SPACING, lineRule: "atLeast" } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, color: P.bg, font: FONT },
        paragraph: { spacing: { before: 300, after: 150, line: LINE_SPACING, lineRule: "atLeast" } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, color: P.bg, font: FONT },
        paragraph: { spacing: { before: 200, after: 100, line: LINE_SPACING, lineRule: "atLeast" } },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "heading-numbering",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 0, hanging: 0 } } } },
        ],
      },
    ],
  },
  sections: [
    coverSection,
    {
      properties: {
        ...bodyPageProps,
        titlePage: false,
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "ERP Contable Inteligente | PRD v1.0", font: FONT, size: 16, color: "94A3B8", italics: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Pagina ", font: FONT, size: 18, color: "94A3B8" }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "94A3B8" }),
              ],
            }),
          ],
        }),
      },
      children: bodyChildren,
    },
  ],
});

// ─── SAVE ───
async function main() {
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/ERP-Contable-Inteligente-PRD.docx", buffer);
  const stats = fs.statSync("/home/z/my-project/download/ERP-Contable-Inteligente-PRD.docx");
  console.log(`SUCCESS: File saved (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch(err => { console.error("ERROR:", err); process.exit(1); });
