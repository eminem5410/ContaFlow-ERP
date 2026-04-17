export interface HelpArticle {
  id: string
  category: string
  title: string
  content: string
}

export interface HelpCategory {
  id: string
  name: string
  icon: string
  articles: HelpArticle[]
}

export const helpCategories: HelpCategory[] = [
  {
    id: "contabilidad",
    name: "Contabilidad",
    icon: "BookOpen",
    articles: [
      {
        id: "crear-asiento",
        category: "contabilidad",
        title: "Crear asiento contable",
        content: `Para crear un asiento contable en ContaFlow, primero debés dirigirte al módulo "Asientos Contables" desde el menú lateral izquierdo. Una vez allí, hacé clic en el botón "Nuevo Asiento" ubicado en la esquina superior derecha de la pantalla. Se abrirá un formulario donde deberás completar los datos principales del asiento, como la fecha, el número de asiento (que se genera automáticamente pero puede modificarse), y una descripción o concepto que identifique la operación registrada.

El siguiente paso es cargar las líneas del asiento. Cada línea representa un movimiento en una cuenta contable específica. Hacé clic en "Agregar línea" y seleccioná la cuenta del plan contable utilizando el buscador desplegable. El sistema te mostrará sugerencias mientras escribís el nombre o código de la cuenta. Ingresá el monto en la columna correspondiente: debe o haber. Recordá que la suma total del debe debe ser igual a la suma total del haber para que el asiento quede cuadrado.

ContaFlow valida automáticamente que el asiento esté balanceado antes de permitirte guardarlo. Si la suma de los débitos no coincide con la de los créditos, el sistema mostrará una advertencia en rojo indicando la diferencia. También podés asignar un centro de costo a cada línea si tu empresa utiliza esa clasificación. Esto permite generar reportes más detallados por área o departamento.

Una vez que todas las líneas están cargadas y el asiento está cuadrado, revisá la información en el panel de resumen que aparece en la parte inferior del formulario. Allí podrás ver un desglose con el total de débitos, créditos y la diferencia. Si todo es correcto, hacé clic en "Guardar". El asiento quedará registrado con estado "Borrador" y se sumará automáticamente a los libros contables correspondientes.

Si necesitás modificar un asiento ya guardado, podés hacerlo mientras tenga estado "Borrador". Simplemente hacé clic en el asiento desde la lista, realizá los cambios necesarios y guardá nuevamente. Una vez que un asiento es confirmado, no se puede editar directamente; en su lugar, deberás generar un asiento de reversión para corregir el error. Esto garantiza la integridad del registro contable y mantiene un historial completo de todas las operaciones.`,
      },
      {
        id: "armar-plan-cuentas",
        category: "contabilidad",
        title: "Armar plan de cuentas",
        content: `El plan de cuentas es la columna vertebral de tu sistema contable. En ContaFlow podés crear tu plan desde cero o importar una plantilla predefinida que se adapte al tipo de empresa (servicios, comercio, industria, etc.). Para acceder, dirigite al módulo "Plan de Cuentas" en el menú lateral. La pantalla principal te mostrará la estructura actual de cuentas organizada en forma de árbol jerárquico.

Para crear una nueva cuenta, hacé clic en el botón "Nueva Cuenta". Deberás completar los siguientes campos: código de cuenta (que sigue una estructura numérica, por ejemplo 1.1.1 para subcuentas de Activo Corriente), nombre de la cuenta, tipo de cuenta (Activo, Pasivo, Patrimonio Neto, Ingreso o Egreso), y la cuenta padre si es una subcuenta. El sistema validará que el código sea coherente con la estructura existente.

Es recomendable seguir un orden lógico al crear las cuentas. Los activos generalmente comienzan con el código 1, los pasivos con 2, el patrimonio neto con 3, los ingresos con 4 y los egresos con 5. Dentro de cada grupo, podés crear subcuentas con niveles adicionales. Por ejemplo, dentro de "Activo Corriente" (1.1) podés tener "Caja y Bancos" (1.1.1), "Cuentas por Cobrar" (1.1.2), etc.

ContaFlow te permite definir si una cuenta acepta imputaciones directas o si es solo una cuenta de agrupación (cuenta padre). Las cuentas de agrupación no pueden recibir asientos directamente; solo sus subcuentas. Esto es útil para mantener el orden en tus reportes, ya que el balance general mostrará los totales de cada cuenta padre calculados automáticamente a partir de sus subcuentas.

Además, podés importar tu plan de cuentas desde un archivo Excel. Prepará un archivo con las columnas "Código", "Nombre" y "Tipo", y utilizá la función "Importar desde Excel" en el módulo. El sistema validará la estructura antes de importar y te mostrará un resumen de las cuentas que se crearán. Si detecta conflictos (códigos duplicados, tipos inválidos), te lo indicará para que puedas corregirlos antes de confirmar la importación.

Por último, si tu empresa ya tiene un plan de cuentas definido en otro sistema, podés solicitar a nuestro equipo de soporte una migración personalizada. Nuestro equipo se encargará de mapear tus cuentas actuales al formato de ContaFlow, asegurando que no se pierda información y que la transición sea lo más fluida posible.`,
      },
      {
        id: "tipos-de-cuentas",
        category: "contabilidad",
        title: "Tipos de cuentas contables",
        content: `En ContaFlow, cada cuenta del plan contable debe tener asignado un tipo que determina su comportamiento en los reportes y balances. Los cinco tipos principales son: Activo, Pasivo, Patrimonio Neto, Ingreso y Egreso. Comprender la diferencia entre ellos es fundamental para armar un plan de cuentas correcto y obtener reportes confiables.

Las cuentas de Activo representan todo lo que la empresa posee o tiene derecho a cobrar. Se subdividen en Activo Corriente (bienes y derechos realizables dentro del ejercicio, como caja, bancos, cuentas por cobrar) y Activo No Corriente (bienes de uso prolongado como inmuebles, rodados, equipos). Los activos tienen saldo naturaleza deudor, es decir, aumentan por el debe y disminuyen por el haber.

Las cuentas de Pasivo representan las obligaciones de la empresa con terceros. Al igual que los activos, se dividen en Pasivo Corriente (deudas vencibles dentro del ejercicio, como proveedores, impuestos a pagar) y Pasivo No Corriente (deudas a largo plazo como préstamos bancarios). Las cuentas de pasivo tienen saldo naturaleza acreedor: aumentan por el haber y disminuyen por el debe.

El Patrimonio Neto incluye las cuentas que representan los aportes de los dueños y los resultados acumulados de la empresa. Ejemplos típicos son: Capital Social, Reservas, Resultados del Ejercicio Anterior y Resultado del Ejercicio Actual. Estas cuentas también tienen naturaleza acreedor, igual que los pasivos.

Las cuentas de Ingreso registran todas las entradas de dinero o derechos que incrementan el patrimonio de la empresa por su actividad principal o secundaria. Por ejemplo: Ventas, Intereses Ganados, Alquileres Cobrados. Aumentan por el haber y disminuyen por el debe. Al cierre del ejercicio, su saldo se traslada a la cuenta de Resultado del Ejercicio.

Finalmente, las cuentas de Egreso registran las salidas de recursos o los consumos que reducen el patrimonio. Incluyen: Costo de Ventas, Gastos de Personal, Servicios, Alquileres Pagados, Impuestos. Funcionan de manera inversa a las de ingreso: aumentan por el debe y disminuyen por el haber. Al cierre, su saldo neto se traslada a Resultado del Ejercicio para determinar la ganancia o pérdida del período.`,
      },
      {
        id: "libro-diario",
        category: "contabilidad",
        title: "Libro Diario",
        content: `El Libro Diario es uno de los registros contables obligatorios más importantes. En ContaFlow, se genera automáticamente a partir de todos los asientos contables que registrás en el sistema. Para acceder al Libro Diario, navegá hasta el módulo "Libro Diario" en el menú lateral. La pantalla principal te mostrará una lista cronológica de todos los asientos, organizados por fecha.

Cada entrada del Libro Diario incluye la fecha del asiento, el número de asiento, el concepto o descripción, y el detalle de las cuentas afectadas con sus respectivos montos en las columnas de Debe y Haber. Podés filtrar la vista por rango de fechas utilizando el selector de período en la parte superior, lo cual es útil para revisar las operaciones de un mes o trimestre específico.

Para buscar un asiento en particular, utilizá la barra de búsqueda que permite filtrar por concepto, número de asiento o cuenta. También podés filtrar por estado del asiento (Borrador, Confirmado, Revertido). El sistema muestra un totalizador al pie de cada página con la suma de débitos y créditos del período seleccionado, lo que te permite verificar rápidamente que el libro esté cuadrado.

ContaFlow te permite exportar el Libro Diario en formato Excel o PDF. Para hacerlo, hacé clic en el botón "Exportar" y seleccioná el formato deseado. El archivo incluirá todos los filtros que hayas aplicado, con un formato profesional que respetá las disposiciones de la AFIP para los libros contables digitales. El PDF incluye encabezado con datos de la empresa y numeración de páginas.

Es importante recordar que el Libro Diario en ContaFlow es de registro obligatorio y no se puede eliminar o modificar directamente. Si detectás un error en un asiento, la forma correcta de corregirlo es generando un asiento de reversión que anule el asiento incorrecto y, si es necesario, creando un nuevo asiento con los datos correctos. Esto asegura la trazabilidad e integridad del registro contable, requisito fundamental para la auditoría fiscal.`,
      },
      {
        id: "libro-mayor",
        category: "contabilidad",
        title: "Libro Mayor",
        content: `El Libro Mayor muestra el detalle de todos los movimientos de cada cuenta contable individualmente. A diferencia del Libro Diario, que presenta los asientos en orden cronológico, el Libro Mayor agrupa los movimientos por cuenta, permitiéndote ver la evolución del saldo de cada una a lo largo del tiempo. Para consultarlo, accedé al módulo "Libro Mayor" desde el menú lateral.

Al ingresar, verás un panel con la lista de todas las cuentas de tu plan contable. Hacé clic en cualquier cuenta para ver el detalle de sus movimientos. El sistema te mostrará una tabla con las siguientes columnas: fecha, número de asiento, concepto, debe, haber y saldo acumulado. El saldo se va actualizando automáticamente con cada movimiento, lo que te permite visualizar cómo fue variando a lo largo del período.

En la parte superior del detalle, encontrarás un resumen con el saldo inicial de la cuenta al comienzo del período seleccionado, el total de débitos, el total de créditos, y el saldo final. Este resumen es útil para una revisión rápida antes de proceder con el cierre contable. Si la cuenta no tuvo movimientos en el período, el sistema lo indicará claramente.

Podés filtrar el Libro Mayor por rango de fechas, por tipo de cuenta (Activo, Pasivo, etc.) o por cuenta específica utilizando los filtros superiores. También podés buscar movimientos por concepto o número de asiento. La exportación está disponible en Excel y PDF, y puedes seleccionar si deseas exportar una cuenta específica o todas las cuentas del período.

El Libro Mayor es una herramienta esencial para la conciliación contable. Te permite verificar que los saldos de cada cuenta coincidan con los estados de cuenta bancarios, los resúmenes de AFIP y otros comprobantes externos. Si detectás una diferencia, podés rastrearla fácilmente revisando los movimientos individuales de la cuenta en el mayor hasta encontrar el asiento que genera la discrepancia.`,
      },
      {
        id: "balance-general",
        category: "contabilidad",
        title: "Balance General",
        content: `El Balance General, también conocido como Estado de Situación Patrimonial, es uno de los estados contables más importantes que muestra la posición financiera de la empresa en un momento determinado. En ContaFlow, el balance se genera automáticamente a partir de los saldos de todas las cuentas del plan contable. Para acceder, navegá hasta el módulo "Balance General" en el sidebar.

Al ingresar, el sistema te mostrará el balance con la estructura clásica: Activos en el lado izquierdo (o arriba en versión mobile), Pasivos y Patrimonio Neto en el lado derecho (o abajo). Los activos se dividen en Corriente y No Corriente, y dentro de cada grupo verás las cuentas con sus saldos individuales y los subtotales correspondientes. Lo mismo aplica para Pasivos y Patrimonio Neto.

Para generar el balance, primero seleccioná la fecha de corte deseada utilizando el selector de fecha. El sistema calculará todos los saldos hasta esa fecha inclusive. Podés elegir entre ver el balance comparativo (dos períodos lado a lado) o el balance de un único período. La vista comparativa es muy útil para analizar la evolución de la situación patrimonial entre dos fechas distintas.

ContaFlow valida automáticamente que el balance esté cuadrado, es decir, que la suma de activos sea igual a la suma de pasivos más patrimonio neto. Si hay una diferencia, el sistema la mostrará como un mensaje de advertencia para que puedas investigar la causa. Las diferencias más comunes suelen deberse a asientos desbalanceados o cuentas con saldos inesperados.

La exportación del Balance General está disponible en PDF y Excel. El formato PDF incluye un diseño profesional con encabezado de la empresa, fecha de emisión y numeración de páginas, listo para ser presentado ante organismos como la AFIP o para ser compartido con socios y accionistas. El Excel te permite realizar análisis adicionales o personalizar la presentación según tus necesidades.`,
      },
    ],
  },
  {
    id: "facturacion",
    name: "Facturación",
    icon: "Receipt",
    articles: [
      {
        id: "crear-factura",
        category: "facturacion",
        title: "Crear factura electrónica",
        content: `Para crear una factura electrónica en ContaFlow, navegá hasta el módulo "Facturación" en el menú lateral y hacé clic en "Nueva Factura". El primer paso es seleccionar el tipo de comprobante: Factura A, B, C, o M. El sistema te sugiere el tipo según la condición de IVA de tu empresa y la del receptor, pero podés modificarlo manualmente si es necesario.

A continuación, completá los datos del receptor: razón social o nombre, CUIT o DNI, condición frente al IVA (Responsable Inscripto, Monotributista, Consumidor Final, etc.) y la dirección. Si el cliente ya existe en tu base de datos, el sistema lo sugerirá automáticamente al escribir los primeros caracteres de la razón social o CUIT. También podés crear un nuevo cliente directamente desde este formulario haciendo clic en "Nuevo cliente".

Luego, cargá los ítems de la factura. Para cada ítem debés ingresar: código, descripción, cantidad, precio unitario, porcentaje de IVA (21%, 10.5%, 27% o 0%), y porcentaje de IIBB si corresponde. El sistema calculará automáticamente los subtotales, el IVA discriminado por alícuota, el total de la factura y el total en letras. Podés agregar tantos ítems como necesites haciendo clic en "Agregar ítem".

Antes de emitir, revisá todos los datos en el panel de vista previa que aparece en la parte derecha del formulario (o debajo en dispositivos móviles). Verificá que los importes sean correctos, que la información del receptor esté completa y que el tipo de comprobante sea el adecuado. Una vez confirmado, hacé clic en "Emitir Factura". El sistema se comunicará con los servidores de AFIP para obtener la autorización (CAE o CAEA) y, si todo está correcto, te mostrará el comprobante autorizado con su número y código de autorización.

Luego de la emisión, podés enviar la factura por email al cliente directamente desde ContaFlow haciendo clic en "Enviar por email". El sistema adjuntará el archivo PDF de la factura y el XML requerido por AFIP. También podés descargar la factura en PDF para imprimirla o guardarla en tu sistema de archivos. Todas las facturas emitidas quedan registradas y pueden consultarse en cualquier momento desde la lista de comprobantes del módulo Facturación.`,
      },
      {
        id: "estados-factura",
        category: "facturacion",
        title: "Estados de una factura",
        content: `En ContaFlow, cada factura pasa por diferentes estados que reflejan su situación actual. Entender estos estados es clave para gestionar correctamente la cobranza y el flujo de caja de tu empresa. Los estados principales son: Borrador, Emitida, Cobrada, Vencida, Anulada y Nota de Crédito Aplicada.

El estado "Borrador" indica que la factura fue creada pero aún no fue enviada a AFIP para su autorización. Las facturas en borrador no tienen validez fiscal y no generan obligaciones contables. Podés editarlas libremente, modificar ítems, cambiar el receptor o incluso eliminarlas sin dejar rastro. Para que la factura tenga efecto legal, debe ser emitida.

El estado "Emitida" significa que la factura fue enviada a AFIP y recibió la autorización correspondiente (CAE). En este punto, la factura tiene validez fiscal y genera las obligaciones contables y fiscales asociadas. El sistema registra automáticamente el asiento contable correspondiente: un débito en Cuentas por Cobrar y un crédito en la cuenta de Ventas por el monto gravado, más el crédito en IVA Débito Fiscal.

Una factura pasa a estado "Cobrada" cuando se registra el pago del cliente. ContaFlow permite vincular uno o más cobros a una factura, incluyendo pagos parciales. Cuando el saldo de la factura llega a cero, su estado cambia automáticamente a Cobrada. Este estado también actualiza el asiento contable original, cancelando la cuenta por cobrar y registrando el ingreso en la cuenta de banco o caja correspondiente.

El estado "Vencida" se asigna automáticamente cuando la fecha de vencimiento de pago de una factura emitida ha pasado y la factura no fue cobrada en su totalidad. El sistema resalta estas facturas en la lista con un indicador visual rojo para que puedas identificarlas rápidamente y gestionar el seguimiento de cobro. Podés configurar recordatorios automáticos por email para notificar a los clientes sobre facturas vencidas.

Las facturas en estado "Anulada" son aquellas que fueron emitidas pero luego se generó una nota de crédito que las cancela completamente. No se eliminan del sistema para mantener la trazabilidad del registro fiscal. Finalmente, el estado "Nota de Crédito Aplicada" se utiliza cuando una nota de crédito fue aplicada parcialmente a una factura, reduciendo su saldo pendiente sin cancelarla por completo.`,
      },
      {
        id: "registrar-cobro",
        category: "facturacion",
        title: "Registrar cobro de factura",
        content: `Para registrar un cobro en ContaFlow, dirigite al módulo "Pagos/Cobros" desde el menú lateral y seleccioná la pestaña "Cobros". Hacé clic en "Nuevo Cobro" para abrir el formulario de registro. Lo primero que debés hacer es seleccionar el cliente del cual recibiste el pago. El sistema desplegará automáticamente todas las facturas pendientes de ese cliente para que puedas seleccionar cuál o cuáles estás cobrando.

Seleccioná la factura o facturas que se van a cobrar marcando la casilla correspondiente. Para cada factura seleccionada, podés ingresar el monto a cobrar. Si el cliente paga el monto total, el sistema lo completa automáticamente; si es un pago parcial, ingresá el monto recibido. El sistema mostrará el saldo pendiente restante de cada factura para que tengas visibilidad clara del estado de la cuenta.

Luego completá los datos del cobro: fecha en que recibiste el pago, medio de pago (transferencia bancaria, efectivo, cheque, tarjeta, etc.), y si corresponde, los datos del comprobante bancario (número de transferencia, banco de origen, etc.). Estos datos son importantes para la conciliación bancaria posterior y para mantener un registro completo de las operaciones.

Si el medio de pago es transferencia bancaria, podés seleccionar la cuenta bancaria de destino. El sistema generará automáticamente el asiento contable correspondiente: debitará la cuenta de banco seleccionada y acreditará la cuenta de Cuentas por Cobrar del cliente por el monto del cobro. Si el cobro incluye retenciones, podés ingresarlas en la sección correspondiente y el sistema las registrará en las cuentas contables adecuadas.

Una vez completados todos los datos, hacé clic en "Guardar Cobro". El sistema actualizará automáticamente el saldo de la factura, y si el cobro cubre el total, la factura cambiará a estado "Cobrada". También se actualizarán los reportes de flujo de caja y el estado de cuenta del cliente. Podés enviar un recibo de cobro por email al cliente directamente desde ContaFlow, lo cual es una buena práctica para mantener una comunicación transparente y profesional.`,
      },
      {
        id: "registrar-pago",
        category: "facturacion",
        title: "Registrar pago a proveedor",
        content: `Para registrar un pago a proveedor en ContaFlow, navegá hasta el módulo "Pagos/Cobros" y seleccioná la pestaña "Pagos". Hacé clic en "Nuevo Pago" para iniciar el registro. El proceso es similar al de cobros, pero en sentido inverso: estás registrando una salida de fondos para cancelar una obligación con un tercero.

Seleccioná el proveedor al que le vas a realizar el pago. El sistema mostrará todas las facturas de ese proveedor que aún tienen saldo pendiente. Elegí las facturas que vas a abonar y, si el pago es parcial, ingresá el monto correspondiente. ContaFlow te permite registrar pagos que cubran una factura completa, pagos parciales de una sola factura, o pagos que abonen parcialmente varias facturas al mismo tiempo.

Completá los datos del pago: fecha de ejecución, medio de pago utilizado (transferencia, cheque, efectivo, etc.) y los datos complementarios como número de transferencia o número de cheque. Si el pago incluye retenciones de IVA, IIBB o Ganancias, ingresá los montos en las secciones correspondientes. El sistema calculará automáticamente el monto neto a pagar y registrará las retenciones en las cuentas fiscales adecuadas.

ContaFlow generará el asiento contable de forma automática: acreditará la cuenta de banco o caja (disminuyendo el saldo disponible) y debitará la cuenta de Cuentas por Pagar del proveedor. Las retenciones se registrarán como créditos en las cuentas de IVA Crédito Fiscal, IIBB a Favor y/o Ganancias a Favor, según corresponda.

Una vez guardado el pago, el sistema actualizará el saldo de las facturas seleccionadas y, si corresponde, las marcará como pagadas. El estado de cuenta del proveedor se actualizará automáticamente, reflejando el nuevo saldo pendiente. Desde el módulo de Proveedores podés consultar el historial completo de pagos realizados y el detalle de cada transacción, lo que facilita la conciliación con los resúmenes de cuenta que envían los proveedores.`,
      },
    ],
  },
  {
    id: "reportes",
    name: "Reportes",
    icon: "BarChart3",
    articles: [
      {
        id: "reportes-disponibles",
        category: "reportes",
        title: "Reportes disponibles",
        content: `ContaFlow ofrece una amplia variedad de reportes contables y financieros que te permiten analizar la situación de tu empresa desde diferentes perspectivas. Todos los reportes están disponibles desde el módulo "Reportes" en el menú lateral, donde los encontrarás organizados por categoría para facilitar su búsqueda.

Dentro de la categoría Contable, tenés acceso al Balance General, el Estado de Resultados, el Libro Diario, el Libro Mayor y la variación de Capital. El Balance General te muestra la situación patrimonial a una fecha determinada, mientras que el Estado de Resultados te permite analizar los ingresos y gastos del período para determinar la ganancia o pérdida neta. Ambos pueden generarse en formato comparativo (período actual vs. período anterior) para facilitar el análisis de tendencias.

En la categoría Fiscal, encontrarás los reportes de IVA Ventas (F. 2002), IVA Compras (F. 2002), Libro IVA Digital y el cuadro resumen de retenciones sufridas y practicadas. Estos reportes son fundamentales para la presentación de las declaraciones juradas mensuales ante la AFIP y se generan con el formato requerido por el organismo fiscal.

Los reportes financieros incluyen el Flujo de Caja (que muestra los ingresos y egresos en efectivo clasificados por actividad operativa, de inversión y de financiación), el Análisis de Cuentas por Cobrar (con antigüedad de saldos por cliente y rango de días vencidos) y el Análisis de Cuentas por Pagar (similar pero orientado a los compromisos con proveedores).

Finalmente, los reportes de Gestión incluyen los más vendidos, ranking de clientes por facturación, evolución mensual de ventas y gastos, y el dashboard ejecutivo con indicadores clave de rendimiento (KPIs). Todos los reportes permiten filtrar por rango de fechas, empresa (en caso de multi-empresa), moneda y centro de costos, ofreciéndote una flexibilidad máxima para obtener exactamente la información que necesitás.`,
      },
      {
        id: "exportar-excel-pdf",
        category: "reportes",
        title: "Exportar reportes a Excel y PDF",
        content: `Todos los reportes de ContaFlow pueden exportarse a formato Excel (.xlsx) o PDF para que puedas trabajar con la información fuera de la plataforma, compartirla con terceros o archivarla según tus necesidades. La exportación es un proceso sencillo que está disponible desde cada pantalla de reporte con un solo clic.

Para exportar un reporte, primero configurá los filtros deseados (rango de fechas, empresa, moneda, etc.) y generá la vista previa del reporte. Una vez que el reporte muestra la información que necesitás, hacé clic en el botón "Exportar" ubicado en la esquina superior derecha de la pantalla. Se desplegará un menú con las opciones "Exportar a Excel" y "Exportar a PDF". Seleccioná el formato deseado y la descarga comenzará automáticamente.

La exportación a Excel genera un archivo con múltiples hojas de cálculo organizadas lógicamente. Por ejemplo, al exportar el Balance General, obtendrás una hoja con el balance completo y otra con los datos detallados por cuenta. Los formatos numéricos se mantienen (es decir, los importes se descargan como números, no como texto), lo que te permite realizar cálculos, fórmulas y gráficos directamente en el archivo exportado sin necesidad de formatear los datos.

La exportación a PDF genera un documento con un diseño profesional y listo para imprimir o enviar por email. Incluye el logo de tu empresa (si lo configuraste en la sección de Configuración), encabezado con datos de la empresa (razón social, CUIT, dirección), fecha de generación, título del reporte y numeración de páginas. Los colores y tipografía están optimizados para lectura en pantalla e impresión.

Para exportaciones masivas o recurrentes, ContaFlow permite programar la generación automática de reportes y su envío por email en un cronograma definido. Por ejemplo, podés configurar que el Libro IVA Digital se exporte y envíe automáticamente el día 15 de cada mes a tu contador. Esta funcionalidad está disponible en los planes Profesional y Empresa, y se configura desde la sección de "Reportes Automatizados" dentro del módulo de Reportes.`,
      },
    ],
  },
  {
    id: "roles",
    name: "Roles y Permisos",
    icon: "ShieldCheck",
    articles: [
      {
        id: "que-son-roles",
        category: "roles",
        title: "Qué son los roles de usuario",
        content: `Los roles en ContaFlow son un sistema de control de acceso que te permite definir qué acciones puede realizar cada usuario dentro de la plataforma. En lugar de asignar permisos individualmente a cada usuario, creás roles que agrupan un conjunto de permisos y luego asignás esos roles a los usuarios correspondientes. Esto simplifica enormemente la gestión de accesos, especialmente en empresas con muchos empleados.

Cada rol define un conjunto de permisos a nivel de módulo. Por ejemplo, un rol de "Contador" podría tener acceso total al módulo de Asientos Contables y Reportes, pero acceso de solo lectura al módulo de Facturación y ningún acceso al módulo de Configuración. Un rol de "Vendedor", en cambio, podría crear facturas pero no ver los reportes financieros ni modificar el plan de cuentas.

ContaFlow viene con tres roles predefinidos que cubren los casos de uso más comunes: Administrador (acceso total a todos los módulos y funciones), Contador (acceso completo a contabilidad y reportes, acceso limitado a facturación, sin acceso a configuración del sistema) y Operador (acceso básico para carga de facturas y consultas simples). Estos roles no se pueden eliminar, pero podés modificar sus permisos o usarlos como base para crear roles personalizados.

Para crear un rol personalizado, navegá hasta el módulo "Roles/Permisos" y hacé clic en "Nuevo Rol". Asignale un nombre descriptivo (por ejemplo, "Supervisor de Cobros" o "Ayudante Contable") y seleccioná los permisos módulo por módulo. Para cada módulo, podés definir si el rol tiene acceso total (crear, leer, editar, eliminar), acceso de solo lectura, o ningún acceso.

Es recomendable aplicar el principio de mínimo privilegio: cada usuario debería tener solo los permisos necesarios para realizar su trabajo, ni más ni menos. Esto no solo mejora la seguridad, sino que también reduce la posibilidad de errores accidentales, ya que los usuarios no pueden modificar información que no les corresponde. Revisá periódicamente los roles y permisos asignados, especialmente cuando hay cambios de personal o reestructuraciones en la organización.`,
      },
      {
        id: "asignar-permisos",
        category: "roles",
        title: "Asignar permisos a un rol",
        content: `Para asignar permisos a un rol en ContaFlow, primero dirigite al módulo "Roles/Permisos" desde el menú lateral. Verás una lista con todos los roles existentes, tanto los predefinidos del sistema como los que hayas creado. Hacé clic en el rol que deseas modificar o en "Nuevo Rol" si vas a crear uno desde cero. Se abrirá la pantalla de edición de permisos.

La pantalla de permisos está organizada por módulo. Cada módulo de ContaFlow aparece como una sección con cuatro casillas de verificación: Ver (acceso de lectura), Crear (puede crear nuevos registros), Editar (puede modificar registros existentes) y Eliminar (puede borrar registros). Marcar todas las casillas otorga acceso total al módulo; marcar solo "Ver" otorga acceso de solo lectura; y desmarcar todas las casillas deniega completamente el acceso.

Algunos módulos tienen permisos adicionales o más granulares. Por ejemplo, en el módulo de Facturación podés definir si el rol puede emitir facturas (generar CAE ante AFIP) o si solo puede crear borradores. En el módulo de Reportes podés definir si el rol puede exportar datos o solo verlos en pantalla. Estas opciones avanzadas aparecen como casillas adicionales dentro de cada sección de módulo.

Cuando modificás los permisos de un rol, los cambios se aplican inmediatamente a todos los usuarios que tienen asignado ese rol. Los usuarios no necesitan cerrar sesión ni volver a iniciarla para que los cambios surtan efecto. Si un usuario está utilizando el sistema en el momento del cambio, el próximo acceso a un módulo verificará sus nuevos permisos.

Es una buena práctica documentar los roles personalizados que crees, indicando para qué perfil de usuario fueron diseñados. ContaFlow permite agregar una descripción a cada rol que solo es visible para los administradores. Esta descripción es útil cuando hay varios administradores gestionando el sistema o cuando se realizan auditorías de accesos. También podés duplicar un rol existente como punto de partida para crear uno nuevo, lo que ahorra tiempo cuando los roles son similares.`,
      },
      {
        id: "niveles-acceso",
        category: "roles",
        title: "Niveles de acceso",
        content: `ContaFlow maneja tres niveles jerárquicos de acceso que determinan el alcance de los datos que un usuario puede ver y modificar: nivel de sistema, nivel de empresa y nivel de registro. Entender cómo funcionan estos niveles es fundamental para configurar correctamente la seguridad de tu organización.

El nivel de sistema es el más alto y se aplica a los administradores. Los usuarios con acceso a nivel de sistema pueden ver y modificar datos de todas las empresas configuradas en la plataforma, acceder al módulo de Configuración del sistema y gestionar todos los usuarios y roles. Este nivel debe reservarse para un número muy limitado de personas, idealmente solo para los dueños o gerentes generales de la organización.

El nivel de empresa restringe el acceso a los datos de una empresa específica. Cuando un usuario tiene acceso a nivel de empresa, solo puede ver y operar con los datos de la empresa o empresas que le hayan sido asignadas. Por ejemplo, un contador que trabaja con tres empresas distintas puede acceder solo a las tres que le corresponden, sin ver los datos de las demás empresas que usan ContaFlow.

El nivel de registro es el más granular y permite restringir el acceso a registros específicos dentro de un módulo. Por ejemplo, en el módulo de Facturación podés configurar que un vendedor solo pueda ver y crear facturas de los clientes que le han sido asignados. En el módulo de Asientos Contables, podés limitar que un operador solo pueda ver los asientos que él mismo creó.

La asignación de niveles de acceso se realiza combinando la configuración de roles (que define qué puede hacer) con la asignación de empresas (que define dónde puede hacerlo). Para asignar empresas a un usuario, navegá al módulo "Usuarios", seleccioná el usuario y en la sección "Empresas" marcá las empresas a las que tiene acceso. Desde esa misma pantalla podés asignarle uno o más roles, que definirán sus permisos dentro de cada empresa.

Es importante destacar que los permisos se evalúan de manera acumulativa: si un usuario tiene dos roles asignados y uno le permite editar facturas y el otro no, el usuario podrá editar facturas porque el sistema otorga el nivel de acceso más alto entre los roles asignados. Si necesitás que un usuario tenga permisos diferentes en diferentes empresas, podés asignar roles distintos por empresa utilizando la configuración avanzada del módulo de Usuarios.`,
      },
    ],
  },
  {
    id: "general",
    name: "General",
    icon: "Settings",
    articles: [
      {
        id: "cambiar-idioma",
        category: "general",
        title: "Cambiar idioma de la interfaz",
        content: `ContaFlow está disponible en tres idiomas: español, inglés y portugués. Podés cambiar el idioma de la interfaz en cualquier momento desde la configuración de tu perfil de usuario, y el cambio se aplicará inmediatamente sin necesidad de cerrar sesión ni recargar la página.

Para cambiar el idioma, hacé clic en tu avatar o nombre de usuario en la esquina superior derecha de la pantalla y seleccioná "Mi Perfil" en el menú desplegable. En la sección de preferencias, encontrarás un selector de idioma con las tres opciones disponibles. Simplemente elegí el idioma que preferís y hacé clic en "Guardar". Todos los textos de la interfaz, etiquetas, mensajes de error y notificaciones se actualizarán al instante.

Es importante destacar que el cambio de idioma afecta solo a la interfaz del usuario que lo modifica. Cada usuario de la plataforma puede tener configurado un idioma diferente, lo que es especialmente útil en empresas con equipos multilingües. Por ejemplo, el contador puede usar la interfaz en español mientras que un socio extranjero la usa en inglés.

Los datos que hayas ingresado en el sistema (nombres de cuentas, descripciones de asientos, conceptos de facturas, etc.) no se traducen automáticamente al cambiar el idioma. Estos datos se almacenan tal como los ingresaste, independientemente del idioma de la interfaz. Solo los textos del sistema (nombres de módulos, botones, etiquetas, mensajes de ayuda) se muestran en el idioma seleccionado.

Si necesitás que ciertos datos maestros (como nombres de cuentas contables o categorías) estén disponibles en varios idiomas, podés utilizar la funcionalidad de alias multilingüe disponible en las pantallas de edición. Al crear o editar una cuenta, por ejemplo, verás campos adicionales para ingresar el nombre en inglés y portugués, que se mostrarán según el idioma configurado por cada usuario.

El idioma de los reportes exportados también se ajusta automáticamente según el idioma del usuario que genera la exportación. Esto significa que un reporte exportado por un usuario con interfaz en español tendrá los encabezados en español, mientras que el mismo reporte exportado por un usuario con interfaz en inglés tendrá los encabezados en inglés. Los datos numéricos, fechas y monedas se formatean según las convenciones del idioma seleccionado.`,
      },
      {
        id: "crear-empresa",
        category: "general",
        title: "Crear una nueva empresa",
        content: `Si tu plan lo permite (planes Profesional y Empresa), podés gestionar múltiples empresas desde una sola cuenta de ContaFlow. Para crear una nueva empresa, navegá al selector de empresas ubicado en la esquina superior izquierda de la pantalla (junto al logo de ContaFlow) y hacé clic en "Nueva Empresa". Se abrirá un formulario de registro donde deberás completar los datos de la nueva organización.

Los datos obligatorios para crear una empresa son: razón social o nombre, CUIT, condición frente al IVA (Responsable Inscripto, Monotributista, Exento, etc.), dirección fiscal, actividad principal según el clasificador de actividades de AFIP y la jurisdicción. También podés completar datos opcionales como teléfono, email, sitio web y logo de la empresa, que se utilizarán en los comprobantes y reportes.

Al crear la empresa, ContaFlow genera automáticamente una estructura contable básica con las cuentas más comunes predefinidas. Podés personalizar esta estructura desde el módulo Plan de Cuentas una vez que la empresa esté creada. También se configura automáticamente la moneda predeterminada (pesos argentinos), el ejercicio contable y el régimen de IVA según la condición fiscal declarada.

Si tu empresa necesita facturación electrónica AFIP, deberás configurar los datos de conexión con el servicio web de AFIP. Esto incluye cargar el certificado digital (.p12) y su clave, y configurar el punto de venta. La configuración fiscal se realiza desde la sección "Configuración Fiscal" dentro de los ajustes de la empresa. ContaFlow te guiará paso a paso durante este proceso con instrucciones claras.

Una vez creada la empresa, aparecerá en el selector de empresas y podrás cambiar a ella en cualquier momento. Cada empresa tiene sus propios datos aislados: plan de cuentas, asientos, facturas, clientes, proveedores y reportes. No hay posibilidad de mezclar datos entre empresas, lo que garantiza la separación contable que exige la normativa vigente. Al crear la primera empresa, ContaFlow te ofrece un asistente de configuración inicial que te guía paso a paso para dejar todo listo para empezar a trabajar.`,
      },
      {
        id: "navegacion-sidebar",
        category: "general",
        title: "Navegación por el sidebar",
        content: `El sidebar o barra lateral es la principal herramienta de navegación dentro de ContaFlow. Te permite acceder rápidamente a todos los módulos del sistema con un solo clic. El sidebar se encuentra en el lado izquierdo de la pantalla y puede expandirse o colapsarse según tus preferencias, liberando espacio para el contenido principal cuando necesitás más área de trabajo.

En su estado expandido, el sidebar muestra el icono y el nombre de cada módulo. Los módulos están organizados lógicamente: primero los de uso diario (Dashboard, Asientos, Facturación), luego los de consulta (Libros, Reportes) y finalmente los de administración (Roles, Usuarios, Configuración). Si tu rol no te da acceso a un módulo, este no aparecerá en el sidebar, manteniendo la interfaz limpia y enfocada en lo que necesitás.

Para colapsar el sidebar, hacé clic en el botón de flecha ubicado en la parte inferior del sidebar o en el ícono de hamburguesa en dispositivos móviles. En su estado colapsado, solo se muestran los iconos de cada módulo, y al pasar el mouse sobre un ícono aparece un tooltip con el nombre del módulo. Esta vista es ideal para pantallas pequeñas o cuando querés maximizar el espacio de trabajo.

En dispositivos móviles, el sidebar funciona como un menú deslizante. Al tocar el ícono de hamburguesa en la barra superior, el sidebar se desliza desde la izquierda cubriendo la pantalla. Podés navegar entre módulos y al tocar un módulo, el sidebar se cerrará automáticamente para que puedas ver el contenido. Para cerrar el sidebar sin seleccionar un módulo, tocá el fondo oscuro que aparece detrás o deslizá el dedo hacia la izquierda.

El sidebar también muestra indicadores visuales que te ayudan a identificar la actividad reciente. Por ejemplo, un pequeño punto rojo junto al módulo de Facturación indica que hay facturas próximas a vencer. Un badge numérico junto al módulo de Pagos/Cobros muestra la cantidad de comprobantes pendientes. Estos indicadores son configurables desde la sección de Notificaciones en tu perfil de usuario. Si preferís un sidebar sin distracciones, podés desactivarlos completamente.`,
      },
      {
        id: "cerrar-sesion",
        category: "general",
        title: "Cerrar sesión de forma segura",
        content: `Cerrar sesión correctamente en ContaFlow es importante tanto por seguridad como para asegurar que no queden procesos pendientes o bloqueos en el sistema. Para cerrar tu sesión, hacé clic en tu avatar o nombre de usuario en la esquina superior derecha de la pantalla y seleccioná "Cerrar sesión" en el menú desplegable. El sistema te redirigirá a la página de inicio de sesión.

Antes de cerrar sesión, es recomendable guardar cualquier cambio que hayas hecho en los formularios abiertos. ContaFlow no guarda automáticamente los borradores de asientos contables o facturas que estén en edición. Si cerrás sesión o la pestaña del navegador mientras estás editando un formulario, los cambios no guardados se perderán. El sistema te mostrará una advertencia si intentás cerrar sesión mientras hay formularios con cambios pendientes.

Cuando cerrás sesión, ContaFlow invalida tu token de acceso inmediatamente, lo que significa que nadie podrá utilizar tu sesión aunque tenga acceso a tu computadora o navegador. Si tenías varias pestañas de ContaFlow abiertas, todas se cerrarán automáticamente al cerrar sesión en cualquiera de ellas. El sistema también elimina cualquier dato temporal almacenado en la memoria caché del navegador.

Si olvidaste cerrar sesión en una computadora compartida o pública, no te preocupes: ContaFlow tiene un tiempo de inactividad automático configurable. Por defecto, después de 30 minutos sin actividad, la sesión se cierra automáticamente y se requiere volver a ingresar las credenciales. Este tiempo se puede ajustar desde la configuración de seguridad de tu perfil de usuario.

Para mayor seguridad, recomendamos activar la verificación en dos pasos (2FA) desde la sección de seguridad de tu perfil. Con el 2FA activado, cada vez que inicies sesión deberás ingresar, además de tu correo y contraseña, un código de 6 dígitos generado por una aplicación autenticadora como Google Authenticator, Authy o 1Password. Esto agrega una capa adicional de protección que impide el acceso no autorizado incluso si alguien obtiene tu contraseña.

Si detectás actividad sospechosa en tu cuenta (sesiones activas que no reconocés, notificaciones de cambios que no realizaste, etc.), cerrá sesión inmediatamente en todos los dispositivos desde la sección "Sesiones activas" de tu perfil y cambiate la contraseña. También podés contactar al soporte de ContaFlow para que revisen los registros de auditoría de tu cuenta y tomen las medidas necesarias.`,
      },
    ],
  },
]

export function getAllArticles(): HelpArticle[] {
  return helpCategories.flatMap((cat) => cat.articles)
}

export function getCategoryById(id: string): HelpCategory | undefined {
  return helpCategories.find((cat) => cat.id === id)
}

export function getArticleById(id: string): HelpArticle | undefined {
  return getAllArticles().find((a) => a.id === id)
}

export function searchArticles(query: string): HelpArticle[] {
  const lower = query.toLowerCase().trim()
  if (!lower) return getAllArticles()

  return getAllArticles().filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.content.toLowerCase().includes(lower) ||
      a.category.toLowerCase().includes(lower)
  )
}
