import { useState } from "react";
import { styles } from "../ui/styles";
import {
  Panel,
  Semaforo,
  SemaforoResumen,
  MiniMetric,
  ButtonLike,
  Field,
  TwoCol,
  FileDropButton,
  AmountInput,
  ColorTag,
  PillD,
  MONEY_OUT_COLOR,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda,
} from "../ui/planilla";
import { money, formatDateDisplay, todayIso } from "../lib/format";
import { purchaseInvoiceMissing } from "../domain/completeness";
import { supplierKey } from "../domain/purchaseLedger";

// Procedencia efectiva de una factura de compra: con numero de factura es SIEMPRE blanco (una factura
// no puede ser negra); si no, manda el campo administracion. Mismo criterio que el select de la ficha.
const invoiceOrigin = (invoice: { invoiceNumber?: string; administration?: string }): "blanco" | "negro" =>
  invoice.invoiceNumber?.trim() ? "blanco" : invoice.administration === "negro" ? "negro" : "blanco";
import type { CompanyName, PurchaseInvoice } from "../domain/types";

type ComprasTabProps = {
  // Lo operativo de compras vive aca (se mudo de Fabricacion el 2026-08-27): que falta comprar, para
  // cuando, y que se compro. En Fabricacion quedo oculto; aca es donde se mira.
  stockSemaphoreSummary: any;
  purchaseDeadlineSemaphore: any;
  fabricationPendingPurchases: any[];
  fabricationCompletedPurchases: any[];
  stockNeedRows: any[];
  totalPurchaseNeed: number;
  purchaseCalendarRows: any[];
  purchaseLedger: any;
  personDebts: any;
  suppliers: any[];
  updateSupplier: (id: number, field: string, value: string | number | boolean) => void;
  purchaseInvoiceRows: any[];
  costEntries: any[];
  employeeNames: string[];
  purchaseInvoiceSummary: any;
  pettyCashSummary: any;
  monthPettyCashExpenses: any[];
  purchaseMonth: string;
  monthPurchaseInvoices: PurchaseInvoice[];
  monthLabel: (month: string) => string;
  getCompanyMeta: (company: CompanyName) => any;
  COMPANY_OPTIONS: any[];
  shiftPurchaseMonth: (delta: number) => void;
  addPurchaseInvoice: () => void;
  removePurchaseInvoice: (invoiceId: number) => void;
  updatePurchaseInvoice: (
    invoiceId: number,
    field: keyof PurchaseInvoice,
    value: string | number | boolean
  ) => void;
  uploadPurchaseInvoiceFile: (invoiceId: number, file: File | null) => void;
};

export function ComprasTab({
  stockSemaphoreSummary,
  purchaseDeadlineSemaphore,
  fabricationPendingPurchases,
  fabricationCompletedPurchases,
  stockNeedRows,
  totalPurchaseNeed,
  purchaseCalendarRows,
  purchaseLedger,
  personDebts,
  suppliers,
  updateSupplier,
  purchaseInvoiceRows,
  costEntries,
  employeeNames,
  purchaseInvoiceSummary,
  pettyCashSummary,
  monthPettyCashExpenses,
  purchaseMonth,
  monthPurchaseInvoices,
  monthLabel,
  getCompanyMeta,
  COMPANY_OPTIONS,
  shiftPurchaseMonth,
  addPurchaseInvoice,
  removePurchaseInvoice,
  updatePurchaseInvoice,
  uploadPurchaseInvoiceFile,
}: ComprasTabProps) {
  const anchosPendientes = usePlanillaWidths("compras.pendientes", { label: 300, col: 110, colCompact: 84 });
  const anchosCompras = usePlanillaWidths("compras.realizadas", { label: 280, col: 120, colCompact: 92 });
  const anchosCajaBlanca = usePlanillaWidths("compras.cajachica", { label: 300, col: 118, colCompact: 90 });
  const anchosCtaCte = usePlanillaWidths("compras.ctacte", { label: 260, col: 124, colCompact: 96 });
  const anchosPagos = usePlanillaWidths("compras.pagos", { label: 260, col: 118, colCompact: 90 });

  // Que cuentas estan desplegadas y si se muestran todos los proveedores o solo los que importan.
  // Solo UI, no se persiste.
  const [cuentasAbiertas, setCuentasAbiertas] = useState<string[]>([]);
  const [verTodosLosProveedores, setVerTodosLosProveedores] = useState(false);
  const toggleCuenta = (key: string) =>
    setCuentasAbiertas((abiertas) =>
      abiertas.includes(key) ? abiertas.filter((k) => k !== key) : [...abiertas, key]
    );

  // El proveedor del listado que corresponde a cada cuenta, para poder marcarla como cuenta corriente
  // desde la propia cuenta. La llave es la misma que usa el libro mayor (CUIT o nombre normalizado).
  const proveedorPorLlave = new Map<string, any>(
    suppliers.map((sup) => [supplierKey(sup.name, sup.taxId), sup])
  );

  // Se muestran las cuentas de convenio y las que tienen saldo; el resto queda detras del boton (hay
  // mas de cien proveedores y la mayoria son compras sueltas ya pagadas).
  const cuentasVisibles = (purchaseLedger?.ledgers || []).filter(
    (l: any) => verTodosLosProveedores || l.esCuentaCorriente || Math.abs(l.saldo) > 1
  );

  // Pagos que se pueden vincular a una factura: los gastos de la misma empresa, y si la factura trae
  // proveedor, los de ese proveedor (o los que no tienen proveedor cargado).
  const pagosVinculables = (invCompany: string, supplierName: string) =>
    costEntries.filter(
      (e: any) =>
        e.company === invCompany &&
        (!supplierName ||
          !e.supplier ||
          String(e.supplier).trim().toLowerCase() === String(supplierName).trim().toLowerCase())
    );

  // Lo que salio por caja chica en el mes, partido por circuito. El negro no tiene factura pero es
  // plata que salio igual: se controla aca, no se esconde.
  const pettyCashCajaBlanco = monthPettyCashExpenses
    .filter((item: any) => item.administration !== "negro")
    .reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const pettyCashCajaNegro = monthPettyCashExpenses
    .filter((item: any) => item.administration === "negro")
    .reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);

  // El control que pidio el usuario: que todo lo facturado se este pagando. Lo que no tiene pago
  // registrado es lo que hay que mirar.
  const facturasDeArca = purchaseInvoiceRows.filter((inv: any) => inv.origin === "arca");
  const facturasSinPago = purchaseInvoiceRows.filter((inv: any) => !inv.pagoFecha);
  const totalSinPago = facturasSinPago.reduce((acc: number, inv: any) => acc + Number(inv.total || 0), 0);

  // Que facturas ya tienen el pago registrado, para exigirlo con la D en el bloque de carga por mes.
  const facturasConPago = new Set<number>(
    purchaseInvoiceRows.filter((inv: any) => inv.pagoFecha).map((inv: any) => Number(inv.id))
  );

  const origenLabel: Record<string, string> = {
    arca: "ARCA",
    caja_chica: "Caja chica",
    compras: "Compras",
  };

  return (
        <div style={styles.column}>
          {/* Sugerencias de quien puede haber puesto plata de su bolsillo. Va suelto en la solapa (no
              dentro de un panel) para que los dos lugares donde se carga lo encuentren siempre. */}
          <datalist id="personas-que-pagan">
            {employeeNames.map((nombre) => (
              <option key={nombre} value={nombre} />
            ))}
          </datalist>

          <Panel span="wide" title="Semaforo de compras">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Materiales cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Compra parcial", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
            <div style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Semaforo level={purchaseDeadlineSemaphore.level} size={24} ring />
              <div>
                <div style={styles.metricLabel}>Fechas limite de compra</div>
                <div style={{ fontWeight: 700 }}>{purchaseDeadlineSemaphore.label}</div>
              </div>
            </div>
          </Panel>

          <Panel title="Deuda con la gente (lo que pusieron de su bolsillo)" span="full">
            <div style={styles.sectionNote}>
              Cuando una factura la paga un empleado, un socio o un tercero, la empresa le queda
              debiendo hasta que se le reintegra. Se marca en el bloque de abajo, en la columna del
              pago. Esta deuda entra sola a la <strong>cuenta corriente con la gente</strong>, en
              Movimientos internos, junto con la caja chica excedida y lo que se cargue a mano; el
              reintegro también se puede asentar allá (y si fue en efectivo, baja la caja).{" "}
              <strong style={{ color: Number(personDebts?.total || 0) > 1 ? "#b45309" : "#16a34a" }}>
                Total a devolver: {money(Number(personDebts?.total || 0))}
              </strong>
              .
            </div>
            {(personDebts?.debts || []).length === 0 ? (
              <div style={styles.empty}>No hay facturas puestas por alguien sin reintegrar. Al día.</div>
            ) : (
              (personDebts.debts || []).map((deuda: any) => (
                <div
                  key={deuda.person}
                  style={{ border: "1px solid #fed7aa", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "#fffbeb",
                    }}
                  >
                    <strong>{deuda.person}</strong>
                    <span style={{ display: "inline-flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {deuda.count} {deuda.count === 1 ? "factura" : "facturas"}
                      </span>
                      <span style={{ fontWeight: 800, color: "#b45309" }}>{money(deuda.total)}</span>
                    </span>
                  </div>
                  <table style={planillaTable}>
                    <colgroup>
                      <col style={colLabel} />
                      <col style={colDato} />
                      <col style={colDato} />
                      <col style={colFlexible} />
                    </colgroup>
                    <tbody>
                      {deuda.invoices.map((inv: any) => (
                        <tr key={`deuda-${inv.id}`}>
                          <td style={{ ...tdNombre, fontWeight: 400 }}>
                            {inv.supplier || "sin proveedor"}
                            <ColorTag color={inv.administration} />
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                            {money(inv.total)}
                          </td>
                          <td style={{ ...tdDato, color: "#475569" }}>
                            {formatDateDisplay(inv.invoiceDate)}
                          </td>
                          <td style={tdFlexible}>
                            <button
                              style={styles.smallBtn}
                              title="Ya se le devolvió la plata: sale de la deuda"
                              onClick={() => updatePurchaseInvoice(inv.id, "reimbursedAt" as any, todayIso())}
                            >
                              Marcar reintegrado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </Panel>

          <Panel
            title="Cuentas corrientes con proveedores"
            span="full"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={() => setVerTodosLosProveedores((v) => !v)} secondary>
                  {verTodosLosProveedores ? "Solo convenio y con saldo" : "Ver todos los proveedores"}
                </ButtonLike>
                <ButtonLike onClick={anchosCtaCte.toggleCompacto} secondary>
                  {anchosCtaCte.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.sectionNote}>
              Con el <strong>punto verde</strong> marcás a los proveedores con los que hay convenio de
              comprar e ir pagando diferido. Cada factura <strong>suma</strong> a la cuenta y cada pago
              la <strong>descuenta</strong>.{" "}
              <strong style={{ color: Number(purchaseLedger?.saldoTotal || 0) > 1 ? "#b45309" : "#16a34a" }}>
                Saldo total: {money(Number(purchaseLedger?.saldoTotal || 0))}
              </strong>
              {Number(purchaseLedger?.sinConciliarTotal || 0) > 1 && (
                <>
                  {" · "}
                  <span style={{ color: "#ca8a04" }}>
                    {money(Number(purchaseLedger.sinConciliarTotal))} en facturas sin pago vinculado
                  </span>
                </>
              )}
              .
            </div>
            {cuentasVisibles.length === 0 ? (
              <div style={styles.empty}>
                Todavía no hay compras cargadas. Importá el listado de ARCA o cargá una factura para que
                la cuenta empiece a moverse.
              </div>
            ) : (
              cuentasVisibles.map((cuenta: any) => {
                const proveedor = proveedorPorLlave.get(cuenta.key);
                const abierta = cuentasAbiertas.includes(cuenta.key);
                const debe = cuenta.saldo > 1;
                return (
                  <div
                    key={cuenta.key}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        background: debe ? "#fffbeb" : "#f0fdf4",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleCuenta(cuenta.key)}
                      title="Tocá para ver el detalle de compras y pagos"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            border: "1px solid #94a3b8",
                            padding: 0,
                            cursor: proveedor ? "pointer" : "not-allowed",
                            background: cuenta.esCuentaCorriente ? "#16a34a" : "#e2e8f0",
                          }}
                          title={
                            proveedor
                              ? cuenta.esCuentaCorriente
                                ? "Tiene convenio de cuenta corriente. Tocá para quitarlo."
                                : "Sin convenio. Tocá para marcarlo como cuenta corriente."
                              : "Este proveedor no está en el listado: dalo de alta para poder marcarlo."
                          }
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (!proveedor) return;
                            updateSupplier(proveedor.id, "currentAccount", !cuenta.esCuentaCorriente);
                          }}
                        />
                        <strong>{cuenta.supplier}</strong>
                        {cuenta.taxId && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>({cuenta.taxId})</span>
                        )}
                        {cuenta.esCuentaCorriente && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: 0.6,
                              color: "#166534",
                              background: "#dcfce7",
                              borderRadius: 999,
                              padding: "1px 7px",
                            }}
                          >
                            CONVENIO
                          </span>
                        )}
                      </span>
                      <span style={{ display: "inline-flex", gap: 12, alignItems: "baseline" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Comprado {money(cuenta.comprado)} · Pagado {money(cuenta.pagado)}
                        </span>
                        <span style={{ fontWeight: 800, color: debe ? "#b45309" : "#16a34a" }}>
                          {debe
                            ? `Debemos ${money(cuenta.saldo)}`
                            : cuenta.saldo < -1
                            ? `A favor ${money(Math.abs(cuenta.saldo))}`
                            : "Al día"}
                        </span>
                      </span>
                    </div>
                    {abierta && (
                      <div style={{ ...planillaWrap, ...anchosCtaCte.vars }}>
                        <table style={planillaTable}>
                          <colgroup>
                            <col style={colLabel} />
                            <col style={colDato} />
                            <col style={colDato} />
                            <col style={colDato} />
                            <col style={colFlexible} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={thEsquina}>
                                Movimiento
                                <PlanillaManija
                                  onMouseDown={(ev) => anchosCtaCte.startResize(ev, "label")}
                                  onDoubleClick={anchosCtaCte.resetLabel}
                                />
                              </th>
                              <th style={{ ...thColumna, textAlign: "right" }}>
                                Compra
                                <PlanillaManija
                                  onMouseDown={(ev) => anchosCtaCte.startResize(ev, "col")}
                                  onDoubleClick={anchosCtaCte.resetCol}
                                />
                              </th>
                              <th style={{ ...thColumna, textAlign: "right" }}>Pago</th>
                              <th style={{ ...thColumna, textAlign: "right" }}>Saldo</th>
                              <th style={thFlexible}>Fecha · estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cuenta.movimientos.map((mov: any) => (
                              <tr key={mov.key}>
                                <td style={{ ...tdNombre, fontWeight: 400 }} title={mov.detail}>
                                  {mov.type === "compra" && (
                                    <span
                                      title={mov.conciliada ? "Con pago vinculado" : "Sin pago vinculado"}
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: 999,
                                        marginRight: 7,
                                        background: mov.conciliada ? "#16a34a" : "#ca8a04",
                                      }}
                                    />
                                  )}
                                  {mov.detail}
                                  <ColorTag color={mov.administration} />
                                </td>
                                <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                                  {mov.type === "compra" ? money(mov.amount) : ""}
                                </td>
                                <td
                                  style={{
                                    ...tdDato,
                                    textAlign: "right",
                                    fontWeight: 700,
                                    color: mov.type === "pago" ? MONEY_OUT_COLOR : undefined,
                                  }}
                                >
                                  {mov.type === "pago" ? money(mov.amount) : ""}
                                </td>
                                <td style={{ ...tdDato, textAlign: "right", fontWeight: 800 }}>
                                  {money(mov.saldo)}
                                </td>
                                <td style={{ ...tdFlexible, color: "#64748b" }}>
                                  {formatDateDisplay(mov.date) || "sin fecha"}
                                  {mov.type === "compra" && mov.paidByPerson && (
                                    <span style={{ color: "#b45309" }}>
                                      {" · la puso "}
                                      {mov.paidByPerson}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </Panel>

          <Panel
            title={`Facturas de compra - ${monthLabel(purchaseMonth)}`}
            actions={<ButtonLike onClick={addPurchaseInvoice}>Agregar factura</ButtonLike>}
          >
            <div style={styles.noticeBox}>
              Mostrando las facturas de <strong>{monthLabel(purchaseMonth)}</strong> — usá la barra de mes para navegar.
              La <strong>D</strong> marca lo que falta: datos del comprobante y, sobre todo,{" "}
              <strong>el pago sin registrar</strong>. Es el control para que no quede ninguna cargada
              sin saber si se pagó; el detalle está en el bloque de abajo.
              Puedes cargar una imagen o PDF y dejar que el sistema precomplete una base editable. Después podremos mejorar esta lectura automática con OCR más fino.
            </div>
            {monthPurchaseInvoices.length === 0 ? (
              <div style={styles.empty}>No hay facturas de compra cargadas en {monthLabel(purchaseMonth)}.</div>
            ) : (
              monthPurchaseInvoices.map((invoice) => {
                // La D no solo marca datos faltantes de la factura: si el PAGO no esta registrado,
                // tambien lo exige. Es el control que pidio Nicolas -- que no quede ninguna cargada
                // sin saber si se pago.
                const faltantes = [...purchaseInvoiceMissing(invoice)];
                if (!facturasConPago.has(invoice.id)) faltantes.push("pago registrado");
                return (
                <div key={invoice.id} style={styles.subCard}>
                  <div style={{ ...styles.inlineActions, justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {faltantes.length > 0 && <PillD missing={faltantes} />}
                      <strong style={{ fontSize: 14 }}>{invoice.supplier || "Proveedor sin nombre"}</strong>
                      <span style={{ color: MONEY_OUT_COLOR, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {money(
                          Number(invoice.total || 0),
                          String(invoice.currency || "").toUpperCase() === "USD" ? "USD" : "ARS"
                        )}
                        <ColorTag color={invoiceOrigin(invoice)} />
                      </span>
                    </span>
                    <button style={styles.smallBtn} onClick={() => removePurchaseInvoice(invoice.id)}>
                      Quitar factura
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={invoice.company}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Administracion">
                      <select
                        style={styles.input}
                        value={invoice.invoiceNumber.trim() ? "blanco" : invoice.administration}
                        disabled={!!invoice.invoiceNumber.trim()}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                      {invoice.invoiceNumber.trim() ? (
                        <div style={{ ...styles.muted, fontSize: 11, marginTop: 2 }}>
                          Con factura = blanco (una factura no puede ser negra).
                        </div>
                      ) : null}
                    </Field>
                    <Field label="Origen">
                      <input style={styles.input} value={invoice.source} readOnly />
                    </Field>
                    <Field label="Proveedor">
                      <input style={styles.input} value={invoice.supplier} onChange={(e) => updatePurchaseInvoice(invoice.id, "supplier", e.target.value)} />
                    </Field>
                    <Field label="CUIT / CUIL">
                      <input style={styles.input} value={invoice.taxId} onChange={(e) => updatePurchaseInvoice(invoice.id, "taxId", e.target.value)} />
                    </Field>
                    <Field label="Tipo de comprobante">
                      <input style={styles.input} value={invoice.receiptKind} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptKind", e.target.value)} />
                    </Field>
                    <Field label="Letra / tipo">
                      <input style={styles.input} value={invoice.receiptLetter} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptLetter", e.target.value)} />
                    </Field>
                    <Field label="Numero">
                      <input
                        style={styles.input}
                        value={invoice.invoiceNumber}
                        onChange={(e) => {
                          updatePurchaseInvoice(invoice.id, "invoiceNumber", e.target.value);
                          if (e.target.value.trim())
                            updatePurchaseInvoice(invoice.id, "administration", "blanco");
                        }}
                      />
                    </Field>
                    <Field label="Fecha">
                      <input style={styles.input} type="date" value={invoice.invoiceDate} onChange={(e) => updatePurchaseInvoice(invoice.id, "invoiceDate", e.target.value)} />
                    </Field>
                    <Field label="Moneda">
                      <select
                        style={styles.input}
                        value={String(invoice.currency || "").toUpperCase() === "USD" ? "USD" : "ARS"}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "currency", e.target.value)}
                      >
                        <option value="ARS">$ Pesos</option>
                        <option value="USD">U$S Dolares</option>
                      </select>
                    </Field>
                    <Field label="Exento">
                      <AmountInput style={styles.input} value={invoice.exemptAmount} onChange={(n) => updatePurchaseInvoice(invoice.id, "exemptAmount", n)} />
                    </Field>
                    <Field label="Neto 21%">
                      <AmountInput style={styles.input} value={invoice.net21} onChange={(n) => updatePurchaseInvoice(invoice.id, "net21", n)} />
                    </Field>
                    <Field label="Subtotal">
                      <AmountInput style={styles.input} value={invoice.subtotal} onChange={(n) => updatePurchaseInvoice(invoice.id, "subtotal", n)} />
                    </Field>
                    <Field label="IVA">
                      <AmountInput style={styles.input} value={invoice.vat} onChange={(n) => updatePurchaseInvoice(invoice.id, "vat", n)} />
                    </Field>
                    <Field label="Total">
                      <AmountInput style={styles.input} value={invoice.total} onChange={(n) => updatePurchaseInvoice(invoice.id, "total", n)} />
                    </Field>
                    <Field label="Carga automatica">
                      <input style={styles.input} value={invoice.extractedAutomatically ? "Si" : "Manual"} readOnly />
                    </Field>
                    {/* Quien puso la plata. Es el MISMO campo que se edita desde "Facturas recibidas y
                        su pago": un solo dato, dos lugares para cargarlo, sin que puedan contradecirse. */}
                    <Field label="La pagó (si la puso alguien de su bolsillo)">
                      <input
                        style={styles.input}
                        value={invoice.paidByPerson || ""}
                        list="personas-que-pagan"
                        placeholder="Vacío = la pagó la empresa"
                        onChange={(e) =>
                          updatePurchaseInvoice(invoice.id, "paidByPerson" as any, e.target.value)
                        }
                      />
                      {invoice.paidByPerson?.trim() ? (
                        <div style={{ ...styles.muted, fontSize: 11, marginTop: 2 }}>
                          {invoice.reimbursedAt
                            ? `Reintegrado el ${formatDateDisplay(invoice.reimbursedAt)}.`
                            : "Queda como deuda con esa persona hasta marcarla reintegrada."}
                        </div>
                      ) : null}
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea style={styles.textarea} value={invoice.notes} onChange={(e) => updatePurchaseInvoice(invoice.id, "notes", e.target.value)} />
                  </Field>
                  <div style={styles.uploadActions}>
                    <FileDropButton
                      label="Cargar imagen o PDF"
                      fileName={invoice.attachmentName}
                      onFileSelected={(file) => uploadPurchaseInvoiceFile(invoice.id, file)}
                    />
                  </div>
                </div>
                );
              })
            )}
          </Panel>

          <Panel
            title="Facturas recibidas y su pago"
            span="full"
            actions={
              <ButtonLike onClick={anchosPagos.toggleCompacto} secondary>
                {anchosPagos.esCompacto ? "Ancho normal" : "Compacto"}
              </ButtonLike>
            }
          >
            <div style={styles.sectionNote}>
              Todo lo que nos facturaron -- el listado de ARCA, lo cargado a mano y lo que sube de caja
              chica -- con <strong>su pago al lado</strong>. El punto verde es que el pago está
              registrado; el amarillo es que falta. Si la puso alguien de su bolsillo, escribí el nombre
              en "la pagó" y pasa a la deuda con la gente.
            </div>
            {purchaseInvoiceRows.length === 0 ? (
              <div style={styles.empty}>No hay facturas de compra cargadas.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosPagos.vars }}>
                <table style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Proveedor · comprobante
                        <PlanillaManija
                          onMouseDown={(ev) => anchosPagos.startResize(ev, "label")}
                          onDoubleClick={anchosPagos.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Total
                        <PlanillaManija
                          onMouseDown={(ev) => anchosPagos.startResize(ev, "col")}
                          onDoubleClick={anchosPagos.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Fecha</th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Pago</th>
                      <th style={thFlexible}>Estado del pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseInvoiceRows.map((inv: any) => {
                      const pagada = !!inv.pagoFecha;
                      const laPuso = String(inv.paidByPerson || "").trim();
                      return (
                        <tr key={`pago-${inv.id}`}>
                          <td
                            style={{
                              ...tdNombre,
                              fontWeight: 400,
                              boxShadow: `inset 4px 0 0 ${getCompanyMeta(inv.company).primary}`,
                            }}
                            title={`${inv.supplier} · ${inv.invoiceNumber || "sin comprobante"}`}
                          >
                            <span
                              title={pagada ? "Pago registrado" : "Sin pago registrado"}
                              style={{
                                display: "inline-block",
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                marginRight: 7,
                                background: pagada ? "#16a34a" : "#ca8a04",
                              }}
                            />
                            {inv.supplier || "sin proveedor"}
                            <span style={{ color: "#94a3b8" }}>
                              {" · "}
                              {inv.invoiceNumber || "sin comprobante"}
                              {" · "}
                              {origenLabel[inv.origin] || inv.origin}
                            </span>
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                            {money(inv.total)}
                            <ColorTag color={inv.administration} />
                          </td>
                          <td style={{ ...tdDato, color: "#475569" }}>
                            {formatDateDisplay(inv.invoiceDate)}
                          </td>
                          <td
                            style={{
                              ...tdDato,
                              textAlign: "right",
                              fontWeight: 700,
                              color: pagada ? MONEY_OUT_COLOR : "#94a3b8",
                            }}
                          >
                            {pagada ? money(inv.pagoMonto) : "-"}
                          </td>
                          <td style={{ ...tdFlexible, padding: "2px 6px" }}>
                            {pagada ? (
                              <span style={{ color: "#166534" }}>
                                Pagada el {formatDateDisplay(inv.pagoFecha)}
                                {inv.pagoDetalle ? ` · ${inv.pagoDetalle}` : ""}
                                {inv.pagoVia === "banco" ? " · del banco" : ""}
                                {Math.abs(inv.pagoMonto - inv.total) > 1 && (
                                  <span style={{ color: "#b45309" }}>
                                    {" · el pago no coincide con el total"}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span
                                style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                              >
                                <select
                                  style={{ ...inputCelda, minWidth: 190 }}
                                  value=""
                                  onChange={(e) =>
                                    updatePurchaseInvoice(
                                      inv.id,
                                      "paidByCostEntryId" as any,
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                >
                                  <option value="">Sin pago · vincular uno</option>
                                  {pagosVinculables(inv.company, inv.supplier).map((pago: any) => (
                                    <option key={pago.id} value={pago.id}>
                                      {formatDateDisplay(pago.date)} · {money(pago.amount)}
                                      {pago.description ? ` · ${pago.description}` : ""}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  style={{ ...inputCelda, minWidth: 150 }}
                                  value={laPuso}
                                  list="personas-que-pagan"
                                  placeholder="la pagó (empleado/socio)"
                                  title="Si la puso alguien de su bolsillo, la empresa le queda debiendo"
                                  onChange={(e) =>
                                    updatePurchaseInvoice(inv.id, "paidByPerson" as any, e.target.value)
                                  }
                                />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Resumen administrativo de compras" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturas cargadas" value={String(purchaseInvoiceSummary.invoicesCount)} />
              <MiniMetric label="Carga asistida" value={String(purchaseInvoiceSummary.autoLoadedCount)} />
              <MiniMetric label="Exento" value={money(purchaseInvoiceSummary.exemptAmount)} tone="out" />
              <MiniMetric label="Neto 21%" value={money(purchaseInvoiceSummary.net21)} tone="out" />
              <MiniMetric label="IVA credito fiscal" value={money(purchaseInvoiceSummary.vatAmount)} tone="out" />
              <MiniMetric label="Total compras" value={money(purchaseInvoiceSummary.totalAmount)} tone="out" />
              {Number(purchaseInvoiceSummary.usdTotalAmount || 0) > 0 && (
                <MiniMetric
                  label="Total compras U$S"
                  value={money(purchaseInvoiceSummary.usdTotalAmount, "USD")}
                  tone="out"
                />
              )}
              <MiniMetric label="Caja chica blanco" value={money(pettyCashSummary.whiteTotal)} tone="out" />
              <MiniMetric label="Caja chica negro" value={money(pettyCashSummary.blackTotal)} tone="out" />
              <MiniMetric label="Del listado de ARCA" value={String(facturasDeArca.length)} />
              <MiniMetric
                label="Sin pago registrado"
                value={`${facturasSinPago.length} · ${money(totalSinPago)}`}
                tone={facturasSinPago.length > 0 ? "out" : undefined}
              />
            </div>
            <div style={styles.noticeBox}>
              Proveedor, comprobante, moneda, neto gravado, exento e IVA separado, listo para exportar al
              estudio contable. <strong>Sin pago registrado</strong> es el control: si ese número no baja,
              o falta cargar el pago, o se pagó en negro, o lo puso alguien de su bolsillo.
            </div>
          </Panel>

          <Panel
            title={`Compras de caja chica - ${monthLabel(purchaseMonth)}`}
            span="full"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftPurchaseMonth(-1)} secondary>
                  Mes anterior
                </ButtonLike>
                <div style={styles.calendarMonthLabel}>{monthLabel(purchaseMonth)}</div>
                <ButtonLike onClick={() => shiftPurchaseMonth(1)} secondary>
                  Mes siguiente
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.sectionNote}>
              Lo que se compró por caja chica en el mes, <strong>en blanco y en negro</strong>. Lo blanco
              tiene factura y sube a compras; lo negro no, pero igual es plata que salió y se controla
              acá. Son <strong>los mismos gastos</strong> que se rinden en la solapa Caja chica: acá se
              miran por mes, allá se cargan y se rinden.{" "}
              <strong>Blanco {money(pettyCashCajaBlanco)}</strong>
              {" · "}
              <strong style={{ color: MONEY_OUT_COLOR }}>Negro {money(pettyCashCajaNegro)}</strong>
              .
            </div>
            {monthPettyCashExpenses.length === 0 ? (
              <div style={styles.empty}>
                No hay gastos de caja chica en {monthLabel(purchaseMonth)}.
              </div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosCajaBlanca.vars }}>
                <table style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Descripción
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCajaBlanca.startResize(ev, "label")}
                          onDoubleClick={anchosCajaBlanca.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Total
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCajaBlanca.startResize(ev, "col")}
                          onDoubleClick={anchosCajaBlanca.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Fecha</th>
                      <th style={thFlexible}>Proveedor · factura · empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthPettyCashExpenses.map((item) => (
                      <tr key={`pc-${item.id}`}>
                        <td
                          style={{
                            ...tdNombre,
                            fontWeight: 400,
                            boxShadow: `inset 4px 0 0 ${getCompanyMeta(item.company).primary}`,
                          }}
                          title={item.description}
                        >
                          {item.description}
                        </td>
                        <td style={{ ...tdDato, ...styles.amountOut, textAlign: "right", fontWeight: 700 }}>
                          {money(item.amount)}
                          <ColorTag color={item.administration === "negro" ? "negro" : "blanco"} />
                        </td>
                        <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(item.date)}</td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {item.supplier || "sin proveedor"}
                          <span style={{ color: "#94a3b8" }}>
                            {" · "}
                            {item.invoiceNumber || "sin factura"}
                            {" · "}
                            {getCompanyMeta(item.company).short}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Compras pendientes para fabricacion" span="full">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items faltantes" value={String(stockNeedRows.length)} />
              <MiniMetric label="Costo estimado" value={money(totalPurchaseNeed)} />
              <MiniMetric label="Trabajos con fecha limite" value={String(purchaseCalendarRows.length)} />
            </div>
            {fabricationPendingPurchases.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos activos.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosPendientes.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Material
                      <PlanillaManija
                        onMouseDown={(ev) => anchosPendientes.startResize(ev, "label")}
                        onDoubleClick={anchosPendientes.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Requerido
                      <PlanillaManija
                        onMouseDown={(ev) => anchosPendientes.startResize(ev, "col")}
                        onDoubleClick={anchosPendientes.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Faltante</th>
                    <th style={thFlexible}>Trabajos · empresas</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationPendingPurchases.map((row) => (
                    <tr key={row.description}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={row.description}>
                        <span
                          title={row.available > 0 ? "Hay parte en stock" : "Hay que comprar todo"}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                            background: row.available > 0 ? "#ca8a04" : "#dc2626",
                          }}
                        />
                        {row.description}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right" }}>
                        {row.required} <span style={{ color: "#94a3b8" }}>{row.unit}</span>
                        <span style={{ color: "#94a3b8" }}> · hay {row.available}</span>
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: row.available > 0 ? "#ca8a04" : "#dc2626",
                        }}
                      >
                        {row.missing} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{row.unit}</span>
                      </td>
                      <td
                        style={{ ...tdFlexible, color: "#64748b" }}
                        title={`${row.jobs.join(", ")} · ${row.companyLabels.join(", ")}`}
                      >
                        {row.jobs.join(", ")}
                        <span style={{ color: "#94a3b8" }}> · {row.companyLabels.join(", ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>

          <Panel title="Compras realizadas" span="full">
            {fabricationCompletedPurchases.length === 0 ? (
              <div style={styles.empty}>Todavia no hay facturas de compra cargadas.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosCompras.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Proveedor
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCompras.startResize(ev, "label")}
                        onDoubleClick={anchosCompras.resetLabel}
                      />
                    </th>
                    <th style={thColumna}>
                      Fecha
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCompras.startResize(ev, "col")}
                        onDoubleClick={anchosCompras.resetCol}
                      />
                    </th>
                    <th style={thFlexible}>Comprobante · origen · empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCompletedPurchases.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          ...tdNombre, fontWeight: 400,
                          boxShadow: `inset 4px 0 0 ${getCompanyMeta(item.company).primary}`,
                        }}
                        title={item.supplier}
                      >
                        {item.supplier}
                      </td>
                      <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(item.invoiceDate)}</td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        {[item.receiptKind, item.receiptLetter].filter(Boolean).join(" ") || "sin comprobante"}
                        <span style={{ color: "#94a3b8" }}>
                          {" "}{item.invoiceNumber || ""}
                          {" · "}{item.source === "caja_chica" ? "caja chica" : "compras"}
                          {" · "}{getCompanyMeta(item.company).short}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>


        </div>
  );
}
