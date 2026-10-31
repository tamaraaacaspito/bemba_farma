/**
 * ============================================================================
 * SEED: seed_stock_inicial.js
 * PROYECTO: Sistema de Gestión de Inventarios — Droguería EKA S.A.C.
 * TESIS SENATI 2026 — Deniss Figueroa · Tamara Solano
 * ----------------------------------------------------------------------------
 * UBICACIÓN: D:\TAMARA\drogueria-eka\backend\seed_stock_inicial.js
 *            (al lado de server.js y seed_admin.js)
 *
 * ARCHIVOS FUENTE (poner en la misma carpeta backend\):
 *   - Trazabilidad_-_EnlaceLotes.csv
 *   - Lista_de_lotes_fabricados__.xls
 *
 * INSTALAR DEPENDENCIAS ANTES DE CORRER:
 *   cd D:\TAMARA\drogueria-eka\backend
 *   npm install xlsx csv-parse
 *
 * USO:
 *   node seed_stock_inicial.js --dry-run   <- solo preview, NO toca BD
 *   node seed_stock_inicial.js             <- ejecuta el seed real
 *
 * ESQUEMA DE BD REAL (init.sql de EKA):
 *   productos          -> codigo, nombre, categoria_id, stock_actual, unidad_medida
 *   lotes_produccion   -> producto_id, numero_lote, cantidad_producida,
 *                         fecha_produccion, estado_id, registrado_por
 *   movimientos_kardex -> producto_id, usuario_id, tipo_movimiento_id,
 *                         cantidad, stock_anterior, stock_nuevo,
 *                         lote_id, motivo, referencia_tipo, fecha_movimiento
 * ============================================================================
 */

"use strict";

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { parse } = require("csv-parse/sync");

// ---------------------------------------------------------------------------
// AJUSTA ESTA LINEA si tu carpeta de modelos se llama diferente.
// Mira en D:\TAMARA\drogueria-eka\backend\ y busca la carpeta con index.js
// Opciones comunes: "./models"  o  "./src/models"
// ---------------------------------------------------------------------------
const db = require("./src/models");

const PATH_CSV = path.join(__dirname, "Trazabilidad - EnlaceLotes.csv");
const PATH_XLS = path.join(__dirname, "Lista de lotes fabricados.xlsx");

const DRY_RUN = process.argv.includes("--dry-run");
const ADMIN_USER_ID = 1;    // Ya existe gracias a seed_admin.js
const CATEGORIA_DEFAULT = 1;    // ID de "Equipos de Infusion" en tu tabla categorias
const HOY = new Date();

// ─── Logger ─────────────────────────────────────────────────────────────────
const log = {
  info: (...a) => console.log("  [OK]", ...a),
  warn: (...a) => console.log("  [!!]", ...a),
  error: (...a) => console.log("  [XX]", ...a),
  title: (t) => console.log("\n" + "=".repeat(56) + "\n  >> " + t + "\n" + "=".repeat(56)),
};

// =============================================================================
// PASO 1 - LEER CSV DE TRAZABILIDAD
// =============================================================================
function leerCSV() {
  log.title("PASO 1 - Leyendo CSV de Trazabilidad");

  if (!fs.existsSync(PATH_CSV))
    throw new Error("Archivo no encontrado: " + PATH_CSV);

  const filas = parse(fs.readFileSync(PATH_CSV, "utf-8"), {
    columns: true, skip_empty_lines: true, trim: true,
  });

  const catalogoProductos = new Map(); // codPro -> { codPro, nombre, abreviatura }
  const mapLoteACodPro = new Map(); // loteNum (int) -> codPro
  let ignoradas = 0;

  for (const f of filas) {
    const codPro = String(f["COD-PRO"] || "").trim();
    const nombre = String(f["PRODUCTO"] || "").trim();
    const abrev = String(f["ABREV."] || "").trim();
    const lote = parseInt(f["LOTE"], 10);

    if (!codPro || isNaN(lote)) { ignoradas++; continue; }

    if (!catalogoProductos.has(codPro))
      catalogoProductos.set(codPro, { codPro, nombre, abreviatura: abrev });

    mapLoteACodPro.set(lote, codPro);
  }

  log.info("Filas leidas: " + filas.length + " | Ignoradas: " + ignoradas);
  log.info("Productos unicos: " + catalogoProductos.size);
  log.info("Lotes vinculados: " + mapLoteACodPro.size);

  return { catalogoProductos, mapLoteACodPro };
}

// =============================================================================
// PASO 2 - LEER XLS DE LOTES FABRICADOS
// =============================================================================
function leerXLS() {
  log.title("PASO 2 - Leyendo XLS de Lotes Fabricados");

  if (!fs.existsSync(PATH_XLS))
    throw new Error("Archivo no encontrado: " + PATH_XLS);

  const wb = XLSX.readFile(PATH_XLS, { cellDates: true });

  const HOJAS = [
    "Lot 2011", "Lot 2012", "Lot 2013", "Lote 2014", "Lot 2015", "Lot 2016",
    "Lot 2017", "Lot 2018 Orig", "Lot 2019", "Lot 2020", "Lot 2021",
    "Lot 2022", "Lot 2023", "Lot 2024", "Lot 2025", "Lot 2026",
  ];

  const mapLotes = new Map();

  for (const hoja of HOJAS) {
    if (!wb.Sheets[hoja]) continue;
    const anio = parseInt(hoja.match(/(\d{4})/)[1], 10);
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null });

    for (const fila of filas) {
      // Buscar numero de lote (exactamente 7 digitos) en la fila
      let idx = -1;
      for (let i = 0; i < fila.length; i++) {
        if (/^\d{7}$/.test(String(fila[i] || "").trim())) { idx = i; break; }
      }
      if (idx === -1) continue;

      const loteNum = parseInt(fila[idx], 10);
      if (mapLotes.has(loteNum)) continue; // ya procesado

      // Vencimiento: celda siguiente al lote, formato "MM-YYYY"
      const venc = parsearVencimiento(String(fila[idx + 1] || "").trim());
      if (!venc) continue;

      // Cantidad: celda idx+2
      const cantRaw = fila[idx + 2];
      const cant = (cantRaw !== null && !isNaN(Number(cantRaw)))
        ? Math.round(Number(cantRaw)) : 0;

      // Fecha aprobacion: primera Date real despues de cant
      let fechaAprob = null;
      for (let j = idx + 3; j < Math.min(idx + 10, fila.length); j++) {
        if (fila[j] instanceof Date && !isNaN(fila[j])) { fechaAprob = fila[j]; break; }
      }

      // Anulado: si alguna celda contiene "ANULADO"
      const anulado = fila.some(v => v && String(v).toUpperCase().includes("ANULADO"));

      mapLotes.set(loteNum, {
        loteNum, vencimiento: venc, cantidadFabricada: cant,
        fechaAprobacion: fechaAprob, anulado, anio
      });
    }
  }

  log.info("Lotes unicos leidos del XLS: " + mapLotes.size);
  return mapLotes;
}

function parsearVencimiento(raw) {
  if (!raw || raw === "---" || raw === "nan") return null;
  const partes = raw.split("-");
  if (partes.length !== 2) return null;
  const m = parseInt(partes[0], 10);
  const y = parseInt(partes[1], 10);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) return null;
  return new Date(y, m - 1, 28);
}

// =============================================================================
// PASO 3 - CRUZAR Y FILTRAR LOTES VIGENTES
// =============================================================================
function construirDataset(catalogoProductos, mapLoteACodPro, mapLotesXLS) {
  log.title("PASO 3 - Cruzando fuentes y filtrando lotes vigentes");

  const lotesValidos = [];
  let anulados = 0, vencidos = 0, sinMatch = 0;

  for (const [loteNum, info] of mapLotesXLS) {
    const codPro = mapLoteACodPro.get(loteNum);
    if (!codPro) { sinMatch++; continue; }
    if (info.anulado) { anulados++; continue; }
    if (info.vencimiento <= HOY) { vencidos++; continue; }

    lotesValidos.push({
      loteNum,
      codPro,
      vencimiento: info.vencimiento,
      cantidadFabricada: info.cantidadFabricada,
      fechaAprobacion: info.fechaAprobacion,
      anio: info.anio,
    });
  }

  const stockPorCodigo = new Map();
  for (const l of lotesValidos)
    stockPorCodigo.set(l.codPro, (stockPorCodigo.get(l.codPro) ?? 0) + l.cantidadFabricada);

  log.info("Lotes vigentes para seed: " + lotesValidos.length);
  log.warn("Sin match en CSV:         " + sinMatch);
  log.warn("Anulados ignorados:        " + anulados);
  log.warn("Vencidos ignorados:        " + vencidos);

  return { lotesValidos, stockPorCodigo };
}

// =============================================================================
// PASO 4 - PREVIEW
// =============================================================================
function imprimirPreview(catalogoProductos, lotesValidos, stockPorCodigo) {
  log.title("PREVIEW - Dataset que se cargara en la BD");
  console.log("\n  Productos a insertar/actualizar : " + catalogoProductos.size);
  console.log("  Lotes a insertar                : " + lotesValidos.length);
  console.log("  Movimientos SALDO_INICIAL       : " + lotesValidos.length + "\n");

  const top = Array.from(stockPorCodigo.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([cod, stock]) => ({
      "COD-PRO": cod,
      "Lotes": lotesValidos.filter(l => l.codPro === cod).length,
      "Stock inicial": stock.toLocaleString("es-PE"),
    }));

  console.log("  Top 15 productos por stock inicial:");
  console.table(top);

  const total = Array.from(stockPorCodigo.values()).reduce((s, v) => s + v, 0);
  console.log("  STOCK GLOBAL TOTAL: " + total.toLocaleString("es-PE") + " unidades\n");
}

// =============================================================================
// PASO 5 - SEED EN BD (TRANSACCION ACID UNICA)
// =============================================================================
async function ejecutarSeed(catalogoProductos, lotesValidos, stockPorCodigo) {
  log.title("PASO 5 - Ejecutando seed en BD");

  const { sequelize } = db;

  // Obtener IDs de catalogos que ya existen por init.sql
  const tipoMov = await db.TipoMovimiento.findOne({ where: { nombre: "ENTRADA" } });
  if (!tipoMov) throw new Error(
    "No se encontro tipo_movimiento 'ENTRADA'. Ejecuta init.sql primero."
  );

  const estadoLote = await db.EstadoLote.findOne({ where: { nombre: "COMPLETADO" } });
  if (!estadoLote) throw new Error(
    "No se encontro estado_lote 'COMPLETADO'. Ejecuta init.sql primero."
  );

  const stats = {
    productosCreados: 0, productosActualiz: 0,
    lotesCreados: 0, lotesExistentes: 0,
    movCreados: 0, movOmitidos: 0,
    errores: [],
  };

  const t = await sequelize.transaction();

  try {

    // -- 5a: Upsert Productos ------------------------------------------------
    log.info("5a - Insertando/actualizando productos...");

    for (const [codPro, info] of catalogoProductos) {
      const stockTotal = stockPorCodigo.get(codPro) ?? 0;

      const [prod, creado] = await db.Producto.findOrCreate({
        where: { codigo: codPro },
        defaults: {
          codigo: codPro,
          nombre: formatearNombre(info.nombre),
          categoria_id: CATEGORIA_DEFAULT,
          unidad_medida: "UNIDAD",
          stock_actual: stockTotal,
          stock_minimo: 10,
          precio_unitario: null,  // R1: precio variable, no se fija estaticamente
          estado: 1,
        },
        transaction: t,
      });

      if (!creado) {
        await prod.update({ stock_actual: stockTotal }, { transaction: t });
        stats.productosActualiz++;
      } else {
        stats.productosCreados++;
      }
    }

    log.info("   Creados: " + stats.productosCreados + " | Actualizados: " + stats.productosActualiz);

    // -- 5b + 5c: Lotes + Movimientos ----------------------------------------
    log.info("5b/5c - Insertando lotes y movimientos SALDO_INICIAL...");

    for (const loteData of lotesValidos) {
      try {
        const producto = await db.Producto.findOne({
          where: { codigo: loteData.codPro },
          transaction: t,
        });
        if (!producto) {
          stats.errores.push("Producto no encontrado en BD: " + loteData.codPro);
          continue;
        }

        // Upsert lotes_produccion
        const [lote, loteCreado] = await db.LoteProduccion.findOrCreate({
          where: { numero_lote: String(loteData.loteNum) },
          defaults: {
            producto_id: producto.id,
            numero_lote: String(loteData.loteNum),
            cantidad_producida: loteData.cantidadFabricada,
            fecha_produccion: loteData.fechaAprobacion ?? new Date(loteData.anio + "-01-01"),
            estado_id: estadoLote.id,
            registrado_por: ADMIN_USER_ID,
          },
          transaction: t,
        });

        if (loteCreado) stats.lotesCreados++;
        else stats.lotesExistentes++;

        // Idempotencia: no duplicar movimiento si ya existe
        const movExistente = await db.MovimientoKardex.findOne({
          where: { lote_id: lote.id, motivo: "SALDO_INICIAL" },
          transaction: t,
        });
        if (movExistente) { stats.movOmitidos++; continue; }

        // Crear movimiento de saldo inicial
        await db.MovimientoKardex.create({
          producto_id: producto.id,
          usuario_id: ADMIN_USER_ID,
          tipo_movimiento_id: tipoMov.id,
          cantidad: loteData.cantidadFabricada,
          stock_anterior: 0,
          stock_nuevo: loteData.cantidadFabricada,
          referencia_tipo: "SALDO_INICIAL",
          referencia_id: null,
          lote_id: lote.id,
          motivo: "SALDO_INICIAL",
          fecha_movimiento: new Date(),
        }, { transaction: t });

        stats.movCreados++;

      } catch (errFila) {
        // Error en un lote individual -> registrar y continuar sin cancelar todo
        stats.errores.push("Lote " + loteData.loteNum + ": " + errFila.message);
      }
    }

    await t.commit();
    log.info("COMMIT exitoso.");

  } catch (errGlobal) {
    await t.rollback();
    log.error("ROLLBACK completo por error global.");
    throw errGlobal;
  }

  return stats;
}

function formatearNombre(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// =============================================================================
// REPORTE FINAL
// =============================================================================
function imprimirReporte(stats, lotesValidos, stockPorCodigo) {
  log.title("REPORTE FINAL");
  console.log([
    "",
    "  Productos creados     : " + stats.productosCreados,
    "  Productos actualizados: " + stats.productosActualiz,
    "  Lotes creados         : " + stats.lotesCreados,
    "  Lotes ya existentes   : " + stats.lotesExistentes,
    "  Movimientos creados   : " + stats.movCreados,
    "  Movimientos omitidos  : " + stats.movOmitidos,
    "  Errores por fila      : " + stats.errores.length,
    "",
  ].join("\n"));

  if (stats.errores.length > 0) {
    console.log("  Lotes con error (no insertados):");
    stats.errores.slice(0, 20).forEach(e => console.log("    - " + e));
    if (stats.errores.length > 20)
      console.log("    ... y " + (stats.errores.length - 20) + " mas.");
  }

  const total = Array.from(stockPorCodigo.values()).reduce((s, v) => s + v, 0);
  console.log("  STOCK GLOBAL TOTAL      : " + total.toLocaleString("es-PE") + " unidades");
  console.log("  Lotes vigentes cargados : " + lotesValidos.length + "\n");
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("\n" + "=".repeat(56));
  console.log("  MASTER SEED - DROGUERIA EKA S.A.C.");
  console.log("  Tesis SENATI 2026 . Figueroa . Solano");
  if (DRY_RUN) console.log("  *** DRY-RUN: la BD NO sera modificada ***");
  console.log("=".repeat(56));

  const { catalogoProductos, mapLoteACodPro } = leerCSV();
  const mapLotesXLS = leerXLS();
  const { lotesValidos, stockPorCodigo } = construirDataset(
    catalogoProductos, mapLoteACodPro, mapLotesXLS
  );

  imprimirPreview(catalogoProductos, lotesValidos, stockPorCodigo);

  if (DRY_RUN) {
    console.log("  Dry-run completo. Ejecuta sin --dry-run para confirmar.\n");
    process.exit(0);
  }

  console.log("  Presiona ENTER para confirmar, Ctrl+C para cancelar...");
  await new Promise(res => process.stdin.once("data", res));
  process.stdin.destroy();

  let stats;
  try {
    stats = await ejecutarSeed(catalogoProductos, lotesValidos, stockPorCodigo);
  } catch (err) {
    log.error("El seed fallo: " + err.message);
    console.error(err);
    process.exit(1);
  }

  imprimirReporte(stats, lotesValidos, stockPorCodigo);

  await db.sequelize.close();
  console.log("  Conexion cerrada. OK\n");
  process.exit(0);
}

main().catch(err => {
  log.error("Error fatal: " + err.message);
  console.error(err);
  process.exit(1);
});
