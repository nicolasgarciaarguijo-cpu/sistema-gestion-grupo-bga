// FABRICACION · CONVERTIDOR DE MATERIALES (Nicolas, 30/10/2026). El tipo de mueble o trabajo dice cuanto material lleva en
// su unidad (m² de placa, m² laqueados) y el articulo de Stock se vende en otra (una placa, un litro). Tres tablas que se
// calibran a mano: equivalencias ("1 placa = 4,5 m²"), como se compra (exacto si es de compra intensiva, si no para arriba
// con minimo: laca de color 3 L) y lo que acompaña (catalizador = la mitad de la laca). Logica: domain/tiposMueble.ts.
import React, { useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import { planillaTable, thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, inputCelda, inputCeldaDerecha, focoCelda } from "../ui/planilla";
import { textoCompra, textoEquivalencia, type Acompanante, type ConvertidorMateriales, type Equivalencia, type ItemStockParaMateriales, type ReglaCompra } from "../domain/tiposMueble";

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(1180px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const sub: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 6 };
const nota: React.CSSProperties = { fontSize: 12, color: "#64748b" };
const selectCelda: React.CSSProperties = { ...inputCelda, cursor: "pointer" };
const quitar: React.CSSProperties = { border: "none", background: "none", color: "#b91c1c", cursor: "pointer" };
const ok: React.CSSProperties = { ...tdDato, color: "#166534", fontWeight: 700, whiteSpace: "nowrap" };

type AQuien = { material?: string; grupo?: string; articuloId?: number; contiene?: string };

// A quien se aplica una regla, en palabras.
function aQuienTexto(r: AQuien, stock: ItemStockParaMateriales[]): string {
  const art = r.articuloId != null ? stock.find((x) => x.id === r.articuloId)?.description || "artículo borrado" : "";
  return [r.material, r.grupo, r.contiene ? `que diga "${r.contiene}"` : "", art].filter(Boolean).join(" · ") || "(sin definir)";
}

// BLOQUE "EQUIVALENCIAS Y CRITERIOS" en Fabricacion (Nicolas, 30/10/2026: "lo importante es tener el bloque equivalencias y ahi
// las vamos dejando asentadas"). Se leen de un vistazo; se editan en la ventana.
export function EquivalenciasYCriterios({
  convertidor,
  stock,
  onGuardar,
  nuevoId,
}: {
  convertidor: ConvertidorMateriales;
  stock: ItemStockParaMateriales[];
  onGuardar: (c: ConvertidorMateriales) => void;
  nuevoId: () => number;
}) {
  const fila = (clave: string, aQuien: string, regla: string, nota?: string) => (
    <tr key={clave}>
      <td style={tdNombre}>{aQuien}</td>
      <td style={ok}>{regla}</td>
      <td style={{ ...tdDato, color: "#64748b" }}>{nota || ""}</td>
    </tr>
  );
  const bloque = (titulo: string, filas: React.ReactNode[]) => (
    <>
      <div style={sub}>{titulo}</div>
      {filas.length ? (
        <table className="planilla" style={planillaTable}>
          <thead>
            <tr>
              <th style={thEsquina}>A qué se aplica</th>
              <th style={thColumna}>Regla</th>
              <th style={thFlexible}>Criterio</th>
            </tr>
          </thead>
          <tbody>{filas}</tbody>
        </table>
      ) : (
        <div style={nota}>Todavía no hay.</div>
      )}
    </>
  );
  return (
    <Panel span="full" title="Equivalencias y criterios" actions={<ConvertidorBoton convertidor={convertidor} stock={stock} onGuardar={onGuardar} nuevoId={nuevoId} etiqueta="✎ Editar" />}>
      <div style={nota}>
        Cómo se pasa lo que dice cada tipo de mueble o trabajo a lo que se compra: las equivalencias de unidades, cómo se compra cada material y lo que se
        suma solo. Acá quedan asentados los criterios; se usan al pasar los materiales de los muebles al presupuesto.
      </div>
      {bloque("Equivalencias de unidades", convertidor.equivalencias.map((e) => fila(`e${e.id}`, aQuienTexto(e, stock), e.valor > 0 ? textoEquivalencia(e) : "falta el valor", e.nota)))}
      {bloque("Cómo se compra", convertidor.compras.map((r) => fila(`c${r.id}`, aQuienTexto(r, stock), textoCompra(r), r.nota)))}
      {bloque(
        "Lo que acompaña",
        convertidor.acompanantes.map((a) => fila(`a${a.id}`, a.material || "(sin definir)", `suma ${a.agrega || "?"}: ${Number(a.proporcion).toLocaleString("es-AR")} ${a.unidad} por cada 1 que se usa`, a.nota))
      )}
      <div style={{ ...nota, marginTop: 6 }}>Lo que no tiene regla de compra se redondea para arriba de a 1. Siempre se puede corregir la cantidad a mano en el presupuesto.</div>
    </Panel>
  );
}

export function ConvertidorBoton({
  convertidor,
  stock,
  onGuardar,
  nuevoId,
  etiqueta = "⇄ Convertidor de materiales",
}: {
  convertidor: ConvertidorMateriales;
  stock: ItemStockParaMateriales[];
  onGuardar: (c: ConvertidorMateriales) => void;
  nuevoId: () => number;
  etiqueta?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const grupos = Array.from(new Set(stock.map((x) => x.group || "").filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const { equivalencias, compras, acompanantes } = convertidor;
  const setEq = (id: number, c: Partial<Equivalencia>) => onGuardar({ ...convertidor, equivalencias: equivalencias.map((e) => (e.id === id ? { ...e, ...c } : e)) });
  const setCo = (id: number, c: Partial<ReglaCompra>) => onGuardar({ ...convertidor, compras: compras.map((e) => (e.id === id ? { ...e, ...c } : e)) });
  const setAc = (id: number, c: Partial<Acompanante>) => onGuardar({ ...convertidor, acompanantes: acompanantes.map((e) => (e.id === id ? { ...e, ...c } : e)) });
  const numero = (v: string) => (v === "" ? undefined : Math.max(0, Number(v) || 0));

  // Las cuatro columnas de "a quien se aplica", iguales en equivalencias y compras.
  const celdasAQuien = (r: AQuien, set: (c: Partial<AQuien>) => void) => (
    <>
      <td style={tdNombre}>
        <input style={inputCelda} value={r.material || ""} placeholder="(cualquiera)" onChange={(ev) => set({ material: ev.target.value || undefined })} {...focoCelda} />
      </td>
      <td style={tdDato}>
        <select style={selectCelda} value={r.grupo || ""} onChange={(ev) => set({ grupo: ev.target.value || undefined, articuloId: undefined })}>
          <option value="">(cualquiera)</option>
          {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </td>
      <td style={tdDato}>
        <input style={inputCelda} value={r.contiene || ""} placeholder="ej. laca color" title="Palabras que tiene que tener la descripción del artículo (todas)" onChange={(ev) => set({ contiene: ev.target.value || undefined })} {...focoCelda} />
      </td>
      <td style={tdDato}>
        <select style={selectCelda} value={r.articuloId ?? ""} onChange={(ev) => set({ articuloId: ev.target.value ? Number(ev.target.value) : undefined })}>
          <option value="">(todos)</option>
          {stock.filter((x) => !r.grupo || x.group === r.grupo).map((x) => <option key={x.id} value={x.id}>{x.description}</option>)}
        </select>
      </td>
    </>
  );
  const thAQuien = (
    <>
      <th style={thEsquina}>Material (genérico)</th>
      <th style={thColumna}>Grupo de Stock</th>
      <th style={thColumna}>El artículo dice</th>
      <th style={thColumna}>Artículo puntual</th>
    </>
  );

  return (
    <>
      <ButtonLike secondary onClick={() => setAbierta(true)}>{etiqueta}</ButtonLike>
      {abierta && (
        <div style={overlay} onClick={() => setAbierta(false)}>
          <div style={caja} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Equivalencias y criterios</div>
              <ButtonLike secondary onClick={() => setAbierta(false)}>✕ Cerrar</ButtonLike>
            </div>
            <div style={nota}>
              Pasa lo que dice el tipo de mueble o trabajo (en su unidad) a lo que se compra del artículo de Stock. En cada tabla vale la regla más puntual:
              la de un artículo, después la del material, después la que filtra por lo que dice el artículo, después la del grupo de Stock.
            </div>

            <div style={sub}>1 · Equivalencias de unidades</div>
            <div style={nota}>Si el artículo va en la misma unidad que el material, no se convierte.</div>
            <table className="planilla" style={planillaTable}>
              <thead>
                <tr>
                  {thAQuien}
                  <th style={thColumna}>Unidad del material</th>
                  <th style={thColumna}>Cómo se cuenta</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Valor</th>
                  <th style={thColumna}>Unidad del artículo</th>
                  <th style={thColumna}>Queda</th>
                  <th style={thColumna}>Criterio</th>
                  <th style={thFlexible} />
                </tr>
              </thead>
              <tbody>
                {equivalencias.map((e) => (
                  <tr key={e.id}>
                    {celdasAQuien(e, (c) => setEq(e.id, c))}
                    <td style={tdDato}>
                      <input style={inputCelda} value={e.unidadMaterial} onChange={(ev) => setEq(e.id, { unidadMaterial: ev.target.value })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <select style={selectCelda} value={e.modo} onChange={(ev) => setEq(e.id, { modo: ev.target.value as Equivalencia["modo"] })}>
                        <option value="contiene">1 artículo contiene…</option>
                        <option value="consume">cada 1 del material usa…</option>
                      </select>
                    </td>
                    <td style={tdDato}>
                      <input style={inputCeldaDerecha} type="number" min={0} step={0.01} value={e.valor} onChange={(ev) => setEq(e.id, { valor: Number(ev.target.value) || 0 })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCelda} value={e.unidadArticulo} onChange={(ev) => setEq(e.id, { unidadArticulo: ev.target.value })} {...focoCelda} />
                    </td>
                    <td style={e.valor > 0 ? ok : { ...ok, color: "#b91c1c" }}>{e.valor > 0 ? textoEquivalencia(e) : "falta el valor"}</td>
                    <td style={tdDato}>
                      <input style={{ ...inputCelda, minWidth: 220 }} value={e.nota || ""} placeholder="por qué" onChange={(ev) => setEq(e.id, { nota: ev.target.value || undefined })} {...focoCelda} />
                    </td>
                    <td style={tdFlexible}>
                      <button type="button" style={quitar} title="Sacar" onClick={() => onGuardar({ ...convertidor, equivalencias: equivalencias.filter((x) => x.id !== e.id) })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <ButtonLike secondary onClick={() => onGuardar({ ...convertidor, equivalencias: [...equivalencias, { id: nuevoId(), unidadMaterial: "m2", unidadArticulo: "u", modo: "contiene", valor: 1 }] })}>+ Equivalencia</ButtonLike>
            </div>

            <div style={sub}>2 · Cómo se compra</div>
            <div style={nota}>
              Compra intensiva (placas blancas, MDF: siempre se compran y siempre hay): va el valor exacto con su desperdicio. El resto se redondea para arriba,
              con un mínimo si lo tiene (laca de color: 3 L; pasados los 3 L, de a 1). Lo que no tiene regla se redondea para arriba de a 1.
            </div>
            <table className="planilla" style={planillaTable}>
              <thead>
                <tr>
                  {thAQuien}
                  <th style={thColumna}>Compra intensiva</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Mínimo</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>De a</th>
                  <th style={thColumna}>Queda</th>
                  <th style={thColumna}>Criterio</th>
                  <th style={thFlexible} />
                </tr>
              </thead>
              <tbody>
                {compras.map((r) => (
                  <tr key={r.id}>
                    {celdasAQuien(r, (c) => setCo(r.id, c))}
                    <td style={{ ...tdDato, textAlign: "center" }}>
                      <input type="checkbox" checked={!!r.intensiva} onChange={(ev) => setCo(r.id, { intensiva: ev.target.checked || undefined })} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCeldaDerecha} type="number" min={0} step={0.5} disabled={!!r.intensiva} value={r.minimo ?? ""} placeholder="—" onChange={(ev) => setCo(r.id, { minimo: numero(ev.target.value) })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCeldaDerecha} type="number" min={0} step={0.5} disabled={!!r.intensiva} value={r.multiplo ?? ""} placeholder="1" onChange={(ev) => setCo(r.id, { multiplo: numero(ev.target.value) })} {...focoCelda} />
                    </td>
                    <td style={ok}>{textoCompra(r)}</td>
                    <td style={tdDato}>
                      <input style={{ ...inputCelda, minWidth: 220 }} value={r.nota || ""} placeholder="por qué" onChange={(ev) => setCo(r.id, { nota: ev.target.value || undefined })} {...focoCelda} />
                    </td>
                    <td style={tdFlexible}>
                      <button type="button" style={quitar} title="Sacar" onClick={() => onGuardar({ ...convertidor, compras: compras.filter((x) => x.id !== r.id) })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <ButtonLike secondary onClick={() => onGuardar({ ...convertidor, compras: [...compras, { id: nuevoId(), intensiva: true }] })}>+ Regla de compra</ButtonLike>
            </div>

            <div style={sub}>3 · Lo que acompaña</div>
            <div style={nota}>
              Un material que se suma solo, en proporción a lo que se USA de otro (antes de redondear). El catalizador es uno para todos los colores: se suma
              el de todas las lacas del presupuesto y después se redondea con su regla de compra.
            </div>
            <table className="planilla" style={planillaTable}>
              <thead>
                <tr>
                  <th style={thEsquina}>Cuando lleva</th>
                  <th style={thColumna}>Suma</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Proporción</th>
                  <th style={thColumna}>Unidad</th>
                  <th style={thColumna}>Grupo de Stock</th>
                  <th style={thColumna}>Artículo sugerido</th>
                  <th style={thColumna}>Criterio</th>
                  <th style={thFlexible} />
                </tr>
              </thead>
              <tbody>
                {acompanantes.map((a) => (
                  <tr key={a.id}>
                    <td style={tdNombre}>
                      <input style={inputCelda} value={a.material} placeholder="ej. Laca" onChange={(ev) => setAc(a.id, { material: ev.target.value })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCelda} value={a.agrega} placeholder="ej. Catalizador" onChange={(ev) => setAc(a.id, { agrega: ev.target.value })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCeldaDerecha} type="number" min={0} step={0.05} value={a.proporcion} onChange={(ev) => setAc(a.id, { proporcion: Number(ev.target.value) || 0 })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <input style={inputCelda} value={a.unidad} onChange={(ev) => setAc(a.id, { unidad: ev.target.value })} {...focoCelda} />
                    </td>
                    <td style={tdDato}>
                      <select style={selectCelda} value={a.grupo || ""} onChange={(ev) => setAc(a.id, { grupo: ev.target.value || undefined, articuloId: undefined })}>
                        <option value="">(cualquiera)</option>
                        {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td style={tdDato}>
                      <select style={selectCelda} value={a.articuloId ?? ""} onChange={(ev) => setAc(a.id, { articuloId: ev.target.value ? Number(ev.target.value) : undefined })}>
                        <option value="">(se elige al presupuestar)</option>
                        {stock.filter((x) => !a.grupo || x.group === a.grupo).map((x) => <option key={x.id} value={x.id}>{x.description}</option>)}
                      </select>
                    </td>
                    <td style={tdDato}>
                      <input style={{ ...inputCelda, minWidth: 220 }} value={a.nota || ""} placeholder="por qué" onChange={(ev) => setAc(a.id, { nota: ev.target.value || undefined })} {...focoCelda} />
                    </td>
                    <td style={tdFlexible}>
                      <button type="button" style={quitar} title="Sacar" onClick={() => onGuardar({ ...convertidor, acompanantes: acompanantes.filter((x) => x.id !== a.id) })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <ButtonLike secondary onClick={() => onGuardar({ ...convertidor, acompanantes: [...acompanantes, { id: nuevoId(), material: "", agrega: "", unidad: "L", proporcion: 0.5 }] })}>+ Material que acompaña</ButtonLike>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
