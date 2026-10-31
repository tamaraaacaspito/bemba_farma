/**
 * src/services/emailService.js
 * Servicio de correo electrónico con Nodemailer + Gmail SMTP.
 * Configura las variables de entorno GMAIL_USER y GMAIL_APP_PASSWORD en .env
 * IMPORTANTE: En Gmail debes activar "Contraseñas de aplicación" (no la contraseña normal).
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// ── Templates de correo por estado ─────────────────────────────────────────────

const ESTADO_CONFIG = {
    NUEVO: {
        asunto: '✅ Cotización recibida — Droguería EKA',
        color: '#2ABAB4',
        titulo: 'Hemos recibido tu cotización',
        mensaje: 'Tu requerimiento ha sido registrado en nuestro sistema. Un asesor comercial lo revisará pronto y se pondrá en contacto contigo.'
    },
    EN_PROCESO: {
        asunto: '🔄 Tu cotización está siendo procesada — Droguería EKA',
        color: '#3B82F6',
        titulo: 'Tu cotización está en proceso',
        mensaje: 'Estamos verificando el stock disponible y preparando tu despacho. Te notificaremos cuando esté confirmado.'
    },
    ATENDIDO: {
        asunto: '🎉 Cotización aprobada y procesada — Droguería EKA',
        color: '#22C55E',
        titulo: '¡Tu pedido fue aprobado!',
        mensaje: 'Tu requerimiento fue atendido exitosamente. El equipo de logística coordinará la entrega según los términos acordados. ¡Gracias por confiar en Droguería EKA!'
    },
    DESCARTADO: {
        asunto: '❌ Actualización sobre tu cotización — Droguería EKA',
        color: '#EF4444',
        titulo: 'No pudimos procesar tu cotización',
        mensaje: 'Lamentablemente no fue posible atender tu requerimiento en este momento. Por favor comunícate con nosotros al +51 (01) 425-1122 o escríbenos a ventas@drogueriaeka.com.pe para encontrar una solución.'
    }
};

/**
 * Envía notificación de cambio de estado a un cliente web.
 */
const notificarEstadoPedido = async ({ email, nombre, estado, pedidoId, productos }) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('[EmailService] Variables GMAIL_USER / GMAIL_APP_PASSWORD no configuradas. Email no enviado.');
        return false;
    }

    const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.NUEVO;
    const productosHtml = productos
        ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;margin:16px 0;">
                <p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Productos solicitados:</p>
                ${JSON.parse(productos).map(p => `<div style="font-size:12px;color:#6B7280;margin-bottom:4px;">• ${p.cantidad}x ${p.nombre}</div>`).join('')}
           </div>`
        : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'Inter',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,${cfg.color},#1a8a85);padding:28px 32px;text-align:center;">
                <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:24px;">💊</span>
                </div>
                <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0;letter-spacing:2px;text-transform:uppercase;">Droguería EKA S.A.C.</p>
            </div>
            <!-- Body -->
            <div style="padding:32px;">
                <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px;font-weight:700;">${cfg.titulo}</h2>
                <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:16px;">
                    Estimado/a <strong>${nombre}</strong>, ${cfg.mensaje}
                </p>
                ${productosHtml}
                <div style="background:#f8fafc;border-left:4px solid ${cfg.color};border-radius:0 8px 8px 0;padding:12px 16px;margin-top:16px;">
                    <p style="font-size:12px;color:#64748b;margin:0;">
                        N° de requerimiento: <strong style="color:#0f172a;">#REQ-${String(pedidoId).padStart(4,'0')}</strong>
                    </p>
                </div>
                <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f1f5f9;text-align:center;">
                    <p style="font-size:12px;color:#94a3b8;margin:4px 0;">Jr. Yungay 1817A, Chacra Ríos Norte, Lima</p>
                    <p style="font-size:12px;color:#94a3b8;margin:4px 0;">ventas@drogueriaeka.com.pe · +51 (01) 425-1122</p>
                    <p style="font-size:11px;color:#cbd5e1;margin-top:12px;">© 2026 Droguería EKA S.A.C. — RUC 20611011181</p>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    try {
        await transporter.sendMail({
            from: `"Droguería EKA" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: cfg.asunto,
            html
        });
        console.log(`[EmailService] ✅ Email enviado a ${email} — estado: ${estado}`);
        return true;
    } catch (err) {
        console.error(`[EmailService] ❌ Error enviando email a ${email}:`, err.message);
        return false;
    }
};

module.exports = { notificarEstadoPedido };
