#!/usr/bin/env node
// Levanta el sistema en esta maquina (http://localhost:3100) contra la COPIA DE PRUEBA, nunca contra el real.
// Lee .env.prueba.local (lo arma scripts/copia-de-prueba.cjs) y le gana a .env.local, que apunta a produccion.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const raiz = path.resolve(__dirname, "..");
const PRUEBA_URL = "https://jdngrodmtzbugnephipw.supabase.co";
const archivo = path.join(raiz, ".env.prueba.local");
if (!fs.existsSync(archivo)) {
  console.error('Falta .env.prueba.local: corré "node scripts/copia-de-prueba.cjs clave"');
  process.exit(1);
}
const env = { ...process.env };
fs.readFileSync(archivo, "utf8").split(/\r?\n/).forEach((l) => {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
  if (m && m[1].startsWith("REACT_APP_")) env[m[1]] = m[2];
});
// Candado: si por lo que sea no quedo apuntando a la copia, no arranca.
if (env.REACT_APP_SUPABASE_URL !== PRUEBA_URL) {
  console.error("La configuracion no apunta a la copia de prueba: no arranco.");
  process.exit(1);
}
env.PORT = "3100";
env.BROWSER = "none";
console.log("SISTEMA contra la COPIA DE PRUEBA:", PRUEBA_URL);
const hijo = spawn(process.execPath, [path.join(raiz, "node_modules", "react-scripts", "bin", "react-scripts.js"), "start"], { cwd: raiz, env, stdio: "inherit" });
hijo.on("exit", (c) => process.exit(c == null ? 0 : c));
