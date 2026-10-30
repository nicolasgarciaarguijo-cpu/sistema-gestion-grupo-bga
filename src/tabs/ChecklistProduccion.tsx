// FABRICACION · CHECKLIST ANTES DE PRODUCCION (Nicolas, 30/10/2026). Cada trabajo abierto con sus tres requisitos:
// materiales, insumos y herrajes/accesorios. Se cumplen solos con el stock (repartido entre los trabajos por fecha) o
// a mano, con la firma del que opera. Con los tres, el trabajo esta listo para lanzarse a produccion. Calculo:
// domain/checklistProduccion.ts.
import React, { useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import { ETIQUETA_RUBRO, type EstadoChecklist, type EstadoRubro, type RubroChecklist } from "../domain/checklistProduccion";

export type TrabajoChecklist = { jobId: number; nombre: string; company: string; inicio: string; estado: EstadoChecklist };

const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const PILL: Record<EstadoRubro["estado"], { texto: string; color: string; fondo: string }> = {
  stock: { texto: "✓ en stock", color: "#166534", fondo: "#dcfce7" },
  a_mano: { texto: "✓ ok a mano", color: "#1e40af", fondo: "#dbeafe" },
  no_lleva: { texto: "no lleva", color: "#475569", fondo: "#f1f5f9" },
  falta: { texto: "✗ falta", color: "#991b1b", fondo: "#fee2e2" },
  sin_detalle: { texto: "? sin detalle", color: "#92400e", fondo: "#fef3c7" },
};

export function ChecklistProduccionPanel({
  trabajos,
  companyShort,
  onMarcar,
  onIrAStock,
}: {
  trabajos: TrabajoChecklist[];
  companyShort: (c: string) => string;
  onMarcar: (jobId: number, rubro: RubroChecklist, ok: boolean, nota?: string) => void;
  onIrAStock?: () => void;
}) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const [verListos, setVerListos] = useState(false);
  const orden = [...trabajos].sort((a, b) => Number(a.estado.listo) - Number(b.estado.listo) || a.inicio.localeCompare(b.inicio));
  const listos = orden.filter((t) => t.estado.listo).length;
  const visibles = verListos ? orden : orden.filter((t) => !t.estado.listo);
  const t = trabajos.find((x) => x.jobId === abierto);

  return (
    <Panel
      span="full"
      title="Checklist antes de producción"
      actions={
        listos > 0 ? (
          <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }} onClick={() => setVerListos((v) => !v)}>
            {verListos ? "Ocultar" : "Ver"} los {listos} listos
          </button>
        ) : undefined
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Antes de lanzar un trabajo a producción tiene que tener los materiales, los insumos y los herrajes y accesorios. Cada punto se cumple solo si el stock
        alcanza (repartido entre los trabajos según cuándo lo necesita cada uno) o se da el ok a mano, que queda firmado. Click en el trabajo para ver qué falta.
      </div>
      {visibles.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>{trabajos.length ? "Todos los trabajos abiertos están listos para producción." : "No hay trabajos abiertos."}</div>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          {visibles.map((x) => (
            <div
              key={x.jobId}
              onClick={() => setAbierto(x.jobId)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 8px", border: "1px solid #e2e8f0", borderLeft: `4px solid ${x.estado.listo ? "#16a34a" : "#dc2626"}`, borderRadius: 8, cursor: "pointer", background: "#fff" }}
            >
              <div>
                <strong>{x.nombre}</strong>
                <span style={{ fontSize: 11.5, color: "#94a3b8" }}> · {companyShort(x.company)} · inicio {fecha(x.inicio)}</span>
              </div>
              <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                {x.estado.rubros.map((r) => (
                  <span key={r.rubro} title={ETIQUETA_RUBRO[r.rubro]} style={{ fontSize: 11.5, fontWeight: 700, color: PILL[r.estado].color, background: PILL[r.estado].fondo, borderRadius: 999, padding: "1px 8px" }}>
                    {ETIQUETA_RUBRO[r.rubro]}: {PILL[r.estado].texto}
                  </span>
                ))}
                <strong style={{ fontSize: 12, color: x.estado.listo ? "#166534" : "#991b1b", marginLeft: 4 }}>{x.estado.listo ? "Listo" : `${x.estado.cumplidos}/3`}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {t && (
        <div onClick={() => setAbierto(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 70, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{t.nombre}</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>
                  {companyShort(t.company)} · inicio {fecha(t.inicio)} ·{" "}
                  <strong style={{ color: t.estado.listo ? "#166534" : "#991b1b" }}>{t.estado.listo ? "Listo para producción" : `${t.estado.cumplidos} de 3 cumplidos`}</strong>
                </div>
              </div>
              <span style={{ display: "inline-flex", gap: 6 }}>
                {onIrAStock && <ButtonLike secondary onClick={onIrAStock}>Ir a Stock</ButtonLike>}
                <ButtonLike secondary onClick={() => setAbierto(null)}>✕ Cerrar</ButtonLike>
              </span>
            </div>
            {t.estado.rubros.map((r) => (
              <div key={r.rubro} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <strong>{ETIQUETA_RUBRO[r.rubro]}</strong>{" "}
                    <span style={{ fontSize: 12, fontWeight: 700, color: PILL[r.estado].color, background: PILL[r.estado].fondo, borderRadius: 999, padding: "1px 8px" }}>{PILL[r.estado].texto}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}> · {r.renglones} renglón{r.renglones === 1 ? "" : "es"} en el presupuesto</span>
                  </div>
                  {r.marca ? (
                    <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }} onClick={() => onMarcar(t.jobId, r.rubro, false)}>Quitar el ok</button>
                  ) : r.estado === "falta" || r.estado === "sin_detalle" ? (
                    <button
                      type="button"
                      style={{ fontSize: 12, border: "1px solid #1e40af", background: "#1e40af", color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => {
                        const nota = window.prompt(`Ok a mano de ${ETIQUETA_RUBRO[r.rubro].toLowerCase()} para ${t.nombre}. Nota (opcional, por ej. "llega el lunes", "lo trae el cliente"):`, "");
                        if (nota === null) return;
                        onMarcar(t.jobId, r.rubro, true, nota.trim() || undefined);
                      }}
                    >
                      Dar el ok a mano
                    </button>
                  ) : null}
                </div>
                {r.marca && (
                  <div style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    Firmó {r.marca.firmante} el {new Date(r.marca.firmadoEn).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {r.marca.nota ? ` · ${r.marca.nota}` : ""}
                  </div>
                )}
                {r.estado === "sin_detalle" && (
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>El presupuesto no tiene materiales cargados: no se puede controlar contra Stock. Dá el ok a mano cuando lo tengas.</div>
                )}
                {r.faltantes.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12.5 }}>
                    <div style={{ color: "#991b1b", fontWeight: 700, marginBottom: 2 }}>Falta según Stock:</div>
                    {r.faltantes.slice(0, 25).map((f, i) => (
                      <div key={i} style={{ color: "#475569" }}>• {f.description} — {fmt(f.missing)} {f.unit}</div>
                    ))}
                    {r.faltantes.length > 25 && <div style={{ color: "#94a3b8" }}>…y {r.faltantes.length - 25} más</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
