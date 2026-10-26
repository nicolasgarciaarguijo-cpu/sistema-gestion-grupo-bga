// FABRICACION · CAPACIDADES DEL PERSONAL (Nicolas, 2026-10-25). "En la solapa de fabricacion debo poder ver
// dentro del listado de empleados sus capacidades" y "vamos a poder definir que puestos de trabajo se
// requieren a la hora de contratar". Arriba, cada empleado con sus categorias internas y las tareas que
// domina (las prioritarias resaltadas); abajo, cada tarea con quien la puede hacer: las que no tiene nadie,
// o una sola persona, son el puesto a cubrir. Las categorias se editan en Personal.
import React from "react";
import { Panel } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
import {
  capacidadesDelEmpleado,
  categoriaPrincipal,
  coberturaDeTareas,
  etiquetaCategoria,
  extrasDelEmpleado,
  tieneCategorias,
  type CategoriaEmpleado,
} from "../domain/categoriasEmpleado";
import type { GrupoTrabajo, TipoTarea } from "../domain/organizacionDiaria";

type EmpleadoCap = { id: number; name: string; company: string; categoriasInternas?: number[] };

const chip = (prioritaria: boolean): React.CSSProperties => ({
  fontSize: 11.5, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap",
  background: prioritaria ? "#ccfbf1" : "#f1f5f9", color: prioritaria ? "#115e59" : "#475569",
  border: `1px solid ${prioritaria ? "#99f6e4" : "#e2e8f0"}`,
});

export function CapacidadesPersonal({
  empleados,
  categorias,
  tipos,
  grupos,
  companyShort,
}: {
  empleados: EmpleadoCap[];
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  grupos: GrupoTrabajo[];
  companyShort: (company: string) => string;
}) {
  const anchosEmp = usePlanillaWidths("fabricacion.capacidades", { label: 220, col: 150, colCompact: 100 });
  const anchosCob = usePlanillaWidths("fabricacion.cobertura", { label: 260, col: 110, colCompact: 80 });
  const nombreTarea = (id: number) => tipos.find((t) => t.id === id)?.nombre || "tarea borrada";
  const activas = tipos.filter((t) => t.activa !== false);
  const cobertura = coberturaDeTareas(activas.map((t) => t.id), empleados, categorias);
  const sinCargar = empleados.filter((e) => !tieneCategorias(e.categoriasInternas));
  const grupoDe = (t?: TipoTarea) => grupos.find((g) => g.id === t?.grupoId)?.nombre || "Sin grupo";
  const sinNadie = cobertura.filter((c) => c.empleadoIds.length === 0).length;
  const unaSola = cobertura.filter((c) => c.empleadoIds.length === 1).length;

  return (
    <Panel span="full" title="Capacidades del personal">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Lo que domina cada persona según sus categorías internas (se tildan en su ficha de Personal). Resaltadas, las tareas de su categoría más alta: son las que se le dan primero.
        {sinCargar.length > 0 && <span style={{ color: "#b45309" }}> Sin categoría cargada: {sinCargar.map((e) => e.name).join(", ")} (por ahora se les puede dar cualquier tarea).</span>}
      </div>
      <div style={{ ...planillaWrap, ...anchosEmp.vars }}>
        <table className="planilla" style={planillaTable}>
          <colgroup>
            <col style={colLabel} />
            <col style={colDato} />
            <col style={colDato} />
            <col style={colFlexible} />
          </colgroup>
          <thead>
            <tr>
              <th style={thEsquina}>
                Empleado
                <PlanillaManija onMouseDown={(ev) => anchosEmp.startResize(ev, "label")} onDoubleClick={anchosEmp.resetLabel} />
              </th>
              <th style={thColumna}>
                Categoría
                <PlanillaManija onMouseDown={(ev) => anchosEmp.startResize(ev, "col")} onDoubleClick={anchosEmp.resetCol} />
              </th>
              <th style={{ ...thColumna, textAlign: "right" }}>Tareas</th>
              <th style={thFlexible}>Lo que puede hacer</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => {
              const caps = capacidadesDelEmpleado(e.categoriasInternas, categorias);
              const cp = categoriaPrincipal(e.categoriasInternas, categorias);
              const max = caps[0]?.prioridad ?? 0;
              return (
                <tr key={e.id}>
                  <td style={tdNombre}>
                    {e.name} <span style={{ fontSize: 11, color: "#94a3b8" }}>{companyShort(e.company)}</span>
                  </td>
                  <td style={{ ...tdDato, fontSize: 12, color: cp ? undefined : "#b45309" }} title={(e.categoriasInternas || []).map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean).join(", ")}>
                    {cp ? etiquetaCategoria(cp, categorias) : "sin cargar"}
                    {extrasDelEmpleado(e.categoriasInternas, categorias).map((x) => (
                      <span key={x.id} style={{ marginLeft: 4, fontSize: 10.5, color: "#7c3aed" }}>+ {x.nombre}</span>
                    ))}
                  </td>
                  <td style={{ ...tdDato, textAlign: "right" }}>{tieneCategorias(e.categoriasInternas) ? caps.length : "—"}</td>
                  <td style={tdFlexible}>
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {caps.map((x) => <span key={x.tareaId} style={chip(x.prioridad === max)}>{nombreTarea(x.tareaId)}</span>)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, margin: "14px 0 4px" }}>
        Cobertura de tareas · para contratar
      </div>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Quién puede hacer cada tarea del catálogo. {sinNadie > 0 && <strong style={{ color: "#b91c1c" }}>{sinNadie} sin nadie</strong>}
        {sinNadie > 0 && unaSola > 0 && " · "}
        {unaSola > 0 && <strong style={{ color: "#b45309" }}>{unaSola} dependen de una sola persona</strong>}
        {sinNadie === 0 && unaSola === 0 && activas.length > 0 && "Todas tienen al menos dos personas."}
      </div>
      {activas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Todavía no hay tareas en el catálogo.</div>
      ) : (
        <div style={{ ...planillaWrap, ...anchosCob.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Tarea
                  <PlanillaManija onMouseDown={(ev) => anchosCob.startResize(ev, "label")} onDoubleClick={anchosCob.resetLabel} />
                </th>
                <th style={thColumna}>
                  Grupo
                  <PlanillaManija onMouseDown={(ev) => anchosCob.startResize(ev, "col")} onDoubleClick={anchosCob.resetCol} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>Personas</th>
                <th style={thFlexible}>Quiénes</th>
              </tr>
            </thead>
            <tbody>
              {[...cobertura]
                .sort((a, b) => a.empleadoIds.length - b.empleadoIds.length || nombreTarea(a.tareaId).localeCompare(nombreTarea(b.tareaId)))
                .map((c) => {
                  const n = c.empleadoIds.length;
                  const color = n === 0 ? "#b91c1c" : n === 1 ? "#b45309" : undefined;
                  return (
                    <tr key={c.tareaId}>
                      <td style={tdNombre}>{nombreTarea(c.tareaId)}</td>
                      <td style={{ ...tdDato, fontSize: 12 }}>{grupoDe(tipos.find((t) => t.id === c.tareaId))}</td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color }}>{n}</td>
                      <td style={{ ...tdFlexible, fontSize: 12, color: n ? undefined : "#b91c1c" }}>
                        {n ? c.empleadoIds.map((id) => empleados.find((e) => e.id === id)?.name).filter(Boolean).join(", ") : "Nadie: puesto a cubrir"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
