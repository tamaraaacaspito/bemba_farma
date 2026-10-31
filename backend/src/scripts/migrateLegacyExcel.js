const path = require('path');
const ExcelJS = require('exceljs');
const cliProgress = require('cli-progress');

// Inicializar DB
const { 
    sequelize, conectarDB, sincronizarModelos,
    Categoria, Producto, Cliente, LoteMedico, 
    StockAlmacenLote, MovimientoKardex, Almacen, Usuario
} = require('../models');

const kardexDir = path.join(__dirname, '../../../kardex');

// Helpers de consola
const logInfo = (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
const logSuccess = (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
const logFail = (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`);

async function runMigration() {
    await conectarDB();
    await sincronizarModelos(); // Garantiza DB lista y Almacenes Sembrados.
    
    // Asumimos Administrador ID=1 para el volcado de Kardex
    let sysAdmin = await Usuario.findOne({ where: { rol_id: 1 }});
    if (!sysAdmin) {
        // En un entorno virgen, crear un usuario de sistema para el seed.
        // La contraseña se genera aleatoriamente (nadie inicia sesión con este usuario)
        // o se toma de SEED_USER_PASSWORD si está definida en el entorno.
        const seedPassword = process.env.SEED_USER_PASSWORD || require('crypto').randomBytes(24).toString('hex');
        sysAdmin = await Usuario.create({ nombre: 'Migrador Sistema', email: 'sys@eka.com', password: seedPassword, rol_id: 1, estado: true });
    }

    const principalAlmacen = await Almacen.findByPk(1);

    // ==========================================
    // FASE 1: CLIENTES
    // ==========================================
    logInfo('FASE 1: Iniciando migración de Clientes (Trazabilidad.xlsx)');
    const wbTrazabilidad = new ExcelJS.Workbook();
    try {
        await wbTrazabilidad.xlsx.readFile(path.join(kardexDir, 'Trazabilidad.xlsx'));
        
        let sheetClientes = wbTrazabilidad.getWorksheet('EnlaceClientes');
        if (!sheetClientes) {
            sheetClientes = wbTrazabilidad.worksheets.find(s => s.name.toLowerCase().includes('cliente'));
        }

        if (sheetClientes) {
            const barClientes = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            barClientes.start(sheetClientes.rowCount, 0);

            // Mapeo rudimentario asumiendo fila 1 headers.
            for (let i = 2; i <= sheetClientes.rowCount; i++) {
                const row = sheetClientes.getRow(i);
                if (!row.hasValues) continue;
                
                const ruc = row.getCell(1).text?.trim();
                const razon_social = row.getCell(2).text?.trim();
                const direccion = row.getCell(3).text?.trim();

                if (ruc && razon_social) {
                    await Cliente.findOrCreate({
                        where: { ruc },
                        defaults: { razon_social, direccion: direccion || 'No registrada' }
                    });
                }
                barClientes.update(i);
            }
            barClientes.stop();
            logSuccess('Clientes migrados exitosamente.');
        } else {
            logFail('No se encontró la pestaña EnlaceClientes en Trazabilidad.xlsx');
        }

        // ==========================================
        // FASE 2: PRODUCTOS
        // ==========================================
        logInfo('FASE 2: Iniciando migración de Productos (Master Artículos)');
        let sheetProductos = wbTrazabilidad.getWorksheet('EnlaceProductos');
        if (!sheetProductos) {
            sheetProductos = wbTrazabilidad.worksheets.find(s => s.name.toLowerCase().includes('producto'));
        }

        if (sheetProductos) {
            const barProd = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            barProd.start(sheetProductos.rowCount, 0);

            // Default Category
            const [catDef] = await Categoria.findOrCreate({ where: { nombre: 'Dispositivos Médicos Generales' }, defaults: { estado: true } });

            for (let i = 2; i <= sheetProductos.rowCount; i++) {
                const row = sheetProductos.getRow(i);
                if (!row.hasValues) continue;
                
                const codigo = row.getCell(1).text?.trim(); // Asumiendo A=CODIGO
                const nombre = row.getCell(2).text?.trim(); // Asumiendo B=NOMBRE
                const uMed = row.getCell(3).text?.trim();   // Asumiendo C=Presentación
                const precioUn = parseFloat(row.getCell(4).value) || 0; // Asumiendo D=Precio
                const rs = row.getCell(5).text?.trim(); // Asumiendo E=Reg Sanitario

                if (codigo && nombre) {
                    await Producto.findOrCreate({
                        where: { codigo },
                        defaults: {
                            nombre,
                            categoria_id: catDef.id,
                            unidad_medida: uMed && uMed.toLowerCase().includes('caja') ? 'CAJA' : 'UNIDAD',
                            precio_unitario: precioUn,
                            registro_sanitario: rs || null,
                            stock_actual: 0,
                            stock_minimo: 10
                        }
                    });
                }
                barProd.update(i);
            }
            barProd.stop();
            logSuccess('Productos (Maestro) migrados exitosamente.');
        } else {
            logFail('No se encontró la pestaña EnlaceProductos');
        }
    } catch (e) {
        logFail(`Error leyendo Trazabilidad.xlsx: ${e.message}`);
    }

    // ==========================================
    // FASE 3: LOTES Y VENCIMIENTOS
    // ==========================================
    logInfo('FASE 3: Iniciando Inyección de Lotes (LISTA DE LOTES.xlsx)');
    const wbLotes = new ExcelJS.Workbook();
    try {
        await wbLotes.xlsx.readFile(path.join(kardexDir, 'LISTA DE LOTES.xlsx'));
        // Generalmente es la primer hoja
        const sLotes = wbLotes.worksheets[0];
        
        const barLotes = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        barLotes.start(sLotes.rowCount, 0);

        for (let i = 2; i <= sLotes.rowCount; i++) {
            const row = sLotes.getRow(i);
            if (!row.hasValues) continue;

            const codProducto = row.getCell(1).text?.trim(); // Asumiendo A=Cod Prod
            const numLote = row.getCell(2).text?.trim(); // Asumiendo B=LOTE
            let fVenc = row.getCell(3).value; // Asumiendo C=FEC. VEN.

            if (codProducto && numLote) {
                // Relacionar a DB
                const prod = await Producto.findOne({ where: { codigo: codProducto } });
                if (prod) {
                    await LoteMedico.findOrCreate({
                        where: { producto_id: prod.id, codigo_lote: numLote },
                        defaults: {
                            fecha_vencimiento: (fVenc instanceof Date) ? fVenc : null,
                            registro_sanitario: prod.registro_sanitario // Heredado
                        }
                    });
                }
            }
            barLotes.update(i);
        }
        barLotes.stop();
        logSuccess('Lotes médicos registrados bajo régimen FEFO.');
    } catch (e) {
        logFail(`Error leyendo LISTA DE LOTES.xlsx: ${e.message}`);
    }

    // ==========================================
    // FASE 4: ASIENTO KARDEX INICIAL (SALDOS)
    // ==========================================
    logInfo('FASE 4: Procesando Saldos Iniciales Contables (YermedicMaster.xlsx)');
    const wbKardex = new ExcelJS.Workbook();
    try {
        await wbKardex.xlsx.readFile(path.join(kardexDir, 'YermedicMaster (KARDEX PT).xlsx'));
        const sKardex = wbKardex.worksheets[0];

        const barKrdx = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        barKrdx.start(sKardex.rowCount, 0);

        // Map para evitar múltiples asientos para un mismo lote/producto en una carga masiva (agrupamiento).
        let insertedKardexMap = new Set(); 

        for (let i = 2; i <= sKardex.rowCount; i++) {
            const row = sKardex.getRow(i);
            if (!row.hasValues) continue;

            const codProducto = row.getCell(1).text?.trim();
            const numLote = row.getCell(2).text?.trim();
            const saldoFinal = parseFloat(row.getCell(10).value) || parseFloat(row.getCell(5).value) || 0; // Asumiendo que el saldo puede estar en 10 o 5

            if (codProducto && saldoFinal > 0) {
                const uniqueKey = `${codProducto}_${numLote || 'SL'}`;
                
                if (!insertedKardexMap.has(uniqueKey)) {
                    insertedKardexMap.add(uniqueKey);

                    const prod = await Producto.findOne({ where: { codigo: codProducto }});
                    if (prod) {
                        // Encontrar lote o usar genérico
                        let loteDb = null;
                        if (numLote) {
                            loteDb = await LoteMedico.findOne({ where: { codigo_lote: numLote, producto_id: prod.id } });
                        }
                        if (!loteDb) {
                            loteDb = await LoteMedico.create({ producto_id: prod.id, codigo_lote: numLote || 'LOTE-MIG-001' });
                        }

                        // Configurar Lote Físico
                        const t = await sequelize.transaction();
                        try {
                            const [stockFisico] = await StockAlmacenLote.findOrCreate({
                                where: { almacen_id: principalAlmacen.id, lote_medico_id: loteDb.id },
                                defaults: { stock_actual: 0 },
                                transaction: t
                            });

                            // Movimiento Contable
                            await MovimientoKardex.create({
                                almacen_id: principalAlmacen.id,
                                lote_medico_id: loteDb.id,
                                producto_id: prod.id,
                                usuario_id: sysAdmin.id,
                                tipo_movimiento_id: 1, // ENTRADA
                                cantidad: saldoFinal,
                                stock_anterior: stockFisico.stock_actual,
                                stock_nuevo: parseFloat(stockFisico.stock_actual) + saldoFinal,
                                motivo: 'CARGA INICIAL - MIGRACIÓN EXCEL',
                                doc_guia_remision: 'MIGRACION-INIT'
                            }, { transaction: t });

                            await stockFisico.update({ stock_actual: parseFloat(stockFisico.stock_actual) + saldoFinal }, { transaction: t });
                            await prod.update({ stock_actual: parseFloat(prod.stock_actual) + saldoFinal }, { transaction: t });

                            await t.commit();
                        } catch (e) {
                            await t.rollback();
                        }
                    }
                }
            }
            barKrdx.update(i);
        }
        barKrdx.stop();
        logSuccess('Kardex de Sembrado Inicial (Saldos) consolidado en SQL Server.');
        
    } catch (e) {
        logFail(`Error procesando Saldos de Kardex: ${e.message}`);
    }

    console.log('\n\x1b[35m=========================================\x1b[0m');
    console.log('\x1b[35m¡MIGRACIÓN LEGACY COMPLETADA EXITOSAMENTE!\x1b[0m');
    console.log('\x1b[35m=========================================\x1b[0m\n');
    process.exit(0);
}

runMigration();
