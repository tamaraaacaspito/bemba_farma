'use strict';

const { Op, fn, col, literal } = require('sequelize');
const {
    Producto, MovimientoKardex, TipoMovimiento,
    Alerta, LoteProduccion, Proveedor,
    OrdenCompra, Categoria
} = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// MENÚ PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const MENU_PRINCIPAL = `
🤖 **Asistente EKA — Modo Local**

Elige una opción escribiendo su número o hazme una pregunta directamente:

1. 📦 Ver productos con **stock crítico**
2. 🔍 **Buscar stock** de un producto
3. 📊 **Resumen general** del inventario
4. 🕒 **Historial de movimientos** de un producto
5. ⚠️  **Lotes próximos a vencer** (próximos 90 días)
6. 📈 **Top 10 productos** con mayor rotación
7. 💰 **Valor total** del inventario
8. 🏭 **Proveedores** registrados
9. 🗂️  **Categorías** y cantidad de productos
10. 📋 **Órdenes de compra** recientes

Escribe \`menu\` en cualquier momento para volver aquí.
`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
const stopWords = [
    'el', 'la', 'los', 'las', 'de', 'del', 'un', 'una', 'unos', 'unas',
    'que', 'en', 'con', 'por', 'para', 'como', 'stock', 'cuanto', 'cuánto',
    'hay', 'historial', 'movimiento', 'movimientos', 'cuantos', 'cuántos',
    'tiene', 'ver', 'buscar', 'quiero', 'dame', 'dime', 'muestra', 'mostrar',
    'necesito', 'saber', 'informacion', 'información', 'me', 'mi', 'es',
    'sobre', 'del', 'producto', 'productos', 'actual', 'actualmente', 'ahora'
];

const buscarProductosPorString = async (texto) => {
    const cleanText = texto.toLowerCase().replace(/[¿?.,¡!]/g, '');
    const palabras = cleanText.split(' ').filter(w => w.length >= 3 && !stopWords.includes(w));

    for (const token of palabras) {
        // 1. Búsqueda exacta con el token → todos los resultados
        let lista = await Producto.findAll({
            where: {
                [Op.or]: [
                    { nombre: { [Op.like]: `%${token}%` } },
                    { codigo: { [Op.like]: `%${token}%` } }
                ],
                estado: true
            },
            include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }],
            order: [['nombre', 'ASC']]
        });
        if (lista.length > 0) return lista;

        // 2. Plural → singular (ej: "sondas" → "sonda")
        if (token.endsWith('s') && token.length > 4) {
            const singular = token.slice(0, -1);
            lista = await Producto.findAll({
                where: {
                    [Op.or]: [
                        { nombre: { [Op.like]: `%${singular}%` } },
                        { codigo: { [Op.like]: `%${singular}%` } }
                    ],
                    estado: true
                },
                include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }],
                order: [['nombre', 'ASC']]
            });
            if (lista.length > 0) return lista;
        }

        // 3. Búsqueda por raíz (70% del token, mínimo 4 chars)
        if (token.length >= 6) {
            const raiz = token.slice(0, Math.max(4, Math.floor(token.length * 0.7)));
            lista = await Producto.findAll({
                where: {
                    nombre: { [Op.like]: `%${raiz}%` },
                    estado: true
                },
                include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }],
                order: [['nombre', 'ASC']]
            });
            if (lista.length > 0) return lista;
        }
    }
    return [];
};

// Mantener compatibilidad con código que usa findOne
const buscarProductoPorString = async (texto) => {
    const lista = await buscarProductosPorString(texto);
    return lista.length > 0 ? lista[0] : null;
};

const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

const formatearSoles = (valor) => {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// INTENCIONES
// ─────────────────────────────────────────────────────────────────────────────

/** MENÚ / SALUDO */
const procesarMenu = () => ({ respuesta: MENU_PRINCIPAL, tipo: 'MENU' });

/** 1. STOCK CRÍTICO */
const procesarStockCritico = async () => {
    const catalogo = await Producto.findAll({
        where: { estado: true },
        include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }]
    });
    const criticos = catalogo.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo));

    if (criticos.length === 0) {
        return {
            respuesta: '✅ **¡Todo en orden!** No hay productos con stock crítico o agotado en este momento.\n\nEscribe `menu` para ver más opciones.',
            tipo: 'CRITICOS'
        };
    }

    let rta = `⚠️ **Productos en estado Crítico / Agotado (${criticos.length}):**\n\n`;
    criticos.forEach(p => {
        const estado = Number(p.stock_actual) === 0 ? '🔴 AGOTADO' : '🟡 CRÍTICO';
        rta += `${estado} **${p.nombre}** \`[${p.codigo}]\`\n`;
        rta += `   Stock: **${p.stock_actual}** ${p.unidad_medida} (Mínimo: ${p.stock_minimo})\n`;
        if (p.Categoria) rta += `   Categoría: ${p.Categoria.nombre}\n`;
        rta += '\n';
    });

    rta += `\n💡 *¿Quieres buscar el stock de un producto específico? Escribe su nombre.*\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'CRITICOS' };
};

/** 2. BUSCAR STOCK */
const procesarBusquedaStock = async (input) => {
    const productos = await buscarProductosPorString(input);

    if (productos.length === 0) {
        return {
            respuesta: `🔍 No encontré productos con ese nombre.\n\n**Intenta con:**\n- El nombre completo o parcial: *"paracetamol"*\n- El código: *"P-001"*\n\nEscribe \`menu\` para ver todas las opciones.`,
            tipo: 'AYUDA'
        };
    }

    // Si hay un solo resultado → mostrar detalle completo
    if (productos.length === 1) {
        const prod = productos[0];
        const nivelStock = Number(prod.stock_actual);
        const nivelMinimo = Number(prod.stock_minimo);
        let estadoIcon = '🟢';
        let estadoTexto = 'Normal';
        if (nivelStock === 0) { estadoIcon = '🔴'; estadoTexto = 'AGOTADO'; }
        else if (nivelStock <= nivelMinimo) { estadoIcon = '🟡'; estadoTexto = 'Crítico'; }

        let rta = `📦 **${prod.nombre}**\n`;
        rta += `━━━━━━━━━━━━━━━━━━━━\n`;
        rta += `🏷️ Código: \`${prod.codigo}\`\n`;
        rta += `${estadoIcon} Estado: **${estadoTexto}**\n`;
        rta += `📊 Stock actual: **${prod.stock_actual} ${prod.unidad_medida}**\n`;
        rta += `📉 Stock mínimo: ${prod.stock_minimo} ${prod.unidad_medida}\n`;
        rta += `💵 Precio unitario: ${formatearSoles(prod.precio_unitario)}\n`;
        rta += `💰 Valor en stock: ${formatearSoles(Number(prod.stock_actual) * Number(prod.precio_unitario))}\n`;
        if (prod.Categoria) rta += `🗂️ Categoría: ${prod.Categoria.nombre}\n`;
        rta += `\n¿Quieres ver los movimientos? Escribe: *"historial ${prod.nombre}"*`;
        return { respuesta: rta, tipo: 'STOCK' };
    }

    // Si hay múltiples resultados → mostrar lista completa
    let rta = `🔍 **Encontré ${productos.length} productos que coinciden:**\n\n`;
    productos.forEach((p, i) => {
        const stock = Number(p.stock_actual);
        const minimo = Number(p.stock_minimo);
        const icon = stock === 0 ? '🔴' : stock <= minimo ? '🟡' : '🟢';
        rta += `${icon} **${p.nombre}** \`[${p.codigo}]\`\n`;
        rta += `   Stock: **${p.stock_actual} ${p.unidad_medida}** | Mín: ${p.stock_minimo}`;
        if (p.Categoria) rta += ` | ${p.Categoria.nombre}`;
        rta += '\n\n';
    });
    rta += `\n💡 *Para ver el detalle de uno, escribe su nombre exacto.*\nEscribe \`menu\` para volver.`;
    return { respuesta: rta, tipo: 'STOCK' };
};

/** 3. RESUMEN GENERAL */
const procesarResumen = async () => {
    const [totalProductos, productos, alertasPendientes, totalOrdenes] = await Promise.all([
        Producto.count({ where: { estado: true } }),
        Producto.findAll({ where: { estado: true } }),
        Alerta.count({ where: { leida: false } }).catch(() => 0),
        OrdenCompra.count().catch(() => 0)
    ]);

    const valorInversion = productos.reduce(
        (acc, p) => acc + (Number(p.stock_actual) * Number(p.precio_unitario)), 0
    );
    const criticos = productos.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo));
    const agotados = productos.filter(p => Number(p.stock_actual) === 0);

    let rta = `📊 **Resumen Global del Inventario — EKA**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    rta += `📦 Productos en catálogo: **${totalProductos}**\n`;
    rta += `🔴 Productos agotados: **${agotados.length}**\n`;
    rta += `🟡 Productos en nivel crítico: **${criticos.length}**\n`;
    rta += `💰 Valor total del inventario: **${formatearSoles(valorInversion)}**\n`;
    rta += `🔔 Alertas sin leer: **${alertasPendientes}**\n`;
    rta += `📋 Órdenes de compra registradas: **${totalOrdenes}**\n`;

    if (criticos.length > 0) {
        rta += `\n⚠️ *Tienes ${criticos.length} producto(s) en estado crítico. Escribe \`1\` para verlos.*`;
    }

    rta += `\n\nEscribe \`menu\` para ver más opciones.`;
    return { respuesta: rta, tipo: 'RESUMEN' };
};

/** 4. HISTORIAL KARDEX */
const procesarHistorial = async (input) => {
    const prod = await buscarProductoPorString(input);
    if (!prod) {
        return {
            respuesta: `🔍 No encontré el producto para mostrar el historial.\n\n**Ejemplo:** *"historial paracetamol"* o *"movimientos P-001"*\n\nEscribe \`menu\` para volver.`,
            tipo: 'AYUDA'
        };
    }

    const movimientos = await MovimientoKardex.findAll({
        where: { producto_id: prod.id },
        include: [{ model: TipoMovimiento, attributes: ['nombre'] }],
        order: [['fecha_movimiento', 'DESC']],
        limit: 8
    });

    if (movimientos.length === 0) {
        return {
            respuesta: `📋 **${prod.nombre}** no tiene movimientos registrados en el Kardex aún.\n\nEscribe \`menu\` para volver.`,
            tipo: 'HISTORIAL'
        };
    }

    let rta = `🕒 **Últimos movimientos de ${prod.nombre}** \`[${prod.codigo}]\`\n`;
    rta += `Stock actual: **${prod.stock_actual} ${prod.unidad_medida}**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    movimientos.forEach(m => {
        const fecha = formatearFecha(m.fecha_movimiento);
        const tipo = m.TipoMovimiento?.nombre?.toUpperCase() || 'MOVIMIENTO';
        const icon = tipo.includes('ENTRADA') ? '📥' : tipo.includes('SALIDA') ? '📤' : '🔄';
        rta += `${icon} **${fecha}** — ${tipo}\n`;
        rta += `   Cantidad: ${m.cantidad} | Stock anterior: ${m.stock_anterior} → **${m.stock_nuevo}**\n`;
        if (m.motivo) rta += `   Motivo: *${m.motivo}*\n`;
        rta += '\n';
    });

    rta += `\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'HISTORIAL' };
};

/** 5. LOTES PRÓXIMOS A VENCER */
const procesarLotesVencer = async () => {
    const hoy = new Date();
    const limite90 = new Date();
    limite90.setDate(hoy.getDate() + 90);

    const lotes = await LoteProduccion.findAll({
        where: {
            fecha_vencimiento: { [Op.between]: [hoy, limite90] }
        },
        include: [{ model: Producto, attributes: ['nombre', 'codigo'] }],
        order: [['fecha_vencimiento', 'ASC']],
        limit: 15
    });

    if (lotes.length === 0) {
        return {
            respuesta: `✅ **No hay lotes próximos a vencer** en los próximos 90 días.\n\nEscribe \`menu\` para volver.`,
            tipo: 'LOTES'
        };
    }

    let rta = `⚠️ **Lotes próximos a vencer (${lotes.length})**\n`;
    rta += `*(Próximos 90 días — orden: más urgentes primero)*\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    lotes.forEach(l => {
        const diasRestantes = Math.ceil((new Date(l.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24));
        const urgencia = diasRestantes <= 15 ? '🔴' : diasRestantes <= 30 ? '🟡' : '🟢';
        rta += `${urgencia} **${l.Producto?.nombre || 'N/A'}** \`[${l.numero_lote}]\`\n`;
        rta += `   Vence: **${formatearFecha(l.fecha_vencimiento)}** (en ${diasRestantes} días)\n`;
        rta += `   Cantidad: ${l.cantidad_producida}\n\n`;
    });

    rta += `\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'LOTES' };
};

/** 6. TOP PRODUCTOS MÁS MOVIDOS */
const procesarTopProductos = async () => {
    let movimientos = await MovimientoKardex.findAll({
        attributes: [
            'producto_id',
            [fn('SUM', col('cantidad')), 'total_movido'],
            [fn('COUNT', col('MovimientoKardex.id')), 'num_movimientos']
        ],
        include: [{ model: Producto, attributes: ['nombre', 'codigo', 'unidad_medida'] }],
        group: ['producto_id', 'Producto.id', 'Producto.nombre', 'Producto.codigo', 'Producto.unidad_medida'],
        order: [[literal('total_movido'), 'DESC']]
    });

    movimientos = movimientos.slice(0, 10);

    if (movimientos.length === 0) {
        return {
            respuesta: `📈 Aún no hay movimientos registrados para calcular la rotación.\n\nEscribe \`menu\` para volver.`,
            tipo: 'TOP'
        };
    }

    let rta = `📈 **Top 10 productos con mayor movimiento**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    movimientos.forEach((m, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        rta += `${medal} **${m.Producto?.nombre || 'N/A'}**\n`;
        rta += `   Unidades movidas: ${m.dataValues.total_movido} | Movimientos: ${m.dataValues.num_movimientos}\n\n`;
    });

    rta += `\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'TOP' };
};

/** 7. VALOR TOTAL INVENTARIO */
const procesarValorInventario = async () => {
    const productos = await Producto.findAll({
        where: { estado: true },
        include: [{ model: Categoria, as: 'Categoria', attributes: ['nombre'] }]
    });

    const porCategoria = {};
    let totalGeneral = 0;

    productos.forEach(p => {
        const catNombre = p.Categoria?.nombre || 'Sin categoría';
        const valor = Number(p.stock_actual) * Number(p.precio_unitario);
        totalGeneral += valor;
        if (!porCategoria[catNombre]) porCategoria[catNombre] = 0;
        porCategoria[catNombre] += valor;
    });

    let rta = `💰 **Valor Total del Inventario**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    rta += `💵 **TOTAL GENERAL: ${formatearSoles(totalGeneral)}**\n\n`;
    rta += `📂 *Desglose por categoría:*\n`;

    Object.entries(porCategoria)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, valor]) => {
            const porcentaje = ((valor / totalGeneral) * 100).toFixed(1);
            rta += `• **${cat}**: ${formatearSoles(valor)} *(${porcentaje}%)*\n`;
        });

    rta += `\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'VALOR' };
};

/** 8. PROVEEDORES */
const procesarProveedores = async () => {
    const proveedores = await Proveedor.findAll({
        order: [['nombre', 'ASC']]
    });

    if (proveedores.length === 0) {
        return {
            respuesta: `📋 No hay proveedores registrados en el sistema.\n\nEscribe \`menu\` para volver.`,
            tipo: 'PROVEEDORES'
        };
    }

    let rta = `🏭 **Proveedores Registrados (${proveedores.length})**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    proveedores.forEach(p => {
        rta += `• **${p.razon_social}**`;
        if (p.ruc) rta += ` | RUC: \`${p.ruc}\``;
        if (p.telefono) rta += ` | 📞 ${p.telefono}`;
        rta += '\n';
        if (p.email) rta += `  ✉️ ${p.email}\n`;
    });

    rta += `\nEscribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'PROVEEDORES' };
};

/** 9. CATEGORÍAS */
const procesarCategorias = async () => {
    const categorias = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    const counts = await Promise.all(
        categorias.map(c => Producto.count({ where: { categoria_id: c.id, estado: true } }))
    );

    let rta = `🗂️ **Categorías de Productos**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    categorias.forEach((c, i) => {
        rta += `• **${c.nombre}** — ${counts[i]} producto(s)\n`;
    });

    rta += `\n💡 *¿Quieres ver los productos de una categoría? Escríbela directamente.*\nEscribe \`menu\` para volver.`;
    return { respuesta: rta, tipo: 'CATEGORIAS' };
};

/** 10. ÓRDENES RECIENTES */
const procesarOrdenes = async () => {
    const ordenes = await OrdenCompra.findAll({
        include: [
            { model: Proveedor, attributes: ['razon_social'] }
        ],
        order: [['fecha_emision', 'DESC']],
        limit: 10
    }).catch(() => []);

    if (ordenes.length === 0) {
        return {
            respuesta: `📋 No hay órdenes de compra registradas.\n\nEscribe \`menu\` para volver.`,
            tipo: 'ORDENES'
        };
    }

    let rta = `📋 **Últimas 10 Órdenes de Compra**\n`;
    rta += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    ordenes.forEach(o => {
        const ref = o.numero_orden ? `Orden ${o.numero_orden}` : `Orden #${o.id}`;
        rta += `📄 **${ref}** — ${formatearFecha(o.fecha_emision)}\n`;
        if (o.Proveedor) rta += `   Proveedor: ${o.Proveedor.razon_social}\n`;
        if (o.total) rta += `   Total: ${formatearSoles(o.total)}\n`;
        rta += '\n';
    });

    rta += `Escribe \`menu\` para volver al inicio.`;
    return { respuesta: rta, tipo: 'ORDENES' };
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER PRINCIPAL DE INTENCIONES
// ─────────────────────────────────────────────────────────────────────────────
const procesarPregunta = async (pregunta, historialMensajes = []) => {
    const input = pregunta.toLowerCase().trim().replace(/[¿?¡!]/g, '');

    // ── CONFIRMACIÓN CONTEXTUAL ("SÍ") ──
    const esAfirmacion = ['si', 'sí', 'claro', 'por supuesto', 'dale', 'ok', 'okay', 'yes', 's'].includes(input);
    if (esAfirmacion && historialMensajes.length >= 2) {
        // Obtener el mensaje anterior (el que envió el asistente)
        const mensajeBotAnterior = historialMensajes[historialMensajes.length - 2].content;
        
        // Si el bot preguntó previamente por el historial
        if (mensajeBotAnterior && mensajeBotAnterior.includes('¿Quieres ver los movimientos de este producto?')) {
            const match = mensajeBotAnterior.match(/"historial (.+?)"/);
            if (match && match[1]) {
                return procesarHistorial(match[1]);
            }
        }
    }

    // ── OPCIÓN NUMÉRICA ──
    const numero = input.match(/^\d+$/);
    if (numero) {
        const n = parseInt(numero[0]);
        if (n === 1) return procesarStockCritico();
        if (n === 2) return { respuesta: `🔍 ¿Qué producto quieres buscar?\nEscribe su nombre o código, por ejemplo: *"stock paracetamol"*`, tipo: 'AYUDA' };
        if (n === 3) return procesarResumen();
        if (n === 4) return { respuesta: `🕒 ¿De qué producto quieres ver el historial?\nEscribe, por ejemplo: *"historial paracetamol"*`, tipo: 'AYUDA' };
        if (n === 5) return procesarLotesVencer();
        if (n === 6) return procesarTopProductos();
        if (n === 7) return procesarValorInventario();
        if (n === 8) return procesarProveedores();
        if (n === 9) return procesarCategorias();
        if (n === 10) return procesarOrdenes();
        return procesarMenu();
    }

    // ── MENÚ / SALUDO ──
    const esMenu = ['menu', 'menú', 'inicio', 'ayuda', 'help', 'hola', 'buenas', 'buenos dias',
        'buenos días', 'buenas tardes', 'buenas noches', 'empezar', 'start', 'opciones'].some(k => input.includes(k));
    if (esMenu) return procesarMenu();



    // ── STOCK CRÍTICO ──
    const esCritico = ['critico', 'crítico', 'criticos', 'críticos', 'agotado', 'agotados',
        'bajo stock', 'sin stock', 'pedir', 'qué pedir', 'que pedir', 'reponer',
        'reabastec', 'falta', 'faltan', 'escaso', 'escasos'].some(k => input.includes(k));
    if (esCritico) return procesarStockCritico();

    // ── LOTES/VENCIMIENTOS ──
    const esVencimiento = ['venc', 'caduci', 'caducar', 'expirar', 'expira', 'lote', 'lotes',
        'fecha', 'próximo', 'proximo', 'caducidad'].some(k => input.includes(k));
    if (esVencimiento) return procesarLotesVencer();

    // ── TOP / ROTACIÓN ──
    const esTop = ['top', 'más movido', 'mas movido', 'mayor rotacion', 'mayor rotación',
        'más vendido', 'mas vendido', 'rotacion', 'rotación', 'demanda',
        'popular', 'frecuente'].some(k => input.includes(k));
    if (esTop) return procesarTopProductos();

    // ── VALOR / INVERSIÓN ──
    const esValor = ['valor', 'inversión', 'inversion', 'costo del inventario', 'cuánto vale',
        'cuanto vale', 'dinero', 'capital', 'patrimonio'].some(k => input.includes(k));
    if (esValor) return procesarValorInventario();

    // ── PROVEEDORES ──
    const esProveedor = ['proveedor', 'proveedores', 'distribuidor', 'distribuidores',
        'quien vende', 'quién vende', 'suministrador'].some(k => input.includes(k));
    if (esProveedor) return procesarProveedores();

    // ── CATEGORÍAS ──
    const esCategoria = ['categoria', 'categoría', 'categorias', 'categorías',
        'tipo de producto', 'clasificacion', 'clasificación'].some(k => input.includes(k));
    if (esCategoria) return procesarCategorias();

    // ── ÓRDENES ──
    const esOrden = ['orden', 'ordenes', 'órdenes', 'compra', 'pedido', 'pedidos',
        'solicitud', 'solicitudes'].some(k => input.includes(k));
    if (esOrden) return procesarOrdenes();

    // ── RESUMEN / REPORTE ──
    const esResumen = ['reporte', 'resumen', 'informe', 'general', 'estadistic',
        'cuántos productos', 'cuantos productos', 'total de productos'].some(k => input.includes(k));
    if (esResumen) return procesarResumen();

    // ── HISTORIAL KARDEX ──
    const esHistorial = ['historial', 'movimiento', 'kardex', 'auditoria', 'auditoría',
        'registro', 'últimos movimientos', 'ultimos movimientos'].some(k => input.includes(k));
    if (esHistorial) return procesarHistorial(input);

    // ── BUSCAR STOCK (intención general de consulta de un producto) ──
    const esBusqueda = ['stock', 'cuanto', 'cuánto', 'hay', 'tiene', 'existencia',
        'disponible', 'quedan', 'unidades', 'buscar', 'busca',
        'muéstrame', 'muestrame', 'dame información', 'dame informacion'].some(k => input.includes(k));
    if (esBusqueda) return procesarBusquedaStock(input);

    // ── INTENTO DE BÚSQUEDA GENÉRICA (asume que busca un producto) ──
    const posibleProducto = await buscarProductoPorString(input);
    if (posibleProducto) return procesarBusquedaStock(input);

    // ── DEFAULT: MOSTRAR MENÚ CON MENSAJE ──
    return {
        respuesta: `🤔 No entendí bien tu consulta: *"${pregunta}"*\n\nAquí tienes lo que puedo hacer por ti:\n${MENU_PRINCIPAL}`,
        tipo: 'AYUDA'
    };
};

module.exports = { procesarPregunta };
