// ACCESO · LISTADOS DEL SISTEMA (Nicolas, 31/10/2026): todos los listados en un lugar, para sumar, renombrar, reordenar,
// pausar y borrar sin depender del codigo. Ver domain/listasSistema.ts.
import React, { useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import {
  LISTAS,
  agregar,
  cambiar,
  esFijo,
  listaVigente,
  mover,
  quitar,
  renombrar,
  type Edicion,
  type ItemLista,
  type ListaKey,
  type ListasSistema,
} from "../domain/listasSistema";

const th: React.CSSProperties = { padding: "4px 6px", textAlign: "left", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "3px 6px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, width: "100%", boxSizing: "border-box" };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 12, cursor: "pointer" };

export function ListadosSistema({
  listas,
  usos,
  onGuardar,
  onRenombrar,
}: {
  listas: ListasSistema;
  // Cuantos registros usan cada nombre (para no borrar lo que esta en uso).
  usos: Partial<Record<ListaKey, Record<string, number>>>;
  onGuardar: (key: ListaKey, lista: ItemLista[]) => void;
  // Al renombrar, App pasa el nombre nuevo a los registros que usaban el viejo.
  onRenombrar: (key: ListaKey, viejo: string, nuevo: string, lista: ItemLista[]) => void;
}) {
  const [key, setKey] = useState<ListaKey>(LISTAS[0].key);
  const [editando, setEditando] = useState<{ nombre: string; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", codigo: "" });
  const [aviso, setAviso] = useState("");
  const def = LISTAS.find((l) => l.key === key)!;
  const lista = listaVigente(listas, key);
  const usoDe = (nombre: string) => usos[key]?.[nombre] || 0;
  const aplicar = (r: Edicion, despues?: (l: ItemLista[]) => void) => {
    if (r.ok === false) return setAviso(r.motivo);
    setAviso("");
    (despues || ((l: ItemLista[]) => onGuardar(key, l)))(r.lista);
  };
  const confirmarRenombre = () => {
    if (!editando) return;
    const { nombre, texto } = editando;
    setEditando(null);
    if (texto.trim() === nombre) return;
    aplicar(renombrar(key, lista, nombre, texto), (l) => onRenombrar(key, nombre, texto.trim(), l));
  };

  return (
    <Panel span="full" title="Listados del sistema">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Los listados que usa el sistema, para editarlos acá sin depender de nadie: sumar, renombrar (el nombre nuevo pasa a todo lo que usaba el viejo),
        ordenar, pausar (deja de ofrecerse pero lo cargado queda) y borrar (solo lo que no está en uso).
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {LISTAS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => { setKey(l.key); setEditando(null); setAviso(""); }}
            style={{ ...btn, padding: "4px 10px", fontSize: 13, fontWeight: l.key === key ? 700 : 400, background: l.key === key ? "#ecfeff" : "#fff", borderColor: l.key === key ? "#0f766e" : "#cbd5e1" }}
          >
            {l.titulo} ({listaVigente(listas, l.key).length})
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 6 }}>{def.descripcion}</div>
      {aviso && <div style={{ fontSize: 12.5, color: "#b91c1c", marginBottom: 6 }}>⚠ {aviso}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Nombre</th>
            {def.conCodigo && <th style={th}>Prefijo del código</th>}
            <th style={{ ...th, textAlign: "right" }}>En uso</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((it, i) => {
            const fijo = esFijo(key, it.nombre);
            const pausado = it.activo === false;
            const enEdicion = editando?.nombre === it.nombre;
            return (
              <tr key={it.nombre} style={{ opacity: pausado ? 0.5 : 1 }}>
                <td style={td}>
                  {enEdicion ? (
                    <input
                      autoFocus
                      style={input}
                      value={editando!.texto}
                      onChange={(e) => setEditando({ nombre: it.nombre, texto: e.target.value })}
                      onBlur={confirmarRenombre}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmarRenombre(); if (e.key === "Escape") setEditando(null); }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => !fijo && setEditando({ nombre: it.nombre, texto: it.nombre })}
                      title={fijo ? "Lo usan las cuentas del sistema: no se renombra ni se borra" : "Doble click para renombrar"}
                      style={{ cursor: fijo ? "default" : "text" }}
                    >
                      {it.nombre}{fijo && <span style={{ fontSize: 11, color: "#7c3aed", marginLeft: 6 }}>del sistema</span>}{pausado && <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>(pausado)</span>}
                    </span>
                  )}
                </td>
                {def.conCodigo && (
                  <td style={{ ...td, width: 110 }}>
                    <input style={{ ...input, textTransform: "uppercase" }} value={it.codigo || ""} placeholder="auto" onChange={(e) => onGuardar(key, cambiar(lista, it.nombre, { codigo: e.target.value.toUpperCase() || undefined }))} />
                  </td>
                )}
                <td style={{ ...td, textAlign: "right", color: usoDe(it.nombre) ? "#0f172a" : "#94a3b8" }}>{usoDe(it.nombre)}</td>
                <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                  <button type="button" style={btn} disabled={i === 0} onClick={() => onGuardar(key, mover(lista, it.nombre, -1))} title="Subir">↑</button>{" "}
                  <button type="button" style={btn} disabled={i === lista.length - 1} onClick={() => onGuardar(key, mover(lista, it.nombre, 1))} title="Bajar">↓</button>{" "}
                  {!fijo && <button type="button" style={btn} onClick={() => setEditando({ nombre: it.nombre, texto: it.nombre })}>Renombrar</button>}{" "}
                  {!fijo && <button type="button" style={btn} onClick={() => onGuardar(key, cambiar(lista, it.nombre, { activo: pausado ? undefined : false }))}>{pausado ? "Reanudar" : "Pausar"}</button>}{" "}
                  {!fijo && (
                    <button
                      type="button"
                      style={{ ...btn, color: "#b91c1c" }}
                      onClick={() => {
                        const r = quitar(key, lista, it.nombre, usoDe(it.nombre));
                        if (r.ok && !window.confirm(`¿Borrar "${it.nombre}" de ${def.titulo}?`)) return;
                        aplicar(r);
                      }}
                    >
                      🗑
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 280 }} placeholder={`Nuevo en ${def.titulo.toLowerCase()}`} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        {def.conCodigo && <input style={{ ...input, maxWidth: 110, textTransform: "uppercase" }} placeholder="Prefijo" value={nuevo.codigo} onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })} />}
        <ButtonLike
          disabled={!nuevo.nombre.trim()}
          onClick={() => {
            const r = agregar(lista, nuevo.nombre, nuevo.codigo);
            aplicar(r);
            if (r.ok) setNuevo({ nombre: "", codigo: "" });
          }}
        >
          + Agregar
        </ButtonLike>
      </div>
    </Panel>
  );
}
