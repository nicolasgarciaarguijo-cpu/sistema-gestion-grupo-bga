// VENTANA DE FACTURA DE COMPRA (Nicolas, 2026-10-14): los datos de la factura, el PROVEEDOR (de la
// lista de habituales o uno nuevo) y sus PAGOS (2026-10-20: varios pagos parciales sobre la misma factura,
// cada uno con empresa, administracion blanco/negro y medio de pago; lo que falta es el saldo, que va a
// Pagos programados con su fecha). Los pagos quedan asentados en el cash flow.
// Los datos de la factura son los que pide el estudio contable (tipo de comprobante, letra, numero,
// exento, neto, IVA con su alicuota, otros impuestos, IIBB, total): el IVA y el total se calculan solos.
// Es la misma ventana desde Compras y desde la ficha del proveedor.
import React, { useMemo, useState } from "react";
import { FirmanteFijo } from "./FirmanteSelect";

import NumInput from "./NumInput";

export type MedioPago = "efectivo" | "transferencia" | "cheque" | "tarjeta_debito" | "tarjeta_credito" | "debito";
export const MEDIOS_PAGO: Array<{ value: MedioPago; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta_debito", label: "Tarjeta de débito" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito" },
];

// Un pago de la factura. Con costEntryId es uno ya cargado (se edita); sin, se crea al guardar.
export type PagoFactura = {
  key: string;
  costEntryId?: number;
  fecha: string;
  monto: number;
  metodo: MedioPago;
  cuentaId?: string;
  administration: "blanco" | "negro";
  empresa?: string; // empresa que PAGA (ausente = la de la factura). Distinta = pago cruzado.
  pagadoPor?: string; // efectivo negro: quien de la nomina hizo el pago (informativo)
  firmante?: string; // ultimo firmante (solo para mostrar: al guardar firma el usuario que opera)
};

export const TIPOS_COMPROBANTE = ["Factura", "Nota de débito", "Ticket factura", "Recibo", "Otro"];
export const ALICUOTAS_IVA = [21, 10.5, 27, 5, 2.5, 0];

export type FacturaForm = {
  id?: number;
  company: string;
  supplier: string;
  taxId: string;
  altaProveedor: boolean; // proveedor nuevo: darlo de alta en el listado
  receiptKind: string; // tipo de comprobante
  receiptLetter: string;
  invoiceNumber: string;
  invoiceDate: string;
  net21: number; // neto gravado
  vatRate: number; // alicuota de IVA (21 por defecto)
  vatManual?: boolean; // el IVA se corrigio a mano: ya no se recalcula con el neto
  exemptAmount: number;
  vat: number;
  otrosImpuestos: number;
  iibb: number;
  total: number;
  administration: "blanco" | "negro";
  grupoCosto?: string; // "tipo|nombre"
  notes: string;
  pagos: PagoFactura[];
  // Lo que falta pagar: para cuando y con que estado (Pagos programados).
  saldo: { fechaPrevista?: string; estadoPrevisto: "programado" | "estimado" | "inamovible" };
  porBanco?: string; // solo lectura: "pagada por un debito del banco"
  // MATERIAL (Fase 5): los remitos de recepcion que respaldan esta factura (el stock ya entro con
  // ellos) o, si no vino remito, cargar sus renglones como recepcion al guardar.
  remitoIds?: number[];
  cargarRenglones?: boolean;
};

// IVA y total a partir de los importes. Puro, para la ventana y para quien cargue una factura.
export const ivaDe = (neto: number, alicuota: number) => Math.round(Number(neto || 0) * Number(alicuota || 0)) / 100;
export const totalDe = (f: Pick<FacturaForm, "net21" | "exemptAmount" | "vat" | "otrosImpuestos" | "iibb">) =>
  Math.round(
    (Number(f.net21 || 0) + Number(f.exemptAmount || 0) + Number(f.vat || 0) + Number(f.otrosImpuestos || 0) + Number(f.iibb || 0)) * 100
  ) / 100;

type ProveedorOpt = {
  id: number;
  name: string;
  taxId: string;
  company: string;
  currentAccount?: boolean;
  grupoCosto?: string;
  tipoGastoLocked?: boolean;
  condicionIva?: string;
};

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };
const caja: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" };
const titulo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };

export function FacturaCompraModal({
  inicial,
  proveedores,
  cuentas,
  companyOptions,
  renglonesEgreso,
  pagosVinculables,
  fechaSegunCondicion,
  money,
  onGuardar,
  onBorrar,
  onCerrar,
  esMateriales,
  recepciones,
  personas = [],
}: {
  inicial: FacturaForm;
  proveedores: ProveedorOpt[];
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  renglonesEgreso: Array<{ key: string; label: string }>; // grupos de costo: key "tipo|nombre"
  pagosVinculables: (company: string, supplier: string) => Array<{
    id: number; date: string; amount: number; description: string;
    company?: string; paymentMethod?: string; administration?: "blanco" | "negro"; cuentaId?: string; firmante?: string;
  }>;
  fechaSegunCondicion: (supplier: string, taxId: string, fechaFactura: string) => string | undefined;
  money: (n: number) => string;
  onGuardar: (f: FacturaForm) => void;
  onBorrar?: (id: number) => void;
  onCerrar: () => void;
  // Fase 5: si la compra es de materiales, los remitos de recepcion del proveedor para vincular.
  esMateriales?: (grupoCosto?: string) => boolean;
  recepciones?: (company: string, supplier: string, taxId: string, facturaId?: number) => Array<{ id: number; label: string }>;
  // Nomina: para elegir quien pago cuando el pago es en efectivo negro.
  personas?: string[];
}) {
  const [f, setF] = useState<FacturaForm>(inicial);
  const set = (patch: Partial<FacturaForm>) => setF((p) => ({ ...p, ...patch }));
  const setPagoN = (key: string, patch: Partial<PagoFactura>) =>
    setF((x) => ({ ...x, pagos: x.pagos.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
  const pagado = Math.round(f.pagos.reduce((a, p) => a + Number(p.monto || 0), 0) * 100) / 100;
  const saldo = f.porBanco ? 0 : Math.max(0, Math.round((Number(f.total || 0) - pagado) * 100) / 100);
  const claveNueva = () => `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  // Un pago nuevo arranca con lo que falta, la empresa y la administracion de la factura.
  const agregarPago = () =>
    setF((x) => ({
      ...x,
      pagos: [
        ...x.pagos,
        {
          key: claveNueva(),
          fecha: new Date().toISOString().slice(0, 10),
          monto: saldo,
          metodo: x.administration === "negro" ? "efectivo" : "transferencia",
          administration: x.administration,
        },
      ],
    }));
  const vincularPago = (pv: ReturnType<typeof pagosVinculables>[number]) =>
    setF((x) => ({
      ...x,
      pagos: [
        ...x.pagos,
        {
          key: `c${pv.id}`,
          costEntryId: pv.id,
          fecha: pv.date,
          monto: Number(pv.amount || 0),
          metodo: ((pv.paymentMethod as MedioPago) || "transferencia"),
          administration: pv.administration === "negro" ? "negro" : "blanco",
          cuentaId: pv.cuentaId,
          empresa: pv.company && pv.company !== x.company ? pv.company : undefined,
          firmante: pv.firmante,
        },
      ],
    }));
  // Importes: el IVA sale del neto y la alicuota (salvo que se haya corregido a mano) y el total, de la suma.
  const importes = (patch: Partial<FacturaForm>) =>
    setF((x) => {
      const n = { ...x, ...patch };
      if (!n.vatManual) n.vat = ivaDe(n.net21, n.vatRate);
      n.total = totalDe(n);
      return n;
    });
  // Letra C (monotributo) o X: el IVA no se discrimina.
  const elegirLetra = (letra: string) =>
    letra === "C" || letra === "X"
      ? importes({ receiptLetter: letra, vatRate: 0, vatManual: false })
      : importes({ receiptLetter: letra, vatRate: f.vatRate === 0 ? 21 : f.vatRate, vatManual: false });

  const delaEmpresa = useMemo(
    () => proveedores.filter((p) => p.company === f.company || p.company === "General").sort((a, b) => a.name.localeCompare(b.name)),
    [proveedores, f.company]
  );
  const elegido = delaEmpresa.find((p) => p.name.trim().toLowerCase() === f.supplier.trim().toLowerCase());
  const esNuevo = !!f.supplier.trim() && !elegido;
  const yaEnLaFactura = new Set(f.pagos.map((p) => p.costEntryId).filter((x) => x != null));
  const vinculables = pagosVinculables(f.company, f.supplier).filter((p) => !yaEnLaFactura.has(p.id));

  const elegirProveedor = (nombre: string) => {
    const p = delaEmpresa.find((x) => x.name === nombre);
    if (!p) {
      set({ supplier: "", taxId: "" });
      return;
    }
    const patch: Partial<FacturaForm> = { supplier: p.name, taxId: p.taxId || "", altaProveedor: false };
    if (!f.grupoCosto && p.grupoCosto) patch.grupoCosto = p.grupoCosto;
    // Un monotributista factura C (sin IVA discriminado); un responsable inscripto, A.
    if (!f.id && p.condicionIva === "monotributo") Object.assign(patch, { receiptLetter: "C", vatRate: 0, vatManual: false });
    if (!f.id && p.condicionIva === "responsable_inscripto" && f.receiptLetter === "C") Object.assign(patch, { receiptLetter: "A", vatRate: 21, vatManual: false });
    setF((prev) => {
      const next = { ...prev, ...patch };
      if (!next.vatManual) next.vat = ivaDe(next.net21, next.vatRate);
      next.total = totalDe(next);
      const prevista = fechaSegunCondicion(p.name, p.taxId, prev.invoiceDate);
      if (prevista && !prev.saldo.fechaPrevista) next.saldo = { ...next.saldo, fechaPrevista: prevista };
      return next;
    });
  };



  const faltan: string[] = [];
  if (!f.supplier.trim()) faltan.push("el proveedor");
  if (!f.invoiceDate) faltan.push("la fecha de la factura");
  if (!(Number(f.total) > 0)) faltan.push("el total");
  if (f.pagos.some((p) => !p.fecha || !(Number(p.monto) > 0))) faltan.push("la fecha y el monto de cada pago");
  if (pagado > Number(f.total || 0) + 1) faltan.push(`que los pagos no pasen el total (sobran ${money(pagado - Number(f.total || 0))})`);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4600, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(860px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{f.id ? "Factura de compra" : "Agregar factura de compra"}</div>
          <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cerrar</button>
        </div>

        <div style={caja}>
          <div style={titulo}>1 · Proveedor</div>
          <div style={grid}>
            <label style={lbl}>Empresa
              <select style={input} value={f.company} onChange={(e) => set({ company: e.target.value })}>
                {companyOptions.filter((c) => c.value !== "General").map((c) => (
                  <option key={c.value} value={c.value}>{c.label || c.value}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Proveedor habitual
              <select style={input} value={elegido?.name || ""} onChange={(e) => elegirProveedor(e.target.value)}>
                <option value="">— Elegí de la lista (o escribí uno nuevo abajo) —</option>
                {delaEmpresa.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}{p.currentAccount ? " · cta cte" : ""}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Nombre / razón social
              <input style={input} value={f.supplier} placeholder="Proveedor" onChange={(e) => set({ supplier: e.target.value })} />
            </label>
            <label style={lbl}>CUIT
              <input style={input} value={f.taxId} placeholder="30-00000000-0" onChange={(e) => set({ taxId: e.target.value })} />
            </label>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5 }}>
            {elegido ? (
              <span style={{ color: elegido.currentAccount ? "#166534" : "#475569", fontWeight: 700 }}>
                {elegido.currentAccount ? "✓ Proveedor con CUENTA CORRIENTE" : "Proveedor habitual (sin cuenta corriente)"}
              </span>
            ) : esNuevo ? (
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "#b45309", fontWeight: 700 }}>
                <input type="checkbox" checked={f.altaProveedor} onChange={(e) => set({ altaProveedor: e.target.checked })} />
                Proveedor NUEVO: darlo de alta en el listado de proveedores
              </label>
            ) : null}
          </div>
        </div>

        <div style={caja}>
          <div style={titulo}>2 · Factura</div>
          <div style={grid}>
            <label style={lbl}>Tipo de comprobante
              <select style={input} value={f.receiptKind} onChange={(e) => set({ receiptKind: e.target.value })}>
                {Array.from(new Set([...TIPOS_COMPROBANTE, f.receiptKind].filter(Boolean))).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Tipo (letra)
              <select style={input} value={f.receiptLetter} onChange={(e) => elegirLetra(e.target.value)}>
                {["A", "B", "C", "M", "E", "X (sin factura)"].map((l) => (
                  <option key={l} value={l.charAt(0)}>{l}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Número
              <input style={input} value={f.invoiceNumber} placeholder="0001-00001234" onChange={(e) => set({ invoiceNumber: e.target.value })} />
            </label>
            <label style={lbl}>Fecha de la factura
              <input style={input} type="date" value={f.invoiceDate} onChange={(e) => set({ invoiceDate: e.target.value })} />
            </label>
          </div>
          <div style={{ ...grid, marginTop: 10 }}>
            <label style={lbl}>Neto gravado
              <NumInput style={input} value={f.net21 || ""} onChange={(e) => importes({ net21: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Alícuota IVA
              <select style={input} value={String(f.vatRate)} onChange={(e) => importes({ vatRate: Number(e.target.value), vatManual: false })}>
                {Array.from(new Set([...ALICUOTAS_IVA, f.vatRate])).map((a) => (
                  <option key={a} value={String(a)}>{String(a).replace(".", ",")} %</option>
                ))}
              </select>
            </label>
            <label style={lbl} title="Se calcula solo con el neto y la alícuota. Si la factura dice otra cosa, corregilo.">
              IVA {f.vatManual ? <span style={{ color: "#b45309", fontWeight: 700 }}>· a mano</span> : <span style={{ color: "#94a3b8", fontWeight: 400 }}>· automático</span>}
              <NumInput style={input} value={f.vat || ""} onChange={(e) => importes({ vat: Number(e.target.value) || 0, vatManual: true })} />
            </label>
            <label style={lbl}>Exento / no gravado
              <NumInput style={input} value={f.exemptAmount || ""} onChange={(e) => importes({ exemptAmount: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Otros impuestos
              <NumInput style={input} value={f.otrosImpuestos || ""} onChange={(e) => importes({ otrosImpuestos: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Percepción IIBB
              <NumInput style={input} value={f.iibb || ""} onChange={(e) => importes({ iibb: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl} title="Neto + IVA + exento + otros impuestos + IIBB">
              Total
              <NumInput style={{ ...input, fontWeight: 800 }} value={f.total || ""} onChange={(e) => set({ total: Number(e.target.value) || 0 })} />
            </label>
          </div>
          {Math.abs(totalDe(f) - Number(f.total || 0)) > 1 && (
            <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700, marginTop: 6 }}>
              ⚠ El total ({money(f.total)}) no coincide con la suma de los importes ({money(totalDe(f))}).{" "}
              <button type="button" style={{ ...input, width: "auto", padding: "1px 8px", cursor: "pointer" }} onClick={() => set({ total: totalDe(f) })}>Usar la suma</button>
            </div>
          )}
          <div style={{ ...grid, marginTop: 10 }}>
            <label style={lbl}>Administración de la factura
              <select
                style={{ ...input, background: f.administration === "negro" ? "#1f2937" : "#fff", color: f.administration === "negro" ? "#fff" : "#0f172a" }}
                value={f.administration}
                onChange={(e) => set({ administration: e.target.value as any })}
              >
                <option value="blanco">Blanco</option>
                <option value="negro">Negro (sin factura)</option>
              </select>
            </label>
            <label style={{ ...lbl, gridColumn: "span 2" }}>Grupo de costo (tipo · grupo)
              <select style={input} value={f.grupoCosto || ""} onChange={(e) => set({ grupoCosto: e.target.value || undefined })}>
                <option value="">— El del proveedor —</option>
                {renglonesEgreso.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ ...lbl, marginTop: 8 }}>Notas
            <input style={input} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </div>

        <div style={caja}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <div style={titulo}>3 · Pagos</div>
            <div style={{ fontSize: 12.5, display: "flex", gap: 12 }}>
              <span>Total <strong>{money(f.total)}</strong></span>
              <span style={{ color: "#166534" }}>Pagado <strong>{money(pagado)}</strong></span>
              <span style={{ color: saldo > 1 ? "#b45309" : "#166534" }}>{saldo > 1 ? <>Falta <strong>{money(saldo)}</strong></> : <strong>✓ Pagada</strong>}</span>
            </div>
          </div>
          {f.porBanco && <div style={{ fontSize: 13, color: "#166534", fontWeight: 700, marginBottom: 8 }}>✓ {f.porBanco}</div>}
          {f.pagos.length === 0 && !f.porBanco && (
            <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>Sin pagos todavía. Se le pueden cargar varios (pagos parciales) hasta completar el total.</div>
          )}
          {f.pagos.map((p, i) => {
            const empresaPaga = p.empresa || f.company;
            const cruzado = empresaPaga !== f.company;
            const cruceAdm = p.administration !== f.administration;
            return (
              <div key={p.key} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#fff", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12.5 }}>Pago {i + 1}{p.costEntryId ? "" : " · nuevo"}</strong>
                  <button
                    type="button"
                    onClick={() => setF((x) => ({ ...x, pagos: x.pagos.filter((y) => y.key !== p.key) }))}
                    style={{ ...input, width: "auto", padding: "1px 8px", cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca" }}
                    title={p.costEntryId ? "Lo suelta de la factura (si se cargó con la factura, se borra)" : "Sacar este pago"}
                  >
                    Quitar
                  </button>
                </div>
                <div style={grid}>
                  <label style={lbl}>Fecha del pago
                    <input style={input} type="date" value={p.fecha} onChange={(e) => setPagoN(p.key, { fecha: e.target.value })} />
                  </label>
                  <label style={lbl}>Monto
                    <NumInput style={input} value={p.monto || ""} onChange={(e) => setPagoN(p.key, { monto: Number(e.target.value) || 0 })} />
                  </label>
                  <label style={lbl}>Empresa que paga
                    <select
                      style={{ ...input, ...(cruzado ? { borderColor: "#f59e0b", background: "#fffbeb", color: "#b45309", fontWeight: 700 } : {}) }}
                      value={empresaPaga}
                      onChange={(e) => setPagoN(p.key, { empresa: e.target.value === f.company ? undefined : e.target.value, cuentaId: undefined })}
                    >
                      {companyOptions.filter((c) => c.value !== "General").map((c) => (
                        <option key={c.value} value={c.value}>{c.short || c.label || c.value}</option>
                      ))}
                    </select>
                  </label>
                  <label style={lbl}>Administración
                    <select
                      style={{ ...input, background: p.administration === "negro" ? "#1f2937" : "#fff", color: p.administration === "negro" ? "#fff" : "#0f172a" }}
                      value={p.administration}
                      onChange={(e) => {
                        const adm = e.target.value as "blanco" | "negro";
                        // Negro es efectivo: no pasa por ninguna cuenta del banco.
                        setPagoN(p.key, adm === "negro" ? { administration: adm, metodo: "efectivo" } : { administration: adm });
                      }}
                    >
                      <option value="blanco">Blanco</option>
                      <option value="negro">Negro</option>
                    </select>
                  </label>
                  <label style={lbl}>Medio de pago
                    <select style={input} value={p.metodo} disabled={p.administration === "negro"} onChange={(e) => setPagoN(p.key, { metodo: e.target.value as MedioPago })}>
                      {MEDIOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                      {p.metodo === "debito" && <option value="debito">Débito automático</option>}
                    </select>
                  </label>
                  <label style={lbl}>De qué cuenta salió
                    <select style={input} value={p.cuentaId || ""} onChange={(e) => setPagoN(p.key, { cuentaId: e.target.value || undefined })}>
                      <option value="">Cuenta por defecto</option>
                      {cuentas.filter((c) => c.company === empresaPaga && c.activa !== false && (!c.moneda || c.moneda === "ARS")).map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </label>
                  {p.metodo === "efectivo" && p.administration === "negro" && (
                    <label style={lbl} title="Quién de la nómina hizo el pago (si no salió de una caja chica). Solo se cuenta en Movimientos internos; no suma ni resta.">
                      Quién pagó
                      <select style={input} value={p.pagadoPor || ""} onChange={(e) => setPagoN(p.key, { pagadoPor: e.target.value || undefined })}>
                        <option value="">— la empresa (sin persona) —</option>
                        {Array.from(new Set([...(p.pagadoPor ? [p.pagadoPor] : []), ...personas])).map((x) => (
                          <option key={x} value={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <FirmanteFijo previo={p.firmante} labelStyle={lbl} />
                </div>
                {cruzado && (
                  <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700, marginTop: 6 }}>
                    ⚠ Pago cruzado: la factura es de una empresa y la paga otra. Queda a la vista en Movimientos internos.
                  </div>
                )}
                {cruceAdm && (
                  <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700, marginTop: 6 }}>
                    ⚠ Se cruzan las administraciones: factura {f.administration === "negro" ? "NEGRA" : "BLANCA"} pagada en {p.administration === "negro" ? "NEGRO" : "BLANCO"}. Suma al desbalance de cuentas.
                  </div>
                )}
              </div>
            );
          })}
          {!f.porBanco && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={agregarPago}
                style={{ ...input, width: "auto", cursor: "pointer", fontWeight: 800, background: "#16a34a", color: "#fff", borderColor: "#15803d" }}
              >
                + Agregar pago{saldo > 1 && f.pagos.length > 0 ? ` (falta ${money(saldo)})` : ""}
              </button>
              {vinculables.length > 0 && (
                <select
                  style={{ ...input, width: "auto", maxWidth: 380 }}
                  value=""
                  onChange={(e) => {
                    const pv = vinculables.find((x) => x.id === Number(e.target.value));
                    if (pv) vincularPago(pv);
                  }}
                >
                  <option value="">Vincular un pago ya cargado…</option>
                  {vinculables.map((pv) => (
                    <option key={pv.id} value={pv.id}>{pv.date} · {money(pv.amount)} · {pv.description}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {saldo > 1 && !f.porBanco && (
            <div style={{ ...grid, marginTop: 10 }}>
              <label style={lbl}>Fecha prevista del saldo
                <input style={input} type="date" value={f.saldo.fechaPrevista || ""} onChange={(e) => setF((x) => ({ ...x, saldo: { ...x.saldo, fechaPrevista: e.target.value || undefined } }))} />
              </label>
              <label style={lbl}>Estado del pago
                <select style={input} value={f.saldo.estadoPrevisto} onChange={(e) => setF((x) => ({ ...x, saldo: { ...x.saldo, estadoPrevisto: e.target.value as any } }))}>
                  <option value="programado">Programado</option>
                  <option value="estimado">Estimado</option>
                  <option value="inamovible">Inamovible</option>
                </select>
              </label>
              <div style={{ fontSize: 11.5, color: "#64748b", alignSelf: "end" }}>Con fecha, lo que falta aparece en Pagos programados y en el cash flow, en el renglón del proveedor.</div>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>Cada pago queda asentado en el cash flow y baja la cuenta de donde salió.</div>
        </div>

        {esMateriales && recepciones && esMateriales(f.grupoCosto || elegido?.grupoCosto) && (() => {
          const opciones = recepciones(f.company, f.supplier, f.taxId, f.id);
          const ids = f.remitoIds || [];
          return (
            <div style={caja}>
              <div style={titulo}>4 · Material (stock)</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Es una compra de materiales: el material entra al stock con el REMITO. Vinculá el remito que llegó (la factura no vuelve a sumar) o, si no vino remito, cargá los renglones de la factura.
              </div>
              {opciones.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No hay remitos de recepción de este proveedor sin factura.</div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {opciones.map((o) => (
                    <label key={o.id} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={ids.includes(o.id)}
                        onChange={(e) => set({ remitoIds: e.target.checked ? [...ids, o.id] : ids.filter((x) => x !== o.id), cargarRenglones: false })}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, marginTop: 8, fontWeight: 700, color: "#0f766e" }}>
                <input type="checkbox" checked={!!f.cargarRenglones} disabled={ids.length > 0} onChange={(e) => set({ cargarRenglones: e.target.checked })} />
                No vino remito: al guardar, cargar los renglones de esta factura (entran al stock)
              </label>
            </div>
          );
        })()}

        {faltan.length > 0 && <div style={{ fontSize: 12.5, color: "#b45309" }}>Falta: {faltan.join(", ")}.</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div>
            {f.id && onBorrar && (
              <button
                type="button"
                onClick={() => window.confirm("¿Borrar esta factura?") && onBorrar(f.id!)}
                style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca" }}
              >
                Borrar factura
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={faltan.length > 0}
            onClick={() => onGuardar(f)}
            style={{ border: "1px solid #15803d", background: faltan.length ? "#bbf7d0" : "#16a34a", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: faltan.length ? "not-allowed" : "pointer" }}
          >
            Guardar factura
          </button>
        </div>
      </div>
    </div>
  );
}
