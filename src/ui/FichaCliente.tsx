// FICHA DEL CLIENTE (Nicolas, 2026-10-22: "la ficha que se vea como la de pago a proveedores, esa estetica me
// gusto mucho. Que ahi figure la informacion, la cantidad de trabajos y todo lo que antes habia solicitado").
// Misma estetica que FichaProveedor: datos, lo que le falta, sus numeros, presupuestos, trabajos y posibles
// duplicados. Se abre desde el CRM (Historial).
import React from "react";
import type { CrmClient } from "../domain/types";
import { faltantesDeCliente } from "../domain/clients";

type Presupuesto = { id: number; date: string; number: string; project: string; status: string; netPrice?: number; exportedAt?: string; revisionNumber?: number };
type Trabajo = { id: number; budgetNumber: string; project: string; approvalDate?: string; date?: string; executionStatus?: string; soldNetPrice?: number; remainingToPay?: number };

const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const ESTADO_PPTO: Record<string, string> = { borrador: "Borrador", aprobado: "Aprobado", no_aprobado: "No aprobado" };
const ESTADO_TRABAJO: Record<string, string> = { pendiente: "Pendiente", en_curso: "En curso", finalizado: "Finalizado" };

export function FichaCliente({
  cliente,
  presupuestos,
  trabajos,
  duplicados,
  companyOptions,
  money,
  onGuardar,
  onAbrirFicha,
  onUnificar,
  onAbrirPresupuesto,
  onCerrar,
}: {
  cliente: CrmClient;
  presupuestos: Presupuesto[];
  trabajos: Trabajo[];
  duplicados: Array<{ cliente: CrmClient; motivos: string[] }>;
  companyOptions: Array<{ value: string; short: string }>;
  money: (n: number) => string;
  // Guarda los campos cambiados (cada uno por su updateCrmClient).
  onGuardar: (cambios: Partial<CrmClient>) => void;
  onAbrirFicha?: (id: number) => void;
  // Unificar: el otro cliente se suma a este (sus presupuestos y trabajos pasan a este) y desaparece.
  onUnificar?: (quedaId: number, saleId: number) => void;
  onAbrirPresupuesto?: (id: number) => void;
  onCerrar: () => void;
}) {
  const [editando, setEditando] = React.useState(false);
  const [borrador, setBorrador] = React.useState<CrmClient>(cliente);
  React.useEffect(() => {
    setBorrador(cliente);
    setEditando(false);
  }, [cliente.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const caja: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" };
  const titulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
  const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13 };
  const etiqueta: React.CSSProperties = { fontSize: 12, color: "#475569", fontWeight: 600, display: "grid", gap: 3 };
  const btnFila = (rojo = false): React.CSSProperties => ({
    border: `1px solid ${rojo ? "#fecaca" : "#cbd5e1"}`, background: "#fff", color: rojo ? "#b91c1c" : "#334155",
    borderRadius: 5, padding: "1px 6px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginLeft: 4, whiteSpace: "nowrap",
  });

  const falta = faltantesDeCliente(cliente);
  const pptosOrdenados = [...presupuestos].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.revisionNumber || 1) - (a.revisionNumber || 1));
  const ultimo = pptosOrdenados[0];
  const aprobados = trabajos.length;
  const vendido = trabajos.reduce((acc, t) => acc + Number(t.soldNetPrice || 0), 0);
  const saldo = trabajos.reduce((acc, t) => acc + Number(t.remainingToPay || 0), 0);
  const tieneSaldo = trabajos.some((t) => t.remainingToPay != null);

  const guardar = () => {
    const cambios: Partial<CrmClient> = {};
    (["name", "taxId", "contactName", "contactPhone", "contactEmail", "direccion", "notes", "company"] as const).forEach((k) => {
      if ((borrador[k] ?? "") !== (cliente[k] ?? "")) (cambios as any)[k] = borrador[k] ?? "";
    });
    if (Object.keys(cambios).length) onGuardar(cambios);
    setEditando(false);
  };
  const campo = (label: string, k: "name" | "taxId" | "contactName" | "contactPhone" | "contactEmail" | "direccion" | "notes") => (
    <label style={etiqueta}>
      {label}
      {editando ? (
        <input style={input} value={String(borrador[k] ?? "")} onChange={(e) => setBorrador({ ...borrador, [k]: e.target.value })} />
      ) : (
        <span style={{ fontSize: 13, color: String(cliente[k] ?? "").trim() ? "#0f172a" : "#b45309", fontWeight: String(cliente[k] ?? "").trim() ? 500 : 700, minHeight: 22, display: "flex", alignItems: "center" }}>
          {String(cliente[k] ?? "").trim() || "falta"}
        </span>
      )}
    </label>
  );

  return (
    <div
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{cliente.name || "Cliente sin nombre"}</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              CUIT {cliente.taxId || "—"}
              {cliente.company ? ` · ${companyOptions.find((c) => c.value === cliente.company)?.short || cliente.company}` : ""}
              {cliente.createdAt ? ` · cliente desde ${fecha(cliente.createdAt)}` : ""}
              {aprobados > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "1px 7px" }}>
                  YA COMPRÓ
                </span>
              )}
            </div>
          </div>
          <span style={{ display: "inline-flex", gap: 6 }}>
            {editando ? (
              <>
                <button type="button" onClick={() => { setBorrador(cliente); setEditando(false); }} style={{ ...input, cursor: "pointer", fontWeight: 700 }}>Cancelar</button>
                <button type="button" onClick={guardar} style={{ ...input, cursor: "pointer", fontWeight: 800, background: "#16a34a", color: "#fff", borderColor: "#15803d" }}>Guardar</button>
              </>
            ) : (
              <button type="button" onClick={() => { setBorrador(cliente); setEditando(true); }} style={{ ...input, cursor: "pointer", fontWeight: 800 }} title="Corregir o completar los datos del cliente">
                ✎ Editar datos
              </button>
            )}
            <button type="button" onClick={onCerrar} style={{ ...input, cursor: "pointer", fontWeight: 700 }}>Cerrar</button>
          </span>
        </div>

        {falta.length > 0 && (
          <div style={{ ...caja, marginTop: 12, background: "#fffbeb", borderColor: "#fde68a" }}>
            <div style={{ ...titulo, color: "#92400e" }}>Le falta ({falta.length})</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {falta.map((f) => (
                <span key={f} style={{ fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 999, padding: "1px 8px" }}>{f}</span>
              ))}
              {!editando && (
                <button type="button" style={{ ...input, cursor: "pointer", fontWeight: 700, fontSize: 12 }} onClick={() => { setBorrador(cliente); setEditando(true); }}>
                  Completar
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Datos del cliente</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {campo("Nombre / razón social", "name")}
            {campo("CUIT/CUIL", "taxId")}
            {campo("Contacto", "contactName")}
            {campo("Teléfono", "contactPhone")}
            {campo("Mail", "contactEmail")}
            {campo("Dirección", "direccion")}
            <label style={etiqueta}>
              Empresa
              {editando ? (
                <select style={input} value={borrador.company} onChange={(e) => setBorrador({ ...borrador, company: e.target.value as CrmClient["company"] })}>
                  {companyOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.short}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 13, minHeight: 22, display: "flex", alignItems: "center" }}>
                  {companyOptions.find((c) => c.value === cliente.company)?.short || cliente.company || "—"}
                </span>
              )}
            </label>
          </div>
          <div style={{ marginTop: 10 }}>{campo("Notas", "notes")}</div>
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Resumen</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
            <span>Presupuestos <strong>{presupuestos.length}</strong></span>
            <span>Trabajos aprobados <strong>{aprobados}</strong></span>
            <span>Vendido (neto) <strong>{money(vendido)}</strong></span>
            {tieneSaldo && (
              <span style={{ color: saldo > 1 ? "#b45309" : "#16a34a", fontWeight: 800 }}>
                {saldo > 1 ? `Saldo a cobrar ${money(saldo)}` : "Cobrado al día"}
              </span>
            )}
            <span>
              Último presupuesto{" "}
              <strong>{ultimo ? `${fecha(ultimo.date)}${ultimo.number ? ` (${ultimo.number})` : ""}` : "—"}</strong>
            </span>
          </div>
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Presupuestos ({presupuestos.length})</div>
          {presupuestos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>No hay presupuestos guardados de este cliente.</div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <tbody>
                  {pptosOrdenados.map((p) => (
                    <tr key={p.id} onClick={() => onAbrirPresupuesto?.(p.id)} style={{ cursor: onAbrirPresupuesto ? "pointer" : undefined, borderBottom: "1px solid #f1f5f9" }} title={onAbrirPresupuesto ? "Click: ver el presupuesto" : undefined}>
                      <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{fecha(p.date)}</td>
                      <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>{p.number || "sin número"}{(p.revisionNumber || 1) > 1 ? ` · rev ${p.revisionNumber}` : ""}</td>
                      <td style={{ padding: "3px 6px" }}>{p.project || "—"}</td>
                      <td style={{ padding: "3px 6px", color: p.status === "aprobado" ? "#166534" : p.status === "no_aprobado" ? "#b91c1c" : "#475569", fontWeight: 700 }}>
                        {ESTADO_PPTO[p.status] || p.status || "—"}
                      </td>
                      <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>{money(Number(p.netPrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Trabajos aprobados ({trabajos.length})</div>
          {trabajos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Todavía no tiene trabajos aprobados.</div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <tbody>
                  {[...trabajos].sort((a, b) => (b.approvalDate || b.date || "").localeCompare(a.approvalDate || a.date || "")).map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", background: Number(t.remainingToPay || 0) > 1 ? "#fffbeb" : undefined }}>
                      <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{fecha(t.approvalDate || t.date)}</td>
                      <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>{t.budgetNumber || "—"}</td>
                      <td style={{ padding: "3px 6px" }}>{t.project || "—"}</td>
                      <td style={{ padding: "3px 6px", color: "#475569", fontWeight: 700 }}>{ESTADO_TRABAJO[t.executionStatus || ""] || t.executionStatus || "—"}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>{money(Number(t.soldNetPrice || 0))}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: Number(t.remainingToPay || 0) > 1 ? "#b45309" : "#16a34a", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {t.remainingToPay == null ? "" : Number(t.remainingToPay) > 1 ? `debe ${money(Number(t.remainingToPay))}` : "cobrado"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {duplicados.length > 0 && (
          <div style={{ ...caja, marginTop: 10, background: "#fff7ed", borderColor: "#fdba74" }}>
            <div style={{ ...titulo, color: "#b45309" }}>Posibles duplicados ({duplicados.length})</div>
            <div style={{ fontSize: 12.5, color: "#7c2d12", marginBottom: 6 }}>
              Parecen ser el mismo cliente cargado dos veces. Si lo es, unificalo: sus presupuestos y trabajos pasan a esta
              ficha, se completan los datos que falten acá y la otra ficha se quita.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {duplicados.map(({ cliente: d, motivos }) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #fed7aa" }}>
                    <td style={{ padding: "3px 6px", fontWeight: 700 }}>{d.name}</td>
                    <td style={{ padding: "3px 6px", color: "#7c2d12" }}>{motivos.join(" · ")}</td>
                    <td style={{ padding: "3px 6px", color: "#64748b" }}>{[d.contactPhone && `☎ ${d.contactPhone}`, d.taxId && `CUIT ${d.taxId}`].filter(Boolean).join(" · ")}</td>
                    <td style={{ padding: "2px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {onAbrirFicha && (
                        <button type="button" style={btnFila()} onClick={() => onAbrirFicha(d.id)} title="Abrir la ficha de este otro cliente">Abrir ficha</button>
                      )}
                      {onUnificar && (
                        <button
                          type="button"
                          style={btnFila(true)}
                          title="Es el mismo cliente: pasar todo a esta ficha y quitar la otra"
                          onClick={() => {
                            if (window.confirm(`¿Unificar "${d.name}" dentro de "${cliente.name}"?\n\nSus presupuestos y trabajos pasan a "${cliente.name}", los datos que falten acá se completan con los de "${d.name}" y la ficha de "${d.name}" se quita.`)) {
                              onUnificar(cliente.id, d.id);
                            }
                          }}
                        >
                          Unificar acá
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
