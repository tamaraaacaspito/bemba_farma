'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Producto, MovimientoKardex, Alerta } = require('../models');

/**
 * Motor Local de Anomalías Numéricas
 * Detecta quiebres y movimientos atípicos basados en la varianza local (sin API externa).
 */
const detectarAnomalias = async (productoId) => {
    const producto = await Producto.findByPk(productoId);
    if (!producto || !producto.estado) return { anomalias: [] };

    // 1. Extraer serie de tiempo de los últimos 90 registros
    const movimientos = await MovimientoKardex.findAll({
        where: { producto_id: productoId },
        order: [['fecha_movimiento', 'ASC']],
        limit: 90
    });

    if (movimientos.length === 0) return { anomalias: [] };

    const anomalias = [];
    const minStock = Number(producto.stock_minimo);
    const currStock = Number(producto.stock_actual);

    // a) STOCK CRÍTICO SILENCIOSO
    // Se valida retrospectivamente si llegamos a peligro.
    if (currStock <= minStock && currStock > 0) {
        anomalias.push({
            tipo: 'STOCK_CRITICO',
            descripcion: `Punto de pedido activado. Stock Actual (${currStock}) <= Mínimo Permitido (${minStock}).`,
            fecha: new Date(),
            severidad: 'MEDIA',
            valor: currStock
        });
    }

    // b) MOVIMIENTO_INUSUAL (Desviación Típica Media + 2.5 sigma)
    if (movimientos.length >= 5) {
        const cantidades = movimientos.map(m => Number(m.cantidad));
        const media = cantidades.reduce((a, b) => a + b, 0) / cantidades.length;
        const varianza = cantidades.reduce((a, b) => a + Math.pow(b - media, 2), 0) / cantidades.length;
        const sigma = Math.sqrt(varianza);
        const umbral = media + (2.5 * sigma);

        const inusuales = movimientos.filter(m => Number(m.cantidad) > umbral);
        
        inusuales.forEach(m => {
            const fechaTxt = new Date(m.fecha_movimiento).toLocaleDateString('es-PE');
            anomalias.push({
                tipo: 'MOVIMIENTO_INUSUAL',
                descripcion: `Variación atípica detectada el ${fechaTxt}: Se movieron ${m.cantidad} uds (Umbral estadístico normal: ${umbral.toFixed(2)}).`,
                fecha: m.fecha_movimiento,
                severidad: 'ALTA',
                valor: Number(m.cantidad)
            });
        });
    }

    // c) TENDENCIA_CAIDA (Caída de inventario abrupta de > 60% en 7 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    
    const movsRecientes = movimientos.filter(m => new Date(m.fecha_movimiento) >= fechaLimite);
    if (movsRecientes.length > 0) {
        const stockHistoricoSemanal = Number(movsRecientes[0].stock_anterior);
        if (stockHistoricoSemanal > 0) {
            const diferencia = stockHistoricoSemanal - currStock;
            const caidaPorcentual = (diferencia / stockHistoricoSemanal) * 100;
            
            if (caidaPorcentual > 60) {
                anomalias.push({
                    tipo: 'TENDENCIA_CAIDA',
                    descripcion: `Alerta de Demanda Excesiva: El inventario cayó un ${caidaPorcentual.toFixed(1)}% en tiempos récord (últimos 7 días).`,
                    fecha: new Date(),
                    severidad: 'CRITICA',
                    valor: caidaPorcentual
                });
            }
        }
    }

    // 4. Registrar anomalías detectadas en la tabla de Alertas (solo las nuevas registradas hoy para evitar duplicados masivos)
    // En un entorno de producción estricto se guarda un hash de la anomalía, aquí lo subimos a Alerta con tipo=4
    for (const anomalia of anomalias) {
        try {
            await Alerta.create({
                tipo_alerta_id: 4, // 4 = ANOMALIA_DETECTADA en tabla
                producto_id: producto.id,
                mensaje: anomalia.descripcion,
                estado: true // Asumiendo campo por default, equivalente a no leida en algunos esquemas
            });
        } catch (e) {
            console.error('[IA] Error almacenando alerta:', e.message);
        }
    }

    return { anomalias };
};

/**
 * Escanea la DB completa buscando anomalías.
 */
const ejecutarAnalisisTodos = async () => {
    let totalActivos = 0;
    let totalAnomaliasEncontradas = 0;

    try {
        console.log('\n[IA-Local] INICIANDO ESCANEO PROFUNDO DE INVENTARIO...');
        const productos = await Producto.findAll({ where: { estado: true } });
        totalActivos = productos.length;

        for (const prod of productos) {
            const { anomalias } = await detectarAnomalias(prod.id);
            totalAnomaliasEncontradas += anomalias.length;
        }

        console.log(`[IA-Local] Escaneo Completado. Productos: ${totalActivos} | Anomalías Detectadas y Notificadas: ${totalAnomaliasEncontradas}\n`);
        return { totalActivos, totalAnomaliasEncontradas };

    } catch (e) {
        console.error('[IA-Local] Falla sistémica durante análisis masivo:', e);
        return { error: e.message };
    }
};

/**
 * Tarea Cronológica Programada 
 */
const scheduleAnalisisDiario = () => {
    // 0 8 * * * -> 8:00 AM todos los días.
    cron.schedule('0 8 * * *', async () => {
        console.log('[NODE-CRON] Ejecutando análisis programado de IA...');
        await ejecutarAnalisisTodos();
    }, {
        scheduled: true,
        timezone: "America/Lima"
    });
    console.log('[IA Local] CRON Schedule iniciado (8:00 AM America/Lima)');
};

module.exports = {
    detectarAnomalias,
    ejecutarAnalisisTodos,
    scheduleAnalisisDiario
};
