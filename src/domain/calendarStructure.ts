// Estructura FIJA del Calendario anual (la planilla de cash flow del usuario, capturada 2026-08-15).
// Secciones → ítems (renglones donde se carga la plata). Cada sección tiene su total.
// "dynamic: cobranzas" = los renglones salen de las cobranzas por trabajo (ppto · cliente), no son fijos.
// La plata se carga clasificándola a un `itemKey`; el calendario suma por (itemKey, día) y por sección.

export type CalItem = { key: string; label: string };
export type CalSection = {
  key: string;
  label: string;
  group: "ingreso" | "egreso";
  dir: "in" | "out";
  totalLabel: string;
  items: CalItem[];
  dynamic?: "cobranzas"; // sección con renglones dinámicos (por trabajo)
};

// Retoques del usuario sobre la estructura fija: renombrar un renglón (alias) o sacarlo de la vista.
// Es parte del ESTADO del sistema (se guarda y lo ven todos), no una preferencia del navegador: si
// alguien renombra "Préstamo Nicolás", tiene que verse igual desde cualquier máquina.
// Solo se puede ocultar un renglón SIN movimientos, así no se esconde plata.
export type CalendarRowConfig = {
  labels: Record<string, string>; // itemKey -> nombre propio
  hidden: string[];               // itemKeys que no se muestran
};

export const DEFAULT_CALENDAR_ROW_CONFIG: CalendarRowConfig = { labels: {}, hidden: [] };

export const CALENDAR_SECTIONS: CalSection[] = [
  // ===================== INGRESOS =====================
  {
    key: "cobranzas", label: "COBRANZAS · INGRESO", group: "ingreso", dir: "in",
    totalLabel: "Total Cobranzas", dynamic: "cobranzas", items: [],
  },
  {
    key: "prestamos", label: "PRÉSTAMOS", group: "ingreso", dir: "in", totalLabel: "Total Préstamos",
    items: [
      { key: "prestamo_nicolas", label: "Préstamo Nicolás" },
      { key: "prestamo_gustavo", label: "Préstamo Gustavo" },
      { key: "prestamo_bancario", label: "Préstamo bancario" },
      { key: "prestamo_bga_patagonia", label: "BGA Patagonia" },
    ],
  },
  {
    key: "inversiones", label: "INVERSIONES FINANCIERAS", group: "ingreso", dir: "in",
    totalLabel: "Total Inversiones Financieras",
    items: [
      { key: "rescate_fci_mix", label: "Rescate de FCI Mix VI" },
      { key: "rescate_fci_plus", label: "Rescate de FCI Plus $" },
      { key: "rescate_cauciones", label: "Rescate de Cauciones" },
      { key: "rescate_plazo_fijo", label: "Rescate de Plazo Fijo" },
      { key: "rescate_otra", label: "Rescate de otra inversión" },
    ],
  },
  {
    key: "ingresos_varios", label: "INGRESOS VARIOS", group: "ingreso", dir: "in", totalLabel: "Total Varios",
    items: [
      { key: "iv_pasaje_bga", label: "Pasaje de BGA Santander a BGA Patagonia" },
      { key: "iv_reintegro_art", label: "Reintegro de ART" },
      { key: "iv_venta_dolares", label: "Venta de dólares a pesos" },
    ],
  },
  // ===================== EGRESOS =====================
  {
    key: "bancos", label: "EGRESOS · BANCOS", group: "egreso", dir: "out", totalLabel: "Total de Bancos",
    items: [
      { key: "b_tarjeta_credito", label: "Tarjeta de crédito" },
      { key: "b_credito_1", label: "Crédito" },
      { key: "b_credito_2", label: "Crédito (2)" },
      { key: "b_imp_credito", label: "Impuesto al crédito" },
      { key: "b_imp_debito", label: "Impuesto al débito" },
      { key: "b_imp_credito_usd", label: "Impuesto al crédito cuenta US$" },
      { key: "b_iva_21", label: "IVA 21 %" },
      { key: "b_iva_105", label: "IVA 10,5 %" },
      { key: "b_iva_percepcion", label: "IVA percepción" },
      { key: "b_percepcion_30", label: "Percepción 30 % compra en exterior" },
      { key: "b_imp_ex_ef", label: "Impuesto EX EF AL GEN REG" },
      { key: "b_sellados", label: "Sellados" },
      { key: "b_credito_inv_prov", label: "Crédito inversión provisorio" },
      { key: "b_debito_inv_prov", label: "Débito inversión provisorio" },
      { key: "b_com_cheque_efectivo", label: "Comisión pago cheque y/o retiro de efectivo" },
      { key: "b_com_paquete", label: "Comisión x serv. de cuenta - paquete de productos" },
      { key: "b_com_cuenta_usd", label: "Comisión x serv. de cuenta USD" },
      { key: "b_com_extraccion", label: "Com. x extracción" },
      { key: "b_com_transf_otros", label: "Com. transf. a otros bancos" },
      { key: "b_com_emision_cheques", label: "Comisión emisión de cheques" },
      { key: "b_int_descubierto", label: "Int. x descubierto" },
      { key: "b_cesion_cheques", label: "Cesión de cheques" },
      { key: "b_int_dentro_acuerdo", label: "Interés dentro del acuerdo" },
      { key: "b_int_fuera_acuerdo", label: "Interés fuera del acuerdo" },
      { key: "b_imp_ley_25413", label: "Imp. Ley 25413 0,6 % Ex Ef AI Gen Reg" },
      { key: "b_garantias_bind", label: "Garantías BIND SGR" },
    ],
  },
  {
    key: "haberes", label: "EGRESOS · HABERES", group: "egreso", dir: "out", totalLabel: "Total Haberes",
    items: [],
  },
  {
    key: "cargas_sociales", label: "EGRESOS · CARGAS SOCIALES", group: "egreso", dir: "out",
    totalLabel: "Total Cargas Sociales",
    items: [
      { key: "cs_art_vida", label: "CCSS ART - Vida" },
      { key: "cs_seg_soc", label: "CCSS Aportes y Contrib. Seg. Soc." },
      { key: "cs_obra_soc", label: "CCSS Aportes y Contrib. Obra Soc." },
      { key: "cs_intereses", label: "Intereses" },
    ],
  },
  {
    key: "impuestos", label: "EGRESOS · IMPUESTOS", group: "egreso", dir: "out", totalLabel: "Total Impuestos",
    items: [
      { key: "imp_iva_mensual", label: "IVA mensual" },
      { key: "imp_iva_intereses", label: "IVA intereses" },
      { key: "imp_abl_fabrica", label: "Deuda ABL Fábrica anterior" },
      { key: "imp_gcba", label: "GCBA" },
      { key: "imp_plan_iva_1", label: "Plan IVA (1)" },
      { key: "imp_plan_iva_2", label: "Plan IVA (2)" },
      { key: "imp_plan_iva_3", label: "Plan IVA (3)" },
      { key: "imp_plan_ccss_1", label: "Plan CCSS (1)" },
      { key: "imp_plan_ccss_2", label: "Plan CCSS (2)" },
      { key: "imp_plan_ccss_3", label: "Plan CCSS (3)" },
      { key: "imp_ganancias", label: "Ganancias" },
      { key: "imp_ganancias_int", label: "Ganancias intereses" },
      { key: "imp_anticipo_ganancias", label: "Anticipo de Ganancias" },
      { key: "imp_anticipo_ganancias_int", label: "Anticipo de Ganancias intereses" },
    ],
  },
  {
    key: "seguros", label: "EGRESOS · SEGUROS", group: "egreso", dir: "out", totalLabel: "Total Seguros",
    items: [
      { key: "seg_caucion_1", label: "Seguro póliza de caución (1)" },
      { key: "seg_caucion_2", label: "Seguro póliza de caución (2)" },
      { key: "seg_caucion_3", label: "Seguro póliza de caución (3)" },
      { key: "seg_inmueble", label: "Seguro inmueble" },
      { key: "seg_resp_civil", label: "Seguro de responsabilidad civil" },
      { key: "seg_integral_comercio", label: "Seguro integral de comercio" },
      { key: "seg_maquinarias", label: "Seguro de maquinarias" },
      { key: "seg_vehiculo", label: "Seguro de vehículo" },
      { key: "seg_berkley", label: "Berkley Internacional" },
      { key: "seg_afianzadora", label: "Afianzadora Latinoamericana" },
      { key: "seg_amazon_prime", label: "Amazon Prime Subs (Imp. 30 % impor.)" },
    ],
  },
  {
    key: "logistica", label: "EGRESOS · LOGÍSTICA", group: "egreso", dir: "out", totalLabel: "Total Logística",
    items: [
      { key: "log_internet", label: "Internet" },
      { key: "log_telefonia", label: "Telefonía" },
      { key: "log_uber", label: "Uber / Motoquero" },
      { key: "log_comb_edenred", label: "Combustible Edenred" },
      { key: "log_combustible", label: "Combustible" },
      { key: "log_patente", label: "Patente vehículo" },
      { key: "log_peajes", label: "Peajes" },
      { key: "log_mant_prev", label: "Mant. preventivo vehículo" },
      { key: "log_mant_corr", label: "Mant. correctivo vehículo" },
      { key: "log_tramites_veh", label: "Trámites vehículos" },
      { key: "log_osde", label: "OSDE" },
      { key: "log_edenor", label: "Edenor" },
      { key: "log_cajas_navidad", label: "Cajas navideñas" },
    ],
  },
  {
    key: "gastos_comerciales", label: "EGRESOS · GASTOS COMERCIALES", group: "egreso", dir: "out",
    totalLabel: "Total Gastos Comerciales",
    items: [
      { key: "gc_dominio", label: "Dominio de página" },
      { key: "gc_marketing", label: "Marketing digital - Catalina Milagros Márquez (días 20)" },
    ],
  },
  {
    key: "gastos_admin", label: "EGRESOS · GASTOS ADMINISTRACIÓN", group: "egreso", dir: "out",
    totalLabel: "Total Administración",
    items: [
      { key: "ga_contable_cusmano", label: "Estudio contable - Cusmano (días 26)" },
      { key: "ga_contable_franco", label: "Estudio contable - Franco (días 26)" },
      { key: "ga_sistemas_robert", label: "Sistemas Robert (días 20)" },
      { key: "ga_escribania", label: "Escribanía" },
      { key: "ga_arquitecto", label: "Arquitecto" },
      { key: "ga_ingeniero", label: "Ingeniero - Diseño / Proyecto" },
      { key: "ga_agrimensor", label: "Agrimensor" },
      { key: "ga_inmobiliaria", label: "Inmobiliaria" },
      { key: "ga_abogados", label: "Abogados / Juicios" },
      { key: "ga_maria_luz", label: "María Luz escribanía" },
    ],
  },
  {
    key: "gastos_rrhh", label: "EGRESOS · GASTOS RRHH", group: "egreso", dir: "out",
    totalLabel: "Total de Gastos de RRHH",
    items: [
      { key: "rh_ler_medicina", label: "LER Medicina laboral" },
      { key: "rh_capacitaciones", label: "Capacitaciones" },
      { key: "rh_cartas_documento", label: "Cartas documento" },
    ],
  },
  {
    key: "compras_insumos", label: "EGRESOS · COMPRAS DE INSUMOS", group: "egreso", dir: "out",
    totalLabel: "Total Otros Gastos",
    items: [
      { key: "ci_insumos", label: "Compras de insumos" },
    ],
  },
  {
    key: "compra_materiales", label: "EGRESOS · COMPRA DE MATERIALES E INSUMOS", group: "egreso", dir: "out",
    totalLabel: "Total Materiales e Insumos",
    items: [
      { key: "cm_materiales", label: "Compra de materiales e insumos" },
    ],
  },
];

// Índice itemKey → { section, label } para clasificar y mostrar.
export const CALENDAR_ITEM_INDEX: Record<string, { sectionKey: string; label: string; dir: "in" | "out" }> = (() => {
  const idx: Record<string, { sectionKey: string; label: string; dir: "in" | "out" }> = {};
  CALENDAR_SECTIONS.forEach((s) => s.items.forEach((it) => {
    idx[it.key] = { sectionKey: s.key, label: it.label, dir: s.dir };
  }));
  return idx;
})();
