const path = require('path');
const ExcelJS = require('exceljs');
const cliProgress = require('cli-progress');
const { 
    sequelize, conectarDB,
    Producto, LoteMedico, StockAlmacenLote, 
    MovimientoKardex, Almacen, Usuario
} = require('../models');

const kardexDir = path.join(__dirname, '../../../kardex');

const logInfo = (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
const logSuccess = (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
const logFail = (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`);

async function procesarKardexTotal() {
    await conectarDB();
    const principalAlmacen = await Almacen.findByPk(1);
    const admin = await Usuario.findOne({ where: { rol_id: 1 }});

    logInfo('Limpiando historial viejo de Kardex y Stocks para importar desde kardex_total.xlsx...');
    await MovimientoKardex.destroy({ where: {} });
    await StockAlmacenLote.destroy({ where: {} });
    await sequelize.query('UPDATE productos SET stock_actual = 0;');

    logInfo('Cargando kardex_total.xlsx en memoria...');
    const wb = new ExcelJS.Workbook();
    try {
        await wb.xlsx.readFile(path.join(kardexDir, 'kardex_total.xlsx'));
        const sheet = wb.worksheets[0];

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar.start(sheet.rowCount, 0);

        // Pre-cargar stock local states para no saturar DB con reads repetidos.
        const stockCache = {}; // clave: 'prodId_loteId' = stock total lote
        const globalProdStock = {}; // clave: 'prodId' = stock global

        let bulkMovimientos = [];

        for (let i = 2; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);
            if (!row.hasValues) continue;

            // [null, "LOTE", "CODIGO_PRODUCTO", "CANTIDAD", "FECHA_MOVIMIENTO", "TIPO", "CANTIDAD_REAL", "STOCK_ACUMULADO", "STOCK_NEGATIVO"]
            // Dynamic array parser for shifted cells
            const vals = row.values.map(v => (v && v.result !== undefined) ? v.result : v);
            const strVals = vals.map(v => String(v || '').trim().toUpperCase());
            
            // Encuentra dinámicamente la columna TIPO ("ENTRADA" o "SALIDA")
            let tipoIdx = strVals.findIndex(v => v !== undefined && v !== null && (v.includes('ENTRADA') || v.includes('SALIDA')));
            if (tipoIdx === -1) { bar.update(i); continue; }
            
            const tipo = strVals[tipoIdx];
            
            // Asumiendo que el Código de Producto está 3 columnas detrás del tipo si hay lote, o 2 si no hay lote.
            // Para estar seguros, el Codigo es el primer o segundo elemento numérico.
            // Pero más fácil: 
            // Si tipoIdx es 6 (1-based en excel=6), entonces Codigo es 3 (index 2).
            const prodCode = String(vals[tipoIdx - 3] || vals[tipoIdx - 2] || '').trim();
            const rawFecha = vals[tipoIdx - 1];
            const cantReal = parseFloat(vals[tipoIdx + 1]) || parseFloat(vals[tipoIdx - 2]) || 0; 
            const numLote = String(vals[1] || 'MIG-S/L').trim();

            if (!prodCode || cantReal === 0 || !tipo) {
                bar.update(i);
                continue;
            }

            // Buscar prod
            let prodInfo = await Producto.findOne({ where: { codigo: prodCode } });
            if (!prodInfo) {
                prodInfo = await Producto.create({
                    codigo: prodCode,
                    nombre: `Producto Recuperado (${prodCode})`,
                    categoria_id: 1, 
                    unidad_medida: 'UNIDAD',
                    stock_actual: 0,
                    stock_minimo: 10,
                    precio_unitario: 0
                });
            }

            // Lote
            const [loteDb] = await LoteMedico.findOrCreate({
                where: { producto_id: prodInfo.id, codigo_lote: numLote }
            });

            const tipoOp = tipo.includes('ENTRADA') ? 1 : 2; // Garantizado por el findIndex
            const cantidadModificadora = Math.abs(cantReal);
            
            // Cache keys
            const mapKey = `${prodInfo.id}_${loteDb.id}`;
            if (stockCache[mapKey] === undefined) stockCache[mapKey] = 0;
            if (globalProdStock[prodInfo.id] === undefined) globalProdStock[prodInfo.id] = 0;

            const stockAnteriorLote = stockCache[mapKey];
            let stockNuevoLote = stockAnteriorLote;

            if (tipoOp === 1) { // ENTRADA
                stockNuevoLote = stockAnteriorLote + cantidadModificadora;
                globalProdStock[prodInfo.id] += cantidadModificadora;
            } else if (tipoOp === 2) { // SALIDA
                stockNuevoLote = stockAnteriorLote - cantidadModificadora;
                globalProdStock[prodInfo.id] -= cantidadModificadora;
            }

            // Actualizar memoria RAM
            stockCache[mapKey] = stockNuevoLote;

            bulkMovimientos.push({
                almacen_id: principalAlmacen.id,
                lote_medico_id: loteDb.id,
                producto_id: prodInfo.id,
                usuario_id: admin.id,
                tipo_movimiento_id: tipoOp,
                cantidad: cantidadModificadora,
                stock_anterior: stockAnteriorLote,
                stock_nuevo: stockNuevoLote,
                motivo: `MIGRACIÓN MASIVA (${tipo})`,
                doc_guia_remision: 'KARDEX_TOTAL',
                fecha_movimiento: rawFecha instanceof Date ? rawFecha : new Date()
            });

            bar.update(i);
        }

        // Ejecutar Volcados Atómicos (Batch)
        logInfo(`\nPreparando inserción masiva de ${bulkMovimientos.length} movimientos...`);
        // Bulk Create movements (chunks of 1000)
        for (let idx = 0; idx < bulkMovimientos.length; idx += 1000) {
            await MovimientoKardex.bulkCreate(bulkMovimientos.slice(idx, idx + 1000));
        }

        logInfo('Reflejando saldos finales en Tablas Maestras Físicas...');
        for (const [key, finalStock] of Object.entries(stockCache)) {
            const [pId, lId] = key.split('_');
            const clampedStock = Math.max(0, finalStock);
            await StockAlmacenLote.findOrCreate({
                where: { almacen_id: principalAlmacen.id, lote_medico_id: lId },
                defaults: { stock_actual: clampedStock }
            }).then(([row, created]) => {
                if (!created) row.update({ stock_actual: clampedStock });
            }).catch(e => {}); // Ignorar si falla un lote específico
        }

        for (const [pId, fStock] of Object.entries(globalProdStock)) {
            await Producto.update({ stock_actual: Math.max(0, fStock) }, { where: { id: pId } });
        }

        bar.stop();
        logSuccess('Kardex Histórico Recreado Perfectamente desde kardex_total.xlsx');

    } catch (e) {
        logFail(e.message);
    }
    
    process.exit(0);
}

procesarKardexTotal();
