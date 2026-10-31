'use strict';

/**
 * services/dbService.js
 * Módulo de conexión robusta a SQL Server usando el paquete 'mssql'.
 * Diseñado para entornos corporativos con reintentos y pool de conexiones.
 */

const sql = require('mssql');
require('dotenv').config();

// Configuración dinámica: soporta Windows Auth y SQL Server Auth
const isTrusted = process.env.DB_TRUSTED_CONNECTION === 'true';
const isAzure = process.env.DB_SERVER?.includes('database.windows.net');

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    // Solo se incluyen user/password si NO usamos Windows Authentication
    ...(isTrusted ? {} : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    }),
    options: {
        encrypt: isAzure,                   // Requerido para Azure SQL
        trustServerCertificate: !isAzure,   // false en Azure (cert válido), true en local
        trustedConnection: isTrusted,       // Windows Authentication
        enableArithAbort: true,
        requestTimeout: 30000
    },
    connectionTimeout: 30000,
    pool: {
        max: 10,
        min: 2,                             // 2 conexiones siempre vivas → evita reconexiones en frío
        idleTimeoutMillis: 600000           // 10 min → Azure no cierra el pool entre consultas
    }
};

/**
 * Obtiene el contexto actual del inventario para alimentar a la IA.
 * Realiza consultas clave sobre stock crítico y lotes próximos a vencer.
 */
async function obtenerContextoInventario() {
    let pool;
    try {
        console.log(`[DB] Intentando conectar a SQL Server: ${config.server}...`);
        pool = await sql.connect(config);
        console.log('[DB] Conexión establecida con éxito.');
        // 1. Consultar productos con stock por debajo del mínimo
        const stockCritico = await pool.request().query(`
            SELECT TOP 10 nombre, stock_actual, stock_minimo 
            FROM productos 
            WHERE stock_actual <= stock_minimo AND estado = 1
            ORDER BY stock_actual ASC
        `);

        // 2. Consultar lotes que vencen en los próximos 60 días
        const lotesVencimiento = await pool.request().query(`
            SELECT TOP 10 L.numero_lote, P.nombre as producto, L.fecha_vencimiento
            FROM lotes_produccion L
            JOIN productos P ON L.producto_id = P.id
            WHERE L.fecha_vencimiento BETWEEN GETDATE() AND DATEADD(day, 60, GETDATE())
            ORDER BY L.fecha_vencimiento ASC
        `);

        // 3. Productos más vendidos (Top 5 Salidas en los últimos 30 días)
        const topVendidos = await pool.request().query(`
            SELECT TOP 5 P.nombre, SUM(K.cantidad) as total_salida
            FROM movimientos_kardex K
            JOIN productos P ON K.producto_id = P.id
            JOIN tipos_movimiento T ON K.tipo_movimiento_id = T.id
            WHERE T.nombre LIKE '%SALIDA%' OR T.nombre LIKE '%VENTA%'
            AND K.fecha_movimiento >= DATEADD(day, -30, GETDATE())
            GROUP BY P.nombre
            ORDER BY total_salida DESC
        `);

        // 4. Últimos 10 movimientos generales
        const ultimosMovimientos = await pool.request().query(`
            SELECT TOP 10 P.nombre, T.nombre as tipo, K.cantidad, K.fecha_movimiento, K.motivo
            FROM movimientos_kardex K
            JOIN productos P ON K.producto_id = P.id
            JOIN tipos_movimiento T ON K.tipo_movimiento_id = T.id
            ORDER BY K.fecha_movimiento DESC
        `);

        // 5. Estadísticas Generales
        const estadisticas = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM productos WHERE estado = 1) as total_productos,
                (SELECT SUM(stock_actual) FROM productos WHERE estado = 1) as stock_total,
                (SELECT COUNT(*) FROM productos WHERE stock_actual = 0 AND estado = 1) as productos_sin_stock
        `);

        // Estructurar los datos en un formato legible para el Prompt de la IA
        let contexto = "CONTEXTO COMPLETO DE INVENTARIO (Droguería EKA S.A.C.):\n";
        
        const stats = estadisticas.recordset[0];
        contexto += `\n--- RESUMEN GENERAL ---\n`;
        contexto += `- Total de productos activos: ${stats.total_productos}\n`;
        contexto += `- Stock total en almacén: ${stats.stock_total} unidades\n`;
        contexto += `- Productos sin existencias (Stock 0): ${stats.productos_sin_stock}\n`;

        contexto += "\n--- TOP PRODUCTOS MÁS DEMANDADOS (30 días) ---\n";
        if (topVendidos.recordset.length === 0) {
            contexto += "No hay datos de ventas recientes.\n";
        } else {
            topVendidos.recordset.forEach(item => {
                contexto += `- ${item.nombre}: ${item.total_salida} unidades movidas\n`;
            });
        }

        contexto += "\n--- PRODUCTOS EN STOCK CRÍTICO ---\n";
        if (stockCritico.recordset.length === 0) {
            contexto += "No hay productos en estado crítico actualmente.\n";
        } else {
            stockCritico.recordset.forEach(item => {
                contexto += `- ${item.nombre}: Stock ${item.stock_actual} (Mín: ${item.stock_minimo})\n`;
            });
        }

        contexto += "\n--- ÚLTIMOS MOVIMIENTOS ---\n";
        ultimosMovimientos.recordset.forEach(m => {
            const f = new Date(m.fecha_movimiento).toLocaleString('es-PE');
            contexto += `- [${f}] ${m.tipo}: ${m.nombre} (${m.cantidad}) - Motivo: ${m.motivo || 'N/A'}\n`;
        });

        contexto += "\n--- ALERTAS DE VENCIMIENTO PRÓXIMO ---\n";
        if (lotesVencimiento.recordset.length === 0) {
            contexto += "No hay lotes próximos a vencer en los siguientes 60 días.\n";
        } else {
            lotesVencimiento.recordset.forEach(lote => {
                const fecha = new Date(lote.fecha_vencimiento).toLocaleDateString('es-PE');
                contexto += `- Lote ${lote.numero_lote} (${lote.producto}): Vence el ${fecha}\n`;
            });
        }

        return contexto;
    } catch (err) {
        console.error('Error en dbService (obtenerContexto):', err.message);
        throw new Error('No se pudo recuperar el contexto detallado del inventario.');
    } finally {
        if (pool) await pool.close();
    }
}

module.exports = {
    obtenerContextoInventario
};
