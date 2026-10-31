'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Producto, LoteProduccion, MovimientoKardex, LogError, sequelize } = require('../models');

// Función principal
const procesarMigracion = async () => {
    const csvFilePath = path.resolve(__dirname, '../../../../Kardex/staging_movimientos_kardex.csv');
    
    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ Archivo CSV no encontrado en: ${csvFilePath}`);
        process.exit(1);
    }

    console.log('🔄 Sincronizando modelo LogError si no existe...');
    await LogError.sync(); // Asegurar tabla

    // Precargar datos para hacerlo inmensamente más rápido y evitar miles de SELECTs N+1.
    // Como son catálogos, caben perfectamente en memoria RAM temporal.
    console.log('📊 Cargando diccionarios a memoria RAM...');
    const productosMap = new Map();
    const lotesMap = new Map();
    
    const productosDB = await Producto.findAll({ attributes: ['id', 'codigo', 'stock_actual'] });
    productosDB.forEach(p => productosMap.set(p.codigo, { id: p.id, stock_actual: parseFloat(p.stock_actual) }));
    
    const lotesDB = await LoteProduccion.findAll({ attributes: ['id', 'numero_lote'] });
    lotesDB.forEach(l => lotesMap.set(l.numero_lote, l.id));

    const movements = [];
    
    console.log('📂 Leyendo archivo CSV...');
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
            // El CSV de staging tiene: cod_pro, lote, tipo_movimiento_id, cantidad, fecha_movimiento, motivo, etc.
            movements.push(data);
        })
        .on('end', async () => {
            console.log(`✅ CSV cargado. Total de filas: ${movements.length}. Iniciando procesamiento secuencial...`);
            
            // Ordenamos cronológicamente según dicta la regla
            movements.sort((a, b) => new Date(a.fecha_movimiento) - new Date(b.fecha_movimiento));

            let m_count = 0;
            let m_errores = 0;

            const t_base = await sequelize.transaction();

            try {
                for (let i = 0; i < movements.length; i++) {
                    const row = movements[i];
                    
                    const cod_pro = row.cod_pro ? row.cod_pro.trim() : null;
                    const num_lote = row.lote ? row.lote.trim() : null;
                    const cantidadStr = row.cantidad ? row.cantidad.toString().trim() : '0';
                    const cantidad = parseFloat(cantidadStr);
                    const tipo_mov = parseInt(row.tipo_movimiento_id, 10);
                    const fecha = row.fecha_movimiento || new Date();
                    const motivo = row.motivo || 'Migración Histórica';
                    const guia = row.numero_guia || null;
                    const ref_tipo = row.referencia_tipo || 'GUIA'; // Por default 'GUIA' o el CSV si lo trae.

                    // Validaciones de negocio dictadas por usuario
                    if (!cod_pro || !productosMap.has(cod_pro)) {
                        await LogError.create({ guia, codigo_producto: cod_pro, lote: num_lote, motivo: 'Producto inexistente' }, { transaction: t_base });
                        m_errores++;
                        continue;
                    }
                    
                    const p_mem = productosMap.get(cod_pro);

                    if (tipo_mov === 2 && !num_lote) {
                        await LogError.create({ guia, codigo_producto: cod_pro, lote: num_lote, motivo: 'Falta lote en Salida' }, { transaction: t_base });
                        m_errores++;
                        continue;
                    }

                    // En entradas asumimos que si el lote no existe, el lote_id es null (o lo rechaza, la BD deja nulo si es inventario físico tal vez)
                    const loteId = num_lote && lotesMap.has(num_lote) ? lotesMap.get(num_lote) : null;
                    if (tipo_mov === 2 && !loteId) {
                        await LogError.create({ guia, codigo_producto: cod_pro, lote: num_lote, motivo: 'Lote no hallado BD para Salida' }, { transaction: t_base });
                        m_errores++;
                        continue;
                    }

                    const stock_anterior = p_mem.stock_actual;
                    let stock_nuevo = stock_anterior;

                    // Lógica R1: Salida no puede superar stock actual en cálculo secuencial
                    if (tipo_mov === 2) {
                        if (cantidad > stock_anterior) {
                            await LogError.create({ guia, codigo_producto: cod_pro, lote: num_lote, motivo: 'Stock insuficiente' }, { transaction: t_base });
                            m_errores++;
                            continue; // Ignoramos este row para proteger la BD
                        }
                        stock_nuevo = stock_anterior - cantidad;
                    } else if (tipo_mov === 1) {
                        stock_nuevo = stock_anterior + cantidad;
                    }

                    // Insert batch en kardex
                    await MovimientoKardex.create({
                        producto_id: p_mem.id,
                        lote_id: loteId,
                        usuario_id: 1, // "Usuario Carga del Sistema" asumido como 1 (Administrador) según el plan
                        tipo_movimiento_id: tipo_mov,
                        cantidad: cantidad,
                        stock_anterior: stock_anterior,
                        stock_nuevo: stock_nuevo,
                        referencia_tipo: ref_tipo,
                        motivo: motivo,
                        fecha_movimiento: fecha
                    }, { transaction: t_base });

                    // Auto-actualizar nuestra RAM para el siguiente movimiento secuencial de este bucle!
                    p_mem.stock_actual = stock_nuevo;
                    m_count++;
                }

                // Escribir los stocks finales actualizados a la tabla de Productos al finalizar Kardex
                console.log('📝 Persistiendo cálculo final de stock en tabla Productos...');
                for (const [code, memData] of productosMap.entries()) {
                    await Producto.update(
                        { stock_actual: memData.stock_actual },
                        { where: { id: memData.id }, transaction: t_base }
                    );
                }

                await t_base.commit();
                console.log('╔══════════════════════════════════════════════════╗');
                console.log('║ ✨ MIGRACIÓN DE KARDEX CULMINADA EXITOSAMENTE ✨ ║');
                console.log('╠══════════════════════════════════════════════════╣');
                console.log(`║ 📈 Movimientos Procesados: ${m_count.toString().padEnd(21)} ║`);
                console.log(`║ 🚨 Movimientos Rechazados: ${m_errores.toString().padEnd(21)} ║`);
                console.log('╚══════════════════════════════════════════════════╝');
                process.exit(0);

            } catch (error) {
                console.error('❌ ERROR FATAL EN BUCLE. ROLLBACK ACTUANDO:', error.message);
                await t_base.rollback();
                process.exit(1);
            }
        });
};

procesarMigracion();
