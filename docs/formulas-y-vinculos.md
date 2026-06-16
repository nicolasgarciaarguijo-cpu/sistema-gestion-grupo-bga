# Fórmulas y vínculos entre solapas — Especificación confirmada

Documento de trabajo acordado con Nicolás. Resume cómo deben funcionar las
fórmulas que conectan las solapas del Sistema de Gestión Grupo BGA y los cambios
a implementar. Sirve como guía de implementación y como referencia.

Estado: revisión de las 7 fórmulas completada. Fecha base: 2026-06.

---

## Fórmula 1 — Precio del presupuesto

Orden de cálculo (confirmado correcto):

1. Costo directo = materiales + insumos básicos + mano de obra.
2. + Costos fijos aplicados = costos fijos × (% ocupación de horas, o % manual).
3. + Desvío = (materiales + insumos + mano de obra) × desvío%. Da el **Costo total**.
   - El desvío deja afuera los costos fijos. Correcto.
4. + Markup = costo total × markup%. Da el **Neto antes de descuentos**.
5. + Incrementos (cada uno como % de ese neto).
6. − Descuentos (montos fijos en $). Da el **Precio NETO**.
7. **Precio FINAL** = Neto × (1 + IVA%). Comisión = Neto × comisión% (informativa).

Decisión de negocio confirmada:

- Costos fijos prorrateados por % de ocupación de horas. Correcto.
- **IVA editable por trabajo** (existen alícuotas distintas a 21%, p. ej. 10,5%).

A corregir (pendiente): el campo `vatPct` ya es editable en el presupuesto
principal, pero quedan 3 lugares forzados a 21% que lo ignoran y darían subtotales
mal con otra alícuota: subtotales por sección (línea ~1144), parte del cálculo
blanco/negro (línea ~3648) y un valor por defecto (línea ~5863). Unificar para que
el IVA editable mande en todos lados.

---

## Fórmula 2 — Presupuesto aprobado → facturación, anticipo y saldo

Al aprobar, toda la administración pasa a ser **en bruto** (con IVA). El sistema
calcula sobre el **precio final con IVA**:

- Anticipo (cobranza) = precio final × % anticipo.
- Saldo (cobranza) = precio final − (anticipo + cobranzas ya cargadas).
- Factura (facturación) = precio final × % facturación (en blanco).

Confirmado: anticipo y saldo sobre el final con IVA. Lo no facturado = en negro.

Cambios a implementar:

1. **% de anticipo = campo numérico propio**, en vez de interpretarlo del texto de
   la forma de pago (causa actual de errores).
2. **% de facturación editable sobre la marcha**; la factura se recalcula sola.
3. **Pagos intermedios / cuotas**: poder agregar, editar y borrar cobranzas sobre
   la marcha; el saldo se recalcula como total − (anticipo + cobranzas cargadas).
4. La regeneración automática **no debe pisar** los ítems ni pagos manuales (bug
   actual: el efecto que regenera por `sourceJobId` borra ediciones manuales).

---

## Fórmula 3 — Marcadores → presupuesto (HECHO: bug corregido)

Los marcadores son plantillas de costo (costos fijos, insumos, mano de obra) y son
la **fuente de verdad permanente**: lo editado en la solapa Marcadores queda fijo,
sin importar lo que se toque a mano en un presupuesto puntual.

Corregido (commit en rama `codex/save-reliability`): cambiar empresa o tipo de
trabajo **ya no rearma ni borra** las filas cargadas a mano. Los marcadores se
aplican solo con los botones "Aplicar al presupuesto actual" y "Restaurar desde
marcadores".

Pendiente (feature): bloque en la solapa Marcadores para elegir si los marcadores
son **compartidos** entre ambas empresas (default; hoy ambas usan los mismos costos)
o **separados por empresa** según la empresa que emite el presupuesto.

---

## Fórmula 4 — Cash flow: doble circuito blanco / negro

Confirmado: el resultado operativo se divide en **dos cuentas independientes**,
nunca mezcladas.

- **Resultado blanco** y **resultado negro** son dos valores separados.
- Ingresos negros: no tienen facturación; salen solo de lo **cobrado en negro
  declarado**. Si una cobranza no se declara como negra, el sistema la trata como
  **blanca con factura pendiente** y lo **avisa**.
- Egresos / compras: cada compra declara el **origen del dinero**: efectivo blanco,
  efectivo negro o **banco (siempre blanco)**.
- **Desfasaje**: si se paga algo blanco con plata negra (o al revés), el sistema lo
  registra y avisa, llevando un saldo acumulado de cuánta plata negra entró al
  circuito blanco y viceversa, para compensar en la próxima compra o al cierre del
  ejercicio contable.

A corregir: el doble conteo actual (resta compras y además débitos del banco).
Requiere modelar un doble libro mayor con seguimiento de cruces. Diseñar antes de
implementar.

---

## Fórmula 5 — Stock ↔ materiales y compras

Ahora:

- Ligar cada material del presupuesto al ítem de stock por **referencia estable
  (código/ID)** capturada al seleccionarlo, manteniendo la **búsqueda rápida por
  nombre**. El cálculo de faltantes debe cruzar por código y no por descripción de
  texto (hoy cruza por nombre en línea ~3999 y rompe el vínculo ante diferencias).

Futuro (no urgente, falta contar el stock real):

- Stock con **movimientos**: las compras suman, la fabricación descuenta (siempre
  **previa confirmación** al usuario), queda saldo real.
- Importar **remito de proveedor** (PDF/JPG/PNG) con OCR para ubicar y cargar stock
  automáticamente. Ya existen `pdf.js`, `Tesseract` y estructuras `RemitoDraft`.
- Stock **separado por empresa** (activo de cada una), con opción de reasignar.

---

## Fórmula 6 — CRM de clientes como entidad real

Convertir el CRM de vista derivada (hoy se arma agrupando presupuestos por nombre)
a una **tabla de clientes como fuente de verdad**:

1. Permitir **alta de cliente / prospecto** de antemano, además de la creación
   automática desde presupuestos.
2. **Identificador estable** (p. ej. CUIT). En el campo cliente del presupuesto,
   **typeahead** que muestra los clientes existentes para seleccionar y evitar
   duplicados por nombre escrito distinto.
3. **Ficha de cliente editable** (CUIT, contacto, mail, notas) que **autocompleta**
   los próximos presupuestos.

Conecta con la normalización `company/company_id` pendiente en RLS y con la futura
vinculación de mails.

---

## Fórmula 7 — Costo real del trabajador y escala salarial

Vínculo a crear: hoy el valor hora de la mano de obra del presupuesto se carga a
mano y no toma el valor de la escala salarial (que sí se usa para liquidar sueldos).

Decisiones:

1. **Escala con fallback**: si falta el mes en curso, usar el **último mes cargado**
   (hoy toma 0 y rompe el cálculo), **avisar** que está desactualizada y permitir
   **actualizar por un %** provisorio hasta cargar la escala nueva.
2. **Básico vs no remunerativo**: en presupuestación se usa un **valor general**
   (VHT total); en Personal se mantienen **diferenciados** para liquidar bien.
3. **Valor hora trabajada** (costo real): hoy ya incluye sueldo bruto (remunerativo
   + no remunerativo), contribuciones patronales, ART, provisiones (EPP/insumos) y
   aguinaldo con sus cargas. Cambios:
   - Renombrar la categoría de provisiones a **"EPP, Insumos y Exámenes médicos y
     capacitaciones"**.
   - Agregar **premios / atenciones por desempeño** cargables, con **origen
     blanco/negro** para que impacten en la administración correcta (liga con F4).
   - Calcular el valor hora sobre **horas productivas** (descontando feriados y
     vacaciones). Recordatorio del sistema: cuántos feriados hay en el mes y qué
     empleados están de vacaciones.
   - Ausentismo promedio: no se incluye por ahora (se descuenta del sueldo).
   - Nota técnica: las alícuotas de aportes del empleado (11% / 3% / 3%) están
     hardcodeadas (líneas ~8672-8674); conviene volverlas configurables.

---

## Problemas transversales a corregir

- **IDs por `Date.now()`**: usar identificadores únicos (UUID) para evitar colisiones
  cuando dos usuarios crean registros a la vez. Afecta presupuestos, trabajos
  aprobados, ítems financieros, marcadores y más.
- **Sincronización en tiempo real**: el merge por módulo reemplaza arrays completos
  y puede perder cambios locales no sincronizados. Mejorar a un merge por ítem.
- **Estética / legibilidad**: estilos casi todos inline (≈203) con grises de bajo
  contraste y texto blanco en algunos fondos claros. Unificar una paleta con
  contraste consistente para que todo se lea bien.
