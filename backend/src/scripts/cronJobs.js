const cron = require('node-cron');
const { Op } = require('sequelize');
const { LoteProduccion, Producto, Alerta, sequelize } = require('../models');

// CRON JOB - Ejecutar a las 8:00 AM todos los días (Regla R8)
const iniciarCronJobs = () => {
    cron.schedule('0 8 * * *', async () => {
        try {
            console.log('⏰ Ejecutando revisión diaria de vencimientos de lotes (Cron Job 8:00 AM)...');
            
            // Lógica: `fecha_vencimiento <= hoy + 90 días`
            const hoy = new Date();
            const limiteVencimiento = new Date(hoy);
            limiteVencimiento.setDate(hoy.getDate() + 90);

            const lotesPorVencer = await LoteProduccion.findAll({
                where: {
                    fecha_vencimiento: {
                        [Op.not]: null,
                        [Op.lte]: limiteVencimiento
                    },
                    estado_id: {
                        [Op.ne]: 3 // No evaluar descartados
                    }
                },
                include: [{ model: Producto, attributes: ['nombre'] }]
            });

            for (const lote of lotesPorVencer) {
                // Verificar si ya existe alerta para este lote hoy
                const hoyInicio = new Date();
                hoyInicio.setHours(0,0,0,0);
                
                const alertaExistente = await Alerta.findOne({
                    where: {
                        tipo_id: 5, // VENCIMIENTO_LOTE
                        lote_id: lote.id,
                        fecha_creacion: {
                            [Op.gte]: hoyInicio
                        }
                    }
                });

                if (!alertaExistente) {
                    await Alerta.create({
                        tipo_id: 5,
                        producto_id: lote.producto_id,
                        lote_id: lote.id,
                        mensaje: `El Lote ${lote.numero_lote} de ${lote.Producto.nombre} vencerá en 90 días o menos (${lote.fecha_vencimiento}).`,
                    });
                    console.log(`Alerta creada: Lote ${lote.numero_lote} por vencer.`);
                }
            }

            console.log('Revisión de vencimientos finalizada exitosamente.');
        } catch (error) {
            console.error('Error ejecutando Job de vencimientos:', error);
        }
    });
    
    console.log('NodeJS Cron Job (Alerta Vencimientos R8) programado para las 8:00 AM.');
};

module.exports = { iniciarCronJobs };
