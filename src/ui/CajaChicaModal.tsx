// ASIGNAR (o editar) UNA CAJA CHICA (Nicolas, 2026-10-14): a quien, de que tipo, cuando, cuanto en blanco
// y cuanto en negro, y de que cuenta sale. Arriba se ve el RESUMEN DE FONDOS (lo asignado, lo usado y lo
// que resta, blanco y negro aparte) para decidir cuanto dar. La caja NO va al cash flow: van sus gastos.
import React, { useMemo, useState } from "react";
import { mismaPersona, resumenCaja, type FondoLike, type GastoLike } from "../domain/cajaChicaFicha";

export type CajaForm = {
  id?: number;
  company: string;
  responsible: string;
  tipo: string;
  description: string;
  deliveredDate: string;
  assignedWhite: number;
  assignedBlack: number;
  cuentaId?: string;
  cuentaDevolucionId?: string;
  notes: string;
};

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a", background: "#fff" };
const caja: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" };
const titulo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const stat: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", background: "#fff" };

export function CajaChicaModal({
  inicial,
  tipos,
  personas,
  fondos,
  gastos,
  cuentas,
  companyOptions,
  money,
  onGuardar,
  onCerrar,
}: {
  inicial: CajaForm;
  tipos: string[];
  personas: string[];
  fondos: FondoLike[];
  gastos: GastoLike[];
  cuentas: Array<{ id: string; company: string; nombre: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string }>;
  money: (n: number) => string;
  onGuardar: (f: CajaForm) => void;
  onCerrar: () => void;
}) {
  const [f, setF] = useState<CajaForm>(inicial);
  const set = (p: Partial<CajaForm>) => setF((x) => ({ ...x, ...p }));

  // Resumen de fondos de la empresa elegida (las cajas abiertas) y del responsable.
  const resumen = useMemo(() => {
    const abiertas = fondos.filter((x) => x.company === f.company && !x.closed && x.id !== f.id);
    const rs = abiertas.map((x) => ({ x, r: resumenCaja(x, gastos) }));
    const sum = (k: (r: ReturnType<typeof resumenCaja>) => number) => rs.reduce((a, { r }) => a + k(r), 0);
    const delResponsable = rs.filter(({ x }) => mismaPersona(x.responsible, f.responsible));
    return {
      abiertas: abiertas.length,
      asignado: sum((r) => r.asignado),
      utilizado: sum((r) => r.utilizado),
      restaBlanco: sum((r) => r.asignadoBlanco - r.utilizadoBlanco),
      restaNegro: sum((r) => r.asignadoNegro - r.utilizadoNegro),
      resta: sum((r) => r.resta),
      responsableCajas: delResponsable.length,
      responsableResta: delResponsable.reduce((a, { r }) => a + r.resta, 0),
    };
  }, [fondos, gastos, f.company, f.responsible, f.id]);

  const total = Number(f.assignedWhite || 0) + Number(f.assignedBlack || 0);
  const faltan: string[] = [];
  if (!f.responsible.trim()) faltan.push("el responsable");
  if (!f.deliveredDate) faltan.push("la fecha de asignación");
  if (!(total > 0)) faltan.push("el monto (blanco y/o negro)");
  const cuentasEmpresa = cuentas.filter((c) => c.company === f.company && c.activa !== false);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4600, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{f.id ? "Editar caja chica" : "Nueva caja chica"}</div>
          <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cerrar</button>
        </div>

        <div style={caja}>
          <div style={titulo}>Resumen de fondos · cajas abiertas de la empresa</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, fontSize: 12 }}>
            <div style={stat}>Cajas abiertas<br /><b style={{ fontSize: 15 }}>{resumen.abiertas}</b></div>
            <div style={stat}>Asignado<br /><b style={{ fontSize: 15 }}>{money(resumen.asignado)}</b></div>
            <div style={stat}>Utilizado<br /><b style={{ fontSize: 15 }}>{money(resumen.utilizado)}</b></div>
            <div style={stat}>Resta blanco<br /><b style={{ fontSize: 15 }}>{money(resumen.restaBlanco)}</b></div>
            <div style={{ ...stat, background: "#1f2937", color: "#fde68a", borderColor: "#1f2937" }}>Resta negro<br /><b style={{ fontSize: 15 }}>{money(resumen.restaNegro)}</b></div>
          </div>
          {f.responsible.trim() && resumen.responsableCajas > 0 && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: "#b45309", fontWeight: 700 }}>
              {f.responsible} ya tiene {resumen.responsableCajas} caja(s) abierta(s) con {money(resumen.responsableResta)} sin rendir.
            </div>
          )}
        </div>

        <div style={caja}>
          <div style={titulo}>La caja</div>
          <div style={grid}>
            <label style={lbl}>Responsable
              <input style={input} list="cc-personas" value={f.responsible} onChange={(e) => set({ responsible: e.target.value })} />
            </label>
            <label style={lbl}>Tipo de caja chica
              <select style={input} value={f.tipo} onChange={(e) => set({ tipo: e.target.value })}>
                {Array.from(new Set([...tipos, f.tipo])).filter(Boolean).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Empresa
              <select style={input} value={f.company} onChange={(e) => set({ company: e.target.value, cuentaId: undefined, cuentaDevolucionId: undefined })}>
                {companyOptions.filter((c) => c.value !== "General").map((c) => (
                  <option key={c.value} value={c.value}>{c.label || c.value}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Fecha de asignación
              <input style={input} type="date" value={f.deliveredDate} onChange={(e) => set({ deliveredDate: e.target.value })} />
            </label>
            <label style={lbl}>Monto en BLANCO
              <input style={input} type="number" value={f.assignedWhite || ""} onChange={(e) => set({ assignedWhite: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Monto en NEGRO
              <input style={{ ...input, background: "#1f2937", color: "#fff" }} type="number" value={f.assignedBlack || ""} onChange={(e) => set({ assignedBlack: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Sale de la cuenta
              <select style={input} value={f.cuentaId || ""} onChange={(e) => set({ cuentaId: e.target.value || undefined })}>
                <option value="">— La por defecto —</option>
                {cuentasEmpresa.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Lo que sobre vuelve a
              <select style={input} value={f.cuentaDevolucionId || ""} onChange={(e) => set({ cuentaDevolucionId: e.target.value || undefined })}>
                <option value="">— La misma de donde salió —</option>
                {cuentasEmpresa.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ ...grid, marginTop: 8 }}>
            <label style={{ ...lbl, gridColumn: "span 2" }}>Para qué (descripción)
              <input style={input} value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </label>
            <label style={{ ...lbl, gridColumn: "span 2" }}>Notas
              <input style={input} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
            </label>
          </div>
          <div style={{ marginTop: 8, fontSize: 13 }}>Total de la caja: <b>{money(total)}</b></div>
        </div>

        <datalist id="cc-personas">
          {personas.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: faltan.length ? "#b45309" : "#166534" }}>
            {faltan.length ? `Falta: ${faltan.join(", ")}.` : "La caja no va al cash flow: van los gastos que se rindan."}
          </div>
          <button
            type="button"
            disabled={faltan.length > 0}
            onClick={() => onGuardar(f)}
            style={{ ...input, width: "auto", cursor: faltan.length ? "not-allowed" : "pointer", background: faltan.length ? "#e2e8f0" : "#0f766e", color: faltan.length ? "#64748b" : "#fff", fontWeight: 800 }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
