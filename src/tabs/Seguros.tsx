// Solapa Seguros: toda la informacion de los seguros de las empresas (ART, caucion, vehiculos, etc.).
//
// Cada seguro se solicita, tiene un costo mensual y una vigencia (desde/hasta), guarda su poliza
// (archivo) y muestra su estado (vigente / por vencer / vencido). El resumen por empresa suma el
// costo mensual y cuenta las vigencias. La vinculacion con el Calendario anual (que los pagos figuren
// en la planilla) es el proximo paso ("de a poco").
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
import { monthKeyLabel } from "../domain/costs";
import type { CompanyName, Seguro } from "../domain/types";

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

const VIG_COLOR: Record<string, string> = {
  vigente: "#16a34a",
  por_vencer: "#ca8a04",
  vencido: "#dc2626",
  sin_fecha: "#64748b",
};

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

  return (
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
                  <tr key={s.id} style={dadoBaja ? { opacity: 0.55 } : undefined}>
                    <td>
                      <select
                        style={styles.input}
                        value={s.company}
                        onChange={(e) => updateSeguro(s.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        list="tipos-seguro"
                        value={s.tipo}
                        placeholder="ART, Caución…"
                        onChange={(e) => updateSeguro(s.id, "tipo", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={s.descripcion}
                        placeholder="Bien asegurado / detalle"
                        onChange={(e) => updateSeguro(s.id, "descripcion", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={s.aseguradora}
                        onChange={(e) => updateSeguro(s.id, "aseguradora", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={s.numeroPoliza}
                        onChange={(e) => updateSeguro(s.id, "numeroPoliza", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ ...styles.input, textAlign: "right" }}
                        value={s.costoMensual}
                        onChange={(e) => updateSeguro(s.id, "costoMensual", Number(e.target.value || 0))}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        style={styles.input}
                        value={s.vigenciaDesde}
                        onChange={(e) => updateSeguro(s.id, "vigenciaDesde", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        style={styles.input}
                        value={s.vigenciaHasta}
                        onChange={(e) => updateSeguro(s.id, "vigenciaHasta", e.target.value)}
                      />
                      <div style={{ fontSize: 10, fontWeight: 800, color: VIG_COLOR[vig], marginTop: 1 }}>
                        {ETIQUETA_VIGENCIA[vig]}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        style={{ ...styles.input, width: 56, textAlign: "right" }}
                        value={s.diaDebito ?? 10}
                        onChange={(e) => updateSeguro(s.id, "diaDebito", Number(e.target.value || 1))}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={s.administration || "blanco"}
                        onChange={(e) => updateSeguro(s.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={s.alimentaPlanilla ?? !esArtSeguro(s.tipo)}
                        title={
                          esArtSeguro(s.tipo)
                            ? "ART: su costo ya está en la nómina. Dejalo destildado para no contarlo dos veces."
                            : "Si está tildado, genera la previsión mensual en el Calendario anual."
                        }
                        onChange={(e) => updateSeguro(s.id, "alimentaPlanilla", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={s.estado}
                        onChange={(e) => updateSeguro(s.id, "estado", e.target.value)}
                      >
                        <option value="activo">Activo</option>
                        <option value="baja">Dado de baja</option>
                      </select>
                    </td>
                    <td>
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
                    <td>
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
  );
}
