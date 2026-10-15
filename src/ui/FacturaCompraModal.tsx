// VENTANA DE FACTURA DE COMPRA (Nicolas, 2026-10-14): los datos de la factura, el PROVEEDOR (de la
// lista de habituales o uno nuevo) y el PAGO (si se pago, como y de que cuenta; si no, para cuando y
// con que estado). El pago queda asentado en el cash flow; lo que falta pagar va a Pagos programados.
// Es la misma ventana desde Compras y desde la ficha del proveedor.
import React, { useMemo, useState } from "react";

export type FacturaForm = {
  id?: number;
  company: string;
  supplier: string;
  taxId: string;
  altaProveedor: boolean; // proveedor nuevo: darlo de alta en el listado
  receiptLetter: string;
  invoiceNumber: string;
  invoiceDate: string;
  net21: number;
  exemptAmount: number;
  vat: number;
  total: number;
  administration: "blanco" | "negro";
  grupoCosto?: string; // "tipo|nombre"
  notes: string;
  pago: {
    estado: "pagada" | "impaga";
    modo: "nuevo" | "vincular";
    costEntryId?: number; // vincular un pago ya cargado
    fecha: string;
    monto: number;
    metodo: "transferencia" | "efectivo" | "cheque" | "debito";
    cuentaId?: string;
    administration: "blanco" | "negro";
    fechaPrevista?: string;
    estadoPrevisto: "programado" | "estimado" | "inamovible";
    porBanco?: string; // solo lectura: "pagada por un debito del banco del dd/mm"
  };
  // MATERIAL (Fase 5): los remitos de recepcion que respaldan esta factura (el stock ya entro con
  // ellos) o, si no vino remito, cargar sus renglones como recepcion al guardar.
  remitoIds?: number[];
  cargarRenglones?: boolean;
};

type ProveedorOpt = {
  id: number;
  name: string;
  taxId: string;
  company: string;
  currentAccount?: boolean;
  grupoCosto?: string;
  tipoGastoLocked?: boolean;
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
}: {
  inicial: FacturaForm;
  proveedores: ProveedorOpt[];
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  renglonesEgreso: Array<{ key: string; label: string }>; // grupos de costo: key "tipo|nombre"
  pagosVinculables: (company: string, supplier: string) => Array<{ id: number; date: string; amount: number; description: string }>;
  fechaSegunCondicion: (supplier: string, taxId: string, fechaFactura: string) => string | undefined;
  money: (n: number) => string;
  onGuardar: (f: FacturaForm) => void;
  onBorrar?: (id: number) => void;
  onCerrar: () => void;
  // Fase 5: si la compra es de materiales, los remitos de recepcion del proveedor para vincular.
  esMateriales?: (grupoCosto?: string) => boolean;
  recepciones?: (company: string, supplier: string, taxId: string, facturaId?: number) => Array<{ id: number; label: string }>;
}) {
  const [f, setF] = useState<FacturaForm>(inicial);
  const set = (patch: Partial<FacturaForm>) => setF((p) => ({ ...p, ...patch }));
  const setPago = (patch: Partial<FacturaForm["pago"]>) => setF((p) => ({ ...p, pago: { ...p.pago, ...patch } }));

  const delaEmpresa = useMemo(
    () => proveedores.filter((p) => p.company === f.company || p.company === "General").sort((a, b) => a.name.localeCompare(b.name)),
    [proveedores, f.company]
  );
  const elegido = delaEmpresa.find((p) => p.name.trim().toLowerCase() === f.supplier.trim().toLowerCase());
  const esNuevo = !!f.supplier.trim() && !elegido;
  const vinculables = pagosVinculables(f.company, f.supplier);

  const elegirProveedor = (nombre: string) => {
    const p = delaEmpresa.find((x) => x.name === nombre);
    if (!p) {
      set({ supplier: "", taxId: "" });
      return;
    }
    const patch: Partial<FacturaForm> = { supplier: p.name, taxId: p.taxId || "", altaProveedor: false };
    if (!f.grupoCosto && p.grupoCosto) patch.grupoCosto = p.grupoCosto;
    setF((prev) => {
      const next = { ...prev, ...patch };
      const prevista = fechaSegunCondicion(p.name, p.taxId, prev.invoiceDate);
      if (prevista && !prev.pago.fechaPrevista) next.pago = { ...next.pago, fechaPrevista: prevista };
      return next;
    });
  };

  const recalcularTotal = (patch: Partial<FacturaForm>) => {
    const n = { ...f, ...patch };
    set({ ...patch, total: Math.round((Number(n.net21 || 0) + Number(n.exemptAmount || 0) + Number(n.vat || 0)) * 100) / 100 });
  };

  const faltan: string[] = [];
  if (!f.supplier.trim()) faltan.push("el proveedor");
  if (!f.invoiceDate) faltan.push("la fecha de la factura");
  if (!(Number(f.total) > 0)) faltan.push("el total");
  if (f.pago.estado === "pagada" && !f.pago.porBanco) {
    if (f.pago.modo === "vincular" && !f.pago.costEntryId) faltan.push("el pago a vincular");
    if (f.pago.modo === "nuevo" && (!f.pago.fecha || !(Number(f.pago.monto) > 0))) faltan.push("la fecha y el monto del pago");
  }

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
            <label style={lbl}>Letra
              <select style={input} value={f.receiptLetter} onChange={(e) => set({ receiptLetter: e.target.value })}>
                {["A", "B", "C", "M", "X (sin factura)"].map((l) => (
                  <option key={l} value={l.charAt(0)}>{l}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Número
              <input style={input} value={f.invoiceNumber} placeholder="0001-00001234" onChange={(e) => set({ invoiceNumber: e.target.value })} />
            </label>
            <label style={lbl}>Fecha
              <input style={input} type="date" value={f.invoiceDate} onChange={(e) => set({ invoiceDate: e.target.value })} />
            </label>
            <label style={lbl}>Neto gravado
              <input style={input} type="number" value={f.net21 || ""} onChange={(e) => recalcularTotal({ net21: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>No gravado / exento
              <input style={input} type="number" value={f.exemptAmount || ""} onChange={(e) => recalcularTotal({ exemptAmount: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>IVA
              <input style={input} type="number" value={f.vat || ""} onChange={(e) => recalcularTotal({ vat: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Total
              <input style={{ ...input, fontWeight: 800 }} type="number" value={f.total || ""} onChange={(e) => set({ total: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Circuito
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
          <div style={titulo}>3 · Pago</div>
          {f.pago.porBanco ? (
            <div style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>✓ {f.pago.porBanco}</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 13 }}>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                  <input type="radio" checked={f.pago.estado === "pagada"} onChange={() => setPago({ estado: "pagada", monto: f.pago.monto || f.total })} />
                  Pagada
                </label>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                  <input type="radio" checked={f.pago.estado === "impaga"} onChange={() => setPago({ estado: "impaga" })} />
                  Sin pagar todavía
                </label>
              </div>
              {f.pago.estado === "pagada" ? (
                <>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8, fontSize: 12.5 }}>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" checked={f.pago.modo === "nuevo"} onChange={() => setPago({ modo: "nuevo" })} />
                      Registrar el pago
                    </label>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" checked={f.pago.modo === "vincular"} onChange={() => setPago({ modo: "vincular" })} />
                      Vincular un pago ya cargado
                    </label>
                  </div>
                  {f.pago.modo === "vincular" ? (
                    <select style={input} value={f.pago.costEntryId || ""} onChange={(e) => setPago({ costEntryId: Number(e.target.value) || undefined })}>
                      <option value="">{vinculables.length ? "Elegí el pago" : "No hay pagos cargados de este proveedor"}</option>
                      {vinculables.map((p) => (
                        <option key={p.id} value={p.id}>{p.date} · {money(p.amount)} · {p.description}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={grid}>
                      <label style={lbl}>Fecha del pago
                        <input style={input} type="date" value={f.pago.fecha} onChange={(e) => setPago({ fecha: e.target.value })} />
                      </label>
                      <label style={lbl}>Monto pagado
                        <input style={input} type="number" value={f.pago.monto || ""} onChange={(e) => setPago({ monto: Number(e.target.value) || 0 })} />
                      </label>
                      <label style={lbl}>Cómo se pagó
                        <select style={input} value={f.pago.metodo} onChange={(e) => setPago({ metodo: e.target.value as any })}>
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="cheque">Cheque</option>
                          <option value="debito">Débito</option>
                        </select>
                      </label>
                      <label style={lbl}>De qué cuenta salió
                        <select style={input} value={f.pago.cuentaId || ""} onChange={(e) => setPago({ cuentaId: e.target.value || undefined })}>
                          <option value="">Cuenta por defecto</option>
                          {cuentas.filter((c) => c.company === f.company && c.activa !== false && (!c.moneda || c.moneda === "ARS")).map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </label>
                      <label style={lbl}>Circuito del pago
                        <select style={input} value={f.pago.administration} onChange={(e) => setPago({ administration: e.target.value as any })}>
                          <option value="blanco">Blanco</option>
                          <option value="negro">Negro</option>
                        </select>
                      </label>
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>El pago queda asentado en el cash flow y baja la cuenta de donde salió.</div>
                </>
              ) : (
                <div style={grid}>
                  <label style={lbl}>Fecha de pago prevista
                    <input style={input} type="date" value={f.pago.fechaPrevista || ""} onChange={(e) => setPago({ fechaPrevista: e.target.value || undefined })} />
                  </label>
                  <label style={lbl}>Estado del pago
                    <select style={input} value={f.pago.estadoPrevisto} onChange={(e) => setPago({ estadoPrevisto: e.target.value as any })}>
                      <option value="programado">Programado</option>
                      <option value="estimado">Estimado</option>
                      <option value="inamovible">Inamovible</option>
                    </select>
                  </label>
                  <div style={{ fontSize: 11.5, color: "#64748b", alignSelf: "end" }}>Con fecha, aparece en Pagos programados y en el Calendario como pago que viene.</div>
                </div>
              )}
            </>
          )}
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
