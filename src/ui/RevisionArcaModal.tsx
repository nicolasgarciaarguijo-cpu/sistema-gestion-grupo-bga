// REVISION DEL LISTADO DE ARCA (Nicolas, 2026-10-31): sugiere, no carga. Cada comprobante viene con lo que
// el sistema propone (ya cargada / proveedor reconocido y donde va / proveedor nuevo) y nada se guarda hasta
// confirmar. Con nombres parecidos hay que elegir a mano si es un proveedor existente o uno nuevo, para no
// duplicar proveedores ni facturas. Ver domain/arcaRevision.ts.
import React, { useState } from "react";
import { faltaDecidir, type RenglonRevision, type ProveedorR } from "../domain/arcaRevision";
import { Z_FICHA, ddmm } from "./VinculoUi";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "top" };

export function RevisionArcaModal({
  renglones: iniciales,
  proveedores,
  companyShort,
  money,
  onConfirmar,
  onCerrar,
}: {
  renglones: RenglonRevision[];
  proveedores: ProveedorR[];
  companyShort: (c: string) => string;
  money: (n: number) => string;
  onConfirmar: (r: RenglonRevision[]) => void;
  onCerrar: () => void;
}) {
  const [renglones, setRenglones] = useState(iniciales);
  const [filtro, setFiltro] = useState<"todos" | "decidir" | "nuevas" | "duplicadas">("todos");
  const set = (key: string, patch: Partial<RenglonRevision>) => setRenglones((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const sinDecidir = renglones.filter(faltaDecidir);
  const aCargar = renglones.filter((r) => r.cargar);
  const duplicadas = renglones.filter((r) => r.duplicadaDe);
  const visibles = renglones.filter((r) =>
    filtro === "todos" ? true : filtro === "decidir" ? faltaDecidir(r) || (r.proveedor?.estado === "nuevo" && !r.duplicadaDe) : filtro === "nuevas" ? !r.duplicadaDe : !!r.duplicadaDe
  );
  const activos = proveedores.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: Z_FICHA, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(1180px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Listado de ARCA · revisar antes de cargar</div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            El sistema sugiere, no carga solo. Las ya cargadas vienen destildadas (se marcan «✓ ARCA» en la factura existente). Si el proveedor es nuevo pero hay uno parecido, elegí si es el mismo o uno nuevo: así no se duplican proveedores ni facturas.
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12.5 }}>
          {(
            [
              ["todos", `Todos (${renglones.length})`],
              ["decidir", `Para decidir (${renglones.filter((r) => r.proveedor?.estado === "nuevo" && !r.duplicadaDe).length})`],
              ["nuevas", `Nuevas (${renglones.length - duplicadas.length})`],
              ["duplicadas", `Ya cargadas (${duplicadas.length})`],
            ] as const
          ).map(([k, t]) => (
            <button key={k} type="button" onClick={() => setFiltro(k)} style={{ border: `2px solid ${filtro === k ? "#0f172a" : "#e2e8f0"}`, background: "#fff", borderRadius: 8, padding: "4px 9px", cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Cargar</th>
                <th style={th}>Empresa</th>
                <th style={th}>Fecha</th>
                <th style={th}>Comprobante</th>
                <th style={th}>Emisor / receptor</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={th}>Sugerencia del sistema</th>
                <th style={th}>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => {
                const pend = faltaDecidir(r);
                return (
                  <tr key={r.key} style={{ background: r.duplicadaDe ? "#f8fafc" : pend ? "#fef2f2" : undefined, color: r.duplicadaDe && !r.cargar ? "#64748b" : undefined }}>
                    <td style={td}>
                      <input type="checkbox" checked={r.cargar} disabled={!!r.duplicadaDe} title={r.duplicadaDe ? "Ya está cargada: no se duplica" : ""} onChange={(e) => set(r.key, { cargar: e.target.checked })} />
                    </td>
                    <td style={td}>{companyShort(r.company)}</td>
                    <td style={td}>{ddmm(r.fecha)}</td>
                    <td style={td}>
                      {r.tipo} {r.numero}
                      <div style={{ fontSize: 11, color: "#64748b" }}>{r.direccion === "emitidas" ? "emitida" : r.esNotaCredito ? "nota de crédito recibida" : "recibida"}</div>
                    </td>
                    <td style={td}>
                      {r.contraparte}
                      <div style={{ fontSize: 11, color: "#64748b" }}>{r.cuit}</div>
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{money(r.total)}</td>
                    <td style={td}>
                      {r.duplicadaDe ? (
                        <span style={{ color: "#166534", fontWeight: 700 }}>ya cargada: {r.duplicadaDe.texto}</span>
                      ) : (
                        <span style={{ color: r.proveedor?.estado === "nuevo" ? "#b45309" : "#1d4ed8" }}>{r.sugerencia || "nueva"}</span>
                      )}
                    </td>
                    <td style={td}>
                      {r.direccion === "recibidas" && !r.esNotaCredito && !r.duplicadaDe ? (
                        <select
                          value={r.accionProveedor.tipo === "existente" ? String(r.accionProveedor.proveedorId) : r.accionProveedor.tipo}
                          onChange={(e) => {
                            const v = e.target.value;
                            set(r.key, { accionProveedor: v === "alta" ? { tipo: "alta" } : v === "ninguno" ? { tipo: "ninguno" } : { tipo: "existente", proveedorId: Number(v) }, cargar: v === "ninguno" ? r.cargar : true });
                          }}
                          style={{ padding: "3px 6px", border: `1px solid ${pend ? "#f87171" : "#cbd5e1"}`, borderRadius: 6, fontSize: 12.5, maxWidth: 230 }}
                        >
                          <option value="ninguno">— Elegí —</option>
                          <option value="alta">+ Proveedor nuevo: {r.contraparte}</option>
                          {r.proveedor?.estado === "nuevo" && r.proveedor.parecidos.length > 0 && (
                            <optgroup label="Parecidos (¿es el mismo?)">
                              {r.proveedor.parecidos.map((p) => (
                                <option key={`p${p.id}`} value={p.id}>
                                  {p.name} {p.taxId ? `· ${p.taxId}` : "· sin CUIT"}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="Todos los proveedores">
                            {activos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12.5, color: sinDecidir.length ? "#b91c1c" : "#475569", fontWeight: 700 }}>
            {sinDecidir.length ? `Falta elegir el proveedor de ${sinDecidir.length} factura(s) tildada(s).` : `Se van a cargar ${aCargar.length} comprobante(s). ${duplicadas.length} ya estaban cargados.`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCerrar} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
              Cancelar (no se carga nada)
            </button>
            <button
              type="button"
              disabled={sinDecidir.length > 0}
              onClick={() => onConfirmar(renglones)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: sinDecidir.length ? "#94a3b8" : "#0f172a", color: "#fff", fontWeight: 700, cursor: sinDecidir.length ? "default" : "pointer" }}
            >
              Confirmar y cargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
