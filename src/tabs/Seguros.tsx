// Solapa Seguros: toda la informacion de los seguros de las empresas (ART, caucion, vehiculos, etc.).
//
// Cada seguro se solicita, tiene un costo mensual y una vigencia (desde/hasta), guarda su poliza
// (archivo) y muestra su estado (vigente / por vencer / vencido). El resumen por empresa suma el
// costo mensual y cuenta las vigencias.
//
// VINCULACION CON LA PLANILLA: cada seguro tildado en "→ Planilla" deja su PREVISION mensual en su
// renglon del Calendario anual (columna "Renglón"; si esta en automatico se deduce del tipo). La
// prevision no suma al neto: es lo que se viene. Cuando cae el debito real del banco en ese renglon,
// la prevision del mes se da por conciliada y en la planilla manda el numero real.
import { FichaRegistro, BotonFicha, type CampoFicha } from "../ui/FichaRegistro";
import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike, FileDropButton } from "../ui/primitives";
import { money } from "../lib/format";
import {
  TIPOS_SEGURO_SUGERIDOS,
  ETIQUETA_VIGENCIA,
  seguroVigencia,
  resumenSegurosPorEmpresa,
} from "../domain/seguros";
import { esArtSeguro, segurosPrevisionMensual } from "../domain/segurosCalendar";
import { CALENDAR_SECTIONS } from "../domain/calendarStructure";
import { monthKeyLabel } from "../domain/costs";
import type { CompanyName, Seguro } from "../domain/types";

import NumInput from "../ui/NumInput";
type SegurosTabProps = {
  seguros: Seguro[];
  hoyIso: string;
  months: string[]; // meses "yyyy-mm" del año fiscal, para la previsión en la planilla
  companyScope: string;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  onScopeChange: (scope: string) => void;
  addSeguro: () => void;
  removeSeguro: (id: number) => void;
  updateSeguro: (id: number, field: keyof Seguro, value: any) => void;
  onPolizaFile: (id: number, file: File | null) => void;
  onOpenPoliza: (seguro: Seguro) => void;
  polizaBusyId: number | null;
};

// Renglones de la seccion SEGUROS del Calendario anual. El seguro cae en el renglon que se elija
// aca; si no se elige ninguno, se mapea por el texto del tipo (conceptKeyForSeguro). Los que no
// coinciden con ningun tipo conocido (Berkley, Afianzadora, Amazon Prime, cauciones 2 y 3) solo
// llegan a la planilla eligiendolos a mano: sin renglon, la prevision no se dibuja en ningun lado.
const RENGLONES_SEGUROS = CALENDAR_SECTIONS.find((sec) => sec.key === "seguros")?.items || [];

const VIG_COLOR: Record<string, string> = {
  vigente: "#16a34a",
  por_vencer: "#ca8a04",
  vencido: "#dc2626",
  sin_fecha: "#64748b",
};

// 2026-11-14 (Nicolas): las filas solo MUESTRAN y la pantalla queda limpia; se corrige en la ficha.
const celda: React.CSSProperties = { fontSize: 12.5, color: "#0f172a", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const celdaNoWrap: React.CSSProperties = { ...celda, whiteSpace: "nowrap" };
const celdaDerecha: React.CSSProperties = { ...celdaNoWrap, textAlign: "right", fontWeight: 700 };
const fechaCorta = (iso?: string) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const etiqueta = (texto: string, fg = "#475569", bg = "#f1f5f9") => (
  <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>{texto}</span>
);

export function SegurosTab({
  seguros,
  hoyIso,
  months,
  companyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  onScopeChange,
  addSeguro,
  removeSeguro,
  updateSeguro,
  onPolizaFile,
  onOpenPoliza,
  polizaBusyId,
}: SegurosTabProps) {
  const companies: CompanyName[] = COMPANY_OPTIONS.map((c) => c.value);
  const resumen = resumenSegurosPorEmpresa(seguros, companies, hoyIso);
  const visibles = seguros.filter((s) => companyScope === "__ALL__" || s.company === companyScope);

  const [ficha, setFicha] = React.useState<null | { tipo: string; id: number }>(null);
  return (
    <>
      {ficha && (() => {
        const s = seguros.find((x) => x.id === ficha.id);
        if (!s) return null;
        // alimentaPlanilla ausente = lo que hace hoy el sistema (ART no, el resto si): la ficha tiene que
        // mostrar ESO tildado, igual que la fila (2026-11-14).
        const valoresDeLaFicha = { ...s, alimentaPlanilla: s.alimentaPlanilla ?? !esArtSeguro(s.tipo) };
        const campos: CampoFicha[] = [
          { key: "company", label: "Empresa (la que paga)", tipo: "empresa" },
          { key: "tipo", label: "Tipo", tipo: "texto", sugerencias: [...TIPOS_SEGURO_SUGERIDOS] },
          { key: "descripcion", label: "Bien asegurado / detalle", tipo: "texto" },
          { key: "aseguradora", label: "Aseguradora", tipo: "texto" },
          { key: "numeroPoliza", label: "N.º de póliza", tipo: "texto" },
          { key: "costoMensual", label: "Costo mensual", tipo: "numero" },
          { key: "diaDebito", label: "Día de débito", tipo: "numero" },
          { key: "vigenciaDesde", label: "Vigencia desde", tipo: "fecha" },
          { key: "vigenciaHasta", label: "Vigencia hasta", tipo: "fecha" },
          { key: "administration", label: "Blanco / negro", tipo: "select", opciones: [{ value: "blanco", label: "Blanco" }, { value: "negro", label: "Negro" }] },
          { key: "estado", label: "Estado", tipo: "select", opciones: [{ value: "activo", label: "Activo" }, { value: "baja", label: "Dado de baja" }] },
          // 2026-11-14: estaban solo en la fila. El de ART va destildado: su costo ya esta en la nomina.
          {
            key: "alimentaPlanilla",
            label: "Genera la previsión mensual en el Calendario anual",
            tipo: "check",
            ayuda: esArtSeguro(s.tipo || "")
              ? "ART: su costo ya está en la nómina. Dejalo destildado para no contarlo dos veces."
              : "Tildado: su costo mensual entra como previsión en el Calendario.",
          },
          {
            key: "conceptKey",
            label: "Renglón del Calendario donde se imputa",
            tipo: "select",
            vacio: "Automático (por tipo)",
            opciones: RENGLONES_SEGUROS.map((r) => ({ value: r.key, label: r.label })),
          },
          { key: "notas", label: "Notas", tipo: "area" },
        ];
        return (
          <FichaRegistro
            titulo={`${s.tipo || "Seguro"}${s.descripcion ? ` · ${s.descripcion}` : ""}`}
            subtitulo={[s.aseguradora, s.numeroPoliza && `póliza ${s.numeroPoliza}`].filter(Boolean).join(" · ")}
            valores={valoresDeLaFicha}
            campos={campos}
            empresas={COMPANY_OPTIONS}
            onCambiar={(k, v) => updateSeguro(s.id, k as keyof Seguro, v)}
            onCerrar={() => setFicha(null)}
            pie={s.polizaUrl ? <button type="button" onClick={() => onOpenPoliza(s)}>Ver póliza</button> : undefined}
          />
        );
      })()}
    <>
      <Panel title="Seguros — resumen" span="full">
        <div style={styles.grid2}>
          <Field label="Empresa">
            <select style={styles.input} value={companyScope} onChange={(e) => onScopeChange(e.target.value)}>
              <option value="__ALL__">Todas las empresas</option>
              {COMPANY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.short}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={styles.metricGrid}>
          {resumen
            .filter((r) => companyScope === "__ALL__" || r.company === companyScope)
            .map((r) => {
              const meta = getCompanyMeta(r.company);
              return (
                <div key={r.company} style={{ ...styles.metric, borderColor: meta.primary, background: meta.soft }}>
                  <div style={{ fontWeight: 800, color: meta.primary }}>{meta.short || r.company}</div>
                  <div style={styles.muted}>Costo mensual de seguros</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{money(r.costoMensualTotal)}</div>
                  <div style={{ ...styles.muted, fontSize: 12, marginTop: 4 }}>
                    {r.cantidad} activo(s) ·{" "}
                    <span style={{ color: VIG_COLOR.vigente, fontWeight: 700 }}>{r.vigentes} vigentes</span> ·{" "}
                    <span style={{ color: VIG_COLOR.por_vencer, fontWeight: 700 }}>{r.porVencer} por vencer</span> ·{" "}
                    <span style={{ color: VIG_COLOR.vencido, fontWeight: 700 }}>{r.vencidos} vencidos</span>
                  </div>
                </div>
              );
            })}
        </div>
        <div style={styles.sectionNote}>
          Cada seguro guarda su póliza y su vigencia. El semáforo avisa 30 días antes del vencimiento.
        </div>
      </Panel>

      <Panel title="Previsión en la planilla (Calendario anual) — año fiscal" span="full">
        {(() => {
          const previsiones = segurosPrevisionMensual(
            seguros.filter((s) => companyScope === "__ALL__" || s.company === companyScope),
            months
          );
          const porMes: Record<string, number> = {};
          months.forEach((m) => (porMes[m] = 0));
          previsiones.forEach((p) => {
            const mk = p.date.slice(0, 7);
            porMes[mk] = (porMes[mk] || 0) + p.amount;
          });
          const total = months.reduce((acc, m) => acc + (porMes[m] || 0), 0);
          if (total === 0) {
            return (
              <div style={styles.sectionNote}>
                Todavía no hay seguros que generen previsión. Cargá un seguro con costo mensual, día de
                débito y la vigencia, y tildá "→ Planilla" (la ART queda destildada: su costo ya está en
                la nómina).
              </div>
            );
          }
          return (
            <>
              <div style={styles.sectionNote}>
                Esto es lo que los seguros van a debitar mes a mes: una <strong>previsión</strong> (lo que
                se viene), no plata ya gastada. Cuando caiga el débito real del banco se concilia contra
                esto, así no se cuenta dos veces. Total del ejercicio: <strong>{money(total)}</strong>.
              </div>
              {(() => {
                // Sin renglón, la previsión no se dibuja en ningún lado de la planilla. Mejor decirlo
                // acá que dejar al usuario buscando un número que nunca va a aparecer.
                const sinRenglon = Array.from(
                  new Set(
                    previsiones
                      .filter((pv) => !pv.conceptKey)
                      .map((pv) => [pv.tipo, pv.descripcion].filter(Boolean).join(" · ") || "seguro sin detalle")
                  )
                );
                if (sinRenglon.length === 0) return null;
                return (
                  <div style={{ ...styles.sectionNote, color: "#b45309", fontWeight: 600 }}>
                    ⚠ {sinRenglon.length} seguro(s) no llegan a la planilla porque no tienen renglón:{" "}
                    {sinRenglon.join(", ")}. Elegíselo en la columna <strong>Renglón</strong> de la tabla de abajo.
                  </div>
                );
              })()}
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      {months.map((m) => (
                        <th key={m} style={{ textAlign: "right" }}>
                          {monthKeyLabel(m)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 800 }}>Previsión de seguros</td>
                      {months.map((m) => (
                        <td key={m} style={{ textAlign: "right" }}>
                          {(porMes[m] || 0) > 0 ? money(porMes[m]) : "-"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </Panel>

      <Panel
        title="Pólizas y seguros"
        span="full"
        actions={<ButtonLike onClick={addSeguro}>Agregar seguro</ButtonLike>}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Aseguradora</th>
                <th>Nº póliza</th>
                <th style={{ textAlign: "right" }}>Costo mensual</th>
                <th>Vigencia desde</th>
                <th>Vigencia hasta</th>
                <th>Día déb.</th>
                <th>Admin.</th>
                <th title="Genera la previsión mensual en el Calendario anual">→ Planilla</th>
                <th title="Renglón de la planilla donde aparece la previsión">Renglón</th>
                <th>Estado</th>
                <th>Póliza</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ color: "#64748b" }}>
                    Todavía no cargaste seguros. Agregá el primero (ART, caución, vehículo…).
                  </td>
                </tr>
              )}
              {visibles.map((s) => {
                const vig = seguroVigencia(s.vigenciaHasta, hoyIso);
                const dadoBaja = s.estado === "baja";
                return (
                  <tr
                    key={s.id}
                    style={{ ...(dadoBaja ? { opacity: 0.55 } : {}), cursor: "pointer" }}
                    onClick={() => setFicha({ tipo: "seguro", id: s.id })}
                    title="Click: abrir la ficha del seguro"
                  >
                    {/* 2026-11-14: la fila SOLO MUESTRA; todo se corrige en la ficha del seguro. */}
                    <td style={celdaNoWrap}>
                      {etiqueta(COMPANY_OPTIONS.find((c) => c.value === s.company)?.short || String(s.company))}
                      <BotonFicha onClick={() => setFicha({ tipo: "seguro", id: s.id })} />
                    </td>
                    <td style={celda}><strong>{s.tipo || "sin tipo"}</strong></td>
                    <td style={celda}>{s.descripcion || "—"}</td>
                    <td style={celda}>{s.aseguradora || "—"}</td>
                    <td style={celda}>{s.numeroPoliza || "—"}</td>
                    <td style={celdaDerecha}>{money(s.costoMensual || 0)}</td>
                    <td style={celdaNoWrap}>{fechaCorta(s.vigenciaDesde)}</td>
                    <td style={celdaNoWrap}>
                      {fechaCorta(s.vigenciaHasta)}
                      <div style={{ fontSize: 10, fontWeight: 800, color: VIG_COLOR[vig], marginTop: 1 }}>
                        {ETIQUETA_VIGENCIA[vig]}
                      </div>
                    </td>
                    <td style={celdaDerecha}>{s.diaDebito ?? 10}</td>
                    <td style={celdaNoWrap}>
                      {etiqueta(
                        (s.administration || "blanco") === "negro" ? "Negro" : "Blanco",
                        (s.administration || "blanco") === "negro" ? "#fff" : "#0f172a",
                        (s.administration || "blanco") === "negro" ? "#1f2937" : "#e2e8f0"
                      )}
                    </td>
                    <td
                      style={{ ...celdaNoWrap, textAlign: "center" }}
                      title={
                        esArtSeguro(s.tipo)
                          ? "ART: su costo ya está en la nómina, por eso no se cuenta dos veces."
                          : "Si dice sí, genera la previsión mensual en el Calendario anual."
                      }
                    >
                      {(s.alimentaPlanilla ?? !esArtSeguro(s.tipo)) ? "✓" : "—"}
                    </td>
                    <td style={celda}>
                      {s.conceptKey
                        ? RENGLONES_SEGUROS.find((r) => r.key === s.conceptKey)?.label || s.conceptKey
                        : "automático (por tipo)"}
                    </td>
                    <td style={celdaNoWrap}>
                      {etiqueta(
                        s.estado === "baja" ? "Dado de baja" : "Activo",
                        s.estado === "baja" ? "#b91c1c" : "#15803d",
                        s.estado === "baja" ? "#fee2e2" : "#dcfce7"
                      )}
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      {s.polizaUrl ? (
                        <ButtonLike onClick={() => onOpenPoliza(s)} secondary>
                          Ver póliza
                        </ButtonLike>
                      ) : (
                        <FileDropButton
                          label={polizaBusyId === s.id ? "Subiendo…" : "Subir póliza"}
                          fileName={s.polizaName}
                          accept=".pdf,image/*"
                          onFileSelected={(file) => onPolizaFile(s.id, file)}
                        />
                      )}
                      {s.polizaUrl && (
                        <ButtonLike onClick={() => updateSeguro(s.id, "polizaUrl", "")} secondary>
                          Reemplazar
                        </ButtonLike>
                      )}
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <ButtonLike onClick={() => removeSeguro(s.id)} secondary>
                        Quitar
                      </ButtonLike>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="tipos-seguro">
          {TIPOS_SEGURO_SUGERIDOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Panel>
    </>
    </>
  );
}
