#!/usr/bin/env node
// COPIA DE PRUEBA del SISTEMA (21/11/2026). Copia los datos del sistema REAL al proyecto de Supabase
// "SISTEMA PRUEBA", para poder abrir la app, cargar, borrar y romper sin tocar lo real.
//
//   node scripts/copia-de-prueba.cjs clave    -> genera la clave del usuario de la copia y la guarda en .env.prueba.local
//   node scripts/copia-de-prueba.cjs copiar   -> trae los datos de produccion a la copia (pisa lo que haya en la copia)
//
// Del sistema real SOLO LEE (entra con el usuario de prueba de .env.auth.local). Nunca escribe ahi.
// No imprime claves. .env.prueba.local queda fuera de git (.env.*.local).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const raiz = path.resolve(__dirname, "..");
const leerEnv = (archivo) => {
  const p = path.join(raiz, archivo);
  const out = {};
  if (!fs.existsSync(p)) return out;
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((l) => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
  return out;
};

const PRUEBA_URL = "https://jdngrodmtzbugnephipw.supabase.co";
const PRUEBA_ANON = "sb_publishable_9Up3CN7rql65wBVuIFcVcQ_SoNFmoAv"; // clave publica (la misma que viaja en el navegador)
const PRUEBA_EMAIL = "prueba@sistema-prueba.test";
const ARCHIVO = ".env.prueba.local";

const cliente = (url, key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function clave() {
  const nueva = crypto.randomBytes(24).toString("base64url");
  const sb = cliente(PRUEBA_URL, PRUEBA_ANON);
  const { error } = await sb.rpc("tmp_fijar_clave_prueba", { p: nueva });
  if (error) throw new Error("No se pudo fijar la clave: " + error.message);
  const login = await sb.auth.signInWithPassword({ email: PRUEBA_EMAIL, password: nueva });
  if (login.error) throw new Error("La clave no quedo: " + login.error.message);
  fs.writeFileSync(
    path.join(raiz, ARCHIVO),
    [
      "# COPIA DE PRUEBA del SISTEMA (proyecto Supabase 'SISTEMA PRUEBA'). Fuera de git.",
      "# Para correr la app contra la copia: ver scripts/copia-de-prueba.cjs y el LEEME de la carpeta del sistema.",
      `REACT_APP_SUPABASE_URL=${PRUEBA_URL}`,
      `REACT_APP_SUPABASE_ANON_KEY=${PRUEBA_ANON}`,
      "REACT_APP_SUPABASE_AUTH_REDIRECT_URL=http://localhost:3100",
      `PRUEBA_EMAIL=${PRUEBA_EMAIL}`,
      `PRUEBA_PASSWORD=${nueva}`,
      "",
    ].join("\n")
  );
  console.log(`Clave generada y guardada en ${ARCHIVO}. Usuario: ${PRUEBA_EMAIL}. Login verificado.`);
}

async function copiar() {
  const prod = { ...leerEnv(".env"), ...leerEnv(".env.local"), ...leerEnv(".env.auth.local") };
  const prueba = leerEnv(ARCHIVO);
  if (!prod.REACT_APP_SUPABASE_URL || !prod.SUPABASE_TEST_ADMIN_EMAIL) throw new Error("Faltan los datos del sistema real (.env.local / .env.auth.local)");
  if (!prueba.PRUEBA_PASSWORD) throw new Error(`Falta ${ARCHIVO}: corré primero "clave"`);
  if (prod.REACT_APP_SUPABASE_URL === PRUEBA_URL) throw new Error("El origen y el destino son el mismo proyecto: no se copia nada.");

  const origen = cliente(prod.REACT_APP_SUPABASE_URL, prod.REACT_APP_SUPABASE_ANON_KEY);
  const a = await origen.auth.signInWithPassword({ email: prod.SUPABASE_TEST_ADMIN_EMAIL, password: prod.SUPABASE_TEST_ADMIN_PASSWORD });
  if (a.error) throw new Error("No pude entrar al sistema real: " + a.error.message);

  const destino = cliente(PRUEBA_URL, PRUEBA_ANON);
  const b = await destino.auth.signInWithPassword({ email: prueba.PRUEBA_EMAIL || PRUEBA_EMAIL, password: prueba.PRUEBA_PASSWORD });
  if (b.error) throw new Error("No pude entrar a la copia: " + b.error.message);
  const yo = b.data.user.id;

  // 1) los modulos (todo el sistema vive aca). Se leen de a uno: el mas grande pesa varios MB.
  const claves = await origen.from("app_state_modules_v2").select("module_key, company, saved_at");
  if (claves.error) throw new Error("Leyendo modulos: " + claves.error.message);
  const filas = claves.data.filter((r) => !/backup|staging/i.test(r.module_key));
  let ok = 0;
  let bytes = 0;
  for (const r of filas) {
    const fila = await origen.from("app_state_modules_v2").select("payload").eq("module_key", r.module_key).eq("company", r.company).single();
    if (fila.error) throw new Error(`Leyendo ${r.module_key} / ${r.company}: ${fila.error.message}`);
    bytes += JSON.stringify(fila.data.payload).length;
    const up = await destino
      .from("app_state_modules_v2")
      .upsert({ module_key: r.module_key, company: r.company, payload: fila.data.payload, saved_at: r.saved_at, updated_by: yo }, { onConflict: "module_key,company" });
    if (up.error) throw new Error(`Escribiendo ${r.module_key} / ${r.company}: ${up.error.message}`);
    ok += 1;
  }
  await origen.auth.signOut();
  await destino.auth.signOut();
  console.log(`Copiados ${ok} de ${filas.length} modulos (${(bytes / 1048576).toFixed(1)} MB) a la copia de prueba.`);
}

const modo = process.argv[2];
(modo === "clave" ? clave() : modo === "copiar" ? copiar() : Promise.reject(new Error('Uso: node scripts/copia-de-prueba.cjs clave | copiar'))).catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
