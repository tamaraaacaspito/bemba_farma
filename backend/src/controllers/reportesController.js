'use strict';

const { Op } = require('sequelize');
const { Producto, MovimientoKardex, Usuario, TipoMovimiento, LoteProduccion, sequelize } = require('../models');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// =========================================================================
// ENDPOINTS DE RESUMEN (API JSON)
// =========================================================================

// GET /api/reportes/kardex
const kardexResumen = async (req, res, next) => {
    try {
        const { producto_id, tipo_movimiento_id, fecha_inicio, fecha_fin } = req.query;

        let where = {};
        if (producto_id) where.producto_id = producto_id;
        if (tipo_movimiento_id) where.tipo_movimiento_id = tipo_movimiento_id;
        if (fecha_inicio || fecha_fin) {
            where.fecha_movimiento = {};
            if (fecha_inicio) where.fecha_movimiento[Op.gte] = new Date(fecha_inicio);
            if (fecha_fin) where.fecha_movimiento[Op.lte] = new Date(fecha_fin);
        }

        const movimientos = await MovimientoKardex.findAll({ where });

        let total_entradas = 0;
        let total_salidas = 0;
        let total_ajustes = 0;

        movimientos.forEach(m => {
            if (m.tipo_movimiento_id == 1) total_entradas += Number(m.cantidad);
            else if (m.tipo_movimiento_id == 2) total_salidas += Number(m.cantidad);
            else if (m.tipo_movimiento_id == 3) total_ajustes += Number(m.cantidad);
        });

        return res.json({ total_entradas, total_salidas, total_ajustes });
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/inventario
const inventarioDetalle = async (req, res, next) => {
    try {
        const productos = await Producto.findAll({ where: { estado: true } });
        
        let valor_total_inventario = 0;
        
        const data = productos.map(p => {
            const stock_actual = Number(p.stock_actual);
            const stock_minimo = Number(p.stock_minimo);
            const precio = Number(p.precio_unitario);
            const valor_stock = stock_actual * precio;
            
            valor_total_inventario += valor_stock;
            
            let estado = 'OK';
            if (stock_actual === 0) estado = 'AGOTADO';
            else if (stock_actual <= stock_minimo) estado = 'CRITICO';

            return {
                ...p.toJSON(),
                valor_stock,
                estado_stock: estado
            };
        });

        return res.json({
            data,
            valor_total_inventario
        });
    } catch (error) {
        next(error);
    }
};


// =========================================================================
// EXPORTACIONES AL VUELO (EXCEL Y PDF)
// =========================================================================

// GET /api/reportes/kardex/excel
const exportarKardexExcel = async (req, res, next) => {
    try {
        const { producto_id, fecha_inicio, fecha_fin } = req.query;
        let where = {};
        if (producto_id) where.producto_id = producto_id;
        if (fecha_inicio || fecha_fin) {
            where.fecha_movimiento = {};
            if (fecha_inicio) where.fecha_movimiento[Op.gte] = new Date(fecha_inicio);
            if (fecha_fin) where.fecha_movimiento[Op.lte] = new Date(fecha_fin);
        }

        const movimientos = await MovimientoKardex.findAll({
            where,
            include: [
                { model: Producto, attributes: ['nombre', 'codigo', 'precio_unitario'] },
                { model: TipoMovimiento, attributes: ['nombre'] },
                { model: Usuario, attributes: ['nombre'] },
                { model: LoteProduccion, attributes: ['numero_lote', 'fecha_vencimiento'] }
            ],
            order: [['fecha_movimiento', 'ASC']] // ASC para calcular saldo acumulado en orden cronológico
        });

        let nombreProducto = 'Todos los Productos';
        if (producto_id && movimientos.length > 0 && movimientos[0].Producto) {
            nombreProducto = movimientos[0].Producto.nombre;
        } else if (producto_id) {
            const p = await Producto.findByPk(producto_id);
            if (p) nombreProducto = p.nombre;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Kardex');

        // Fila 1: titulo 'DROGUERIA EKA S.A.C. — Kardex de [nombre producto]' (merge, azul oscuro, blanco).
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `DROGUERÍA EKA S.A.C. — Kardex de ${nombreProducto}`;
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
        titleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Fila 2: 'Periodo: [fecha_desde] al [fecha_hasta]' (gris claro).
        sheet.mergeCells('A2:H2');
        const fDesde = fecha_inicio ? new Date(fecha_inicio).toLocaleDateString('es-PE') : 'Inicio';
        const fHasta = fecha_fin ? new Date(fecha_fin).toLocaleDateString('es-PE') : 'Hoy';
        const subtitleCell = sheet.getCell('A2');
        subtitleCell.value = `Periodo: ${fDesde} al ${fHasta}`;
        subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        subtitleCell.font = { bold: true };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Fila 3: cabeceras en azul (#1F4E79) con texto blanco y negrita.
        const headers = [
            'Fecha', 'Tipo', 'N° Lote', 'Fecha Venc.', 
            'Cantidad', 'Precio Unit. (S/)', 'Total Mov. (S/)', 'Saldo Acum. (S/)'
        ];
        const headerRow = sheet.getRow(3);
        headerRow.values = headers;
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        ['A','B','C','D','E','F','G','H'].forEach((col, idx) => {
            const cell = sheet.getCell(`${col}3`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getColumn(idx + 1).width = 18;
        });
        sheet.getColumn(2).width = 15; // Tipo
        sheet.getColumn(3).width = 15; // N° Lote
        sheet.getColumn(4).width = 15; // Fecha Venc.

        let rowCount = 4;
        let saldo_acumulado = 0;
        let suma_entradas = 0;
        let suma_salidas = 0;

        movimientos.forEach((m, index) => {
            const row = sheet.getRow(rowCount);
            const fecha = new Date(m.fecha_movimiento).toLocaleDateString('es-PE');
            const tipo = m.TipoMovimiento?.nombre || (m.tipo_movimiento_id === 1 ? 'ENTRADA' : (m.tipo_movimiento_id === 2 ? 'SALIDA' : 'AJUSTE'));
            const lote = m.LoteProduccion?.numero_lote || m.lote_id || '-';
            const fVenc = m.LoteProduccion?.fecha_vencimiento ? new Date(m.LoteProduccion.fecha_vencimiento).toLocaleDateString('es-PE') : '-';

            const cantidad = Number(m.cantidad) || 0;
            const precio_unitario = Number(m.precio_unitario) || Number(m.Producto?.precio_unitario) || 0;
            const total_mov = cantidad * precio_unitario;

            if (tipo === 'ENTRADA' || m.tipo_movimiento_id === 1) {
                saldo_acumulado += total_mov;
                suma_entradas += cantidad;
            } else if (tipo === 'SALIDA' || m.tipo_movimiento_id === 2) {
                saldo_acumulado -= total_mov;
                suma_salidas += cantidad;
            }

            row.values = [
                fecha,
                tipo,
                lote,
                fVenc,
                cantidad,
                precio_unitario,
                total_mov,
                saldo_acumulado
            ];

            // Formato moneda en columnas numéricas
            row.getCell(5).numFmt = '#,##0.00';
            row.getCell(6).numFmt = '"S/" #,##0.00';
            row.getCell(7).numFmt = '"S/" #,##0.00';
            row.getCell(8).numFmt = '"S/" #,##0.00';

            // Tipo coloreado: ENTRADA en verde, SALIDA en rojo (usando fill de celda)
            const cellTipo = row.getCell(2);
            if (tipo === 'ENTRADA' || m.tipo_movimiento_id === 1) {
                cellTipo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
                cellTipo.font = { color: { argb: 'FF006100' } };
            } else if (tipo === 'SALIDA' || m.tipo_movimiento_id === 2) {
                cellTipo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                cellTipo.font = { color: { argb: 'FF9C0006' } };
            }

            // Filas alternas: fila par fondo blanco, impar fondo gris claro (#F5F5F5)
            // Consideramos index 0 como par
            const bgColor = (index % 2 === 0) ? 'FFFFFFFF' : 'FFF5F5F5';
            ['A','B','C','D','E','F','G','H'].forEach(col => {
                if (col !== 'B') {
                    row.getCell(`${col}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                }
            });

            rowCount++;
        });

        // Ultima fila: TOTALES en negrita: suma de entradas, suma de salidas, saldo final.
        const footerRow = sheet.getRow(rowCount);
        sheet.mergeCells(`A${rowCount}:D${rowCount}`);
        footerRow.getCell(1).value = 'TOTALES';
        footerRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        
        footerRow.getCell(5).value = `Entradas: ${suma_entradas} | Salidas: ${suma_salidas}`;
        footerRow.getCell(7).value = 'SALDO FINAL:';
        footerRow.getCell(8).value = saldo_acumulado;
        
        footerRow.font = { bold: true };
        footerRow.getCell(8).numFmt = '"S/" #,##0.00';

        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="kardex_${dateStr}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/kardex/pdf
const exportarKardexPdf = async (req, res, next) => {
    try {
        const doc = new PDFDocument({ margin: 20, layout: 'landscape', size: 'A4' });
        
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="kardex_formato_${dateStr}.pdf"`);
        doc.pipe(res);

        const { producto_id, fecha_inicio, fecha_fin } = req.query;
        let where = {};
        if (producto_id) where.producto_id = producto_id;
        if (fecha_inicio || fecha_fin) {
            where.fecha_movimiento = {};
            if (fecha_inicio) where.fecha_movimiento[Op.gte] = new Date(fecha_inicio);
            if (fecha_fin) where.fecha_movimiento[Op.lte] = new Date(fecha_fin);
        }
        
        const movimientos = await MovimientoKardex.findAll({
            where,
            include: [
                { model: Producto, attributes: ['nombre', 'codigo', 'precio_unitario'] }, 
                { model: TipoMovimiento, attributes: ['nombre'] }, 
                { model: LoteProduccion, attributes: ['numero_lote'] }
            ],
            limit: 500,
            order: [['fecha_movimiento', 'DESC']]
        });

        // Configuración de la tabla PDF
        doc.fontSize(5);
        const headers = [
            'Fecha Emisio', 'Fecha Traslad', 'Concepto', 'DESTINO', 'Cliente', 
            'RUC', 'Item', 'Lote', 'Codigo', 'Producto', 
            'Cantidad', 'Cant. Real', 'P.U.', 'P. Unit', 'Monto', 
            'ESTADO', 'FECHA CANCEL', 'N° Entrega', 'U.E', 'SIAF', 
            'FACTURA', 'EMISION', 'PENALIDAD'
        ];
        // Ancho total disponible: 842 - 40 = 802
        const colWidths = [35, 35, 35, 60, 40, 35, 15, 30, 35, 75, 30, 30, 25, 25, 30, 25, 45, 40, 20, 25, 35, 35, 41];
        const startX = 20;
        let y = 30;
        const rowHeight = 12;

        const drawRow = (rowY, values, isHeader = false) => {
            let currentX = startX;
            if (isHeader) {
                doc.rect(startX, rowY, 802, rowHeight).fill('#d9d2e9');
            }
            
            for (let i = 0; i < values.length; i++) {
                doc.rect(currentX, rowY, colWidths[i], rowHeight).strokeColor('#000000').lineWidth(0.5).stroke();
                doc.fillColor('#000000').text(
                    String(values[i]).substring(0, 30), 
                    currentX + 2, 
                    rowY + 3, 
                    { width: colWidths[i] - 4, align: 'left', lineBreak: false }
                );
                currentX += colWidths[i];
            }
        };

        // Header
        drawRow(y, headers, true);
        y += rowHeight;

        // Rows
        movimientos.forEach((m, index) => {
            if (y + rowHeight > doc.page.height - 20) {
                doc.addPage();
                y = 20;
                drawRow(y, headers, true);
                y += rowHeight;
            }

            const fecha = new Date(m.fecha_movimiento).toLocaleDateString('es-PE');
            const isSalida = m.TipoMovimiento?.nombre === 'SALIDA';
            const concepto = m.TipoMovimiento?.nombre === 'ENTRADA' ? 'Compra' : (isSalida ? 'Venta' : m.TipoMovimiento?.nombre);
            const pu = Number(m.Producto?.precio_unitario || 0);
            const cant = Number(m.cantidad);

            const rowVals = [
                fecha, fecha, concepto, m.motivo || '-', '-', '-',
                String(index + 1).padStart(2, '0'),
                m.LoteProduccion?.numero_lote || m.lote_id || 'HMA',
                m.Producto?.codigo || '',
                m.Producto?.nombre || '',
                cant.toFixed(2), cant.toFixed(2), pu.toFixed(2), pu.toFixed(2), (cant * pu).toFixed(2),
                'SI', '-', '-', '-', '-', 
                m.referencia_tipo === 'FACTURA' ? m.referencia_id : '-', 
                '-', '-'
            ];

            drawRow(y, rowVals, false);
            y += rowHeight;
        });

        doc.end();
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/inventario/excel
const exportarInventarioExcel = async (req, res, next) => {
    try {
        const productos = await Producto.findAll({ where: { estado: true } });
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Inventario');

        sheet.mergeCells('A1:G1');
        const headerRow = sheet.getCell('A1');
        headerRow.value = 'Droguería EKA S.A.C.';
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells('A2:G2');
        sheet.getCell('A2').value = 'Reporte de Estado de Inventario Valorizado';
        sheet.getCell('A2').alignment = { horizontal: 'center' };
        sheet.getCell('A2').font = { bold: true };
        
        sheet.mergeCells('A3:G3');
        sheet.getCell('A3').value = `Generado: ${new Date().toLocaleDateString('es-PE')} por ${req.usuario.nombre}`;

        sheet.getRow(5).values = ['Código', 'Nombre', 'Stock Actual', 'Mínimo', 'Precio U.', 'Valor Total S/', 'Estado'];
        sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        
        ['A','B','C','D','E','F','G'].forEach(col => {
            sheet.getCell(`${col}5`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2ABAB4' } };
        });

        let rowCount = 6;
        let sumaTotal = 0;

        productos.forEach(p => {
            const row = sheet.getRow(rowCount);
            const stock = Number(p.stock_actual);
            const precio = Number(p.precio_unitario);
            const valor = stock * precio;
            sumaTotal += valor;
            
            let estado = 'OK';
            if (stock === 0) estado = 'AGOTADO';
            else if (stock <= Number(p.stock_minimo)) estado = 'CRITICO';

            row.values = [p.codigo, p.nombre, stock, Number(p.stock_minimo), precio, valor, estado];
            rowCount++;
        });

        rowCount++;
        sheet.getRow(rowCount).values = ['TOTAL VALORIZADO', '', '', '', '', sumaTotal];
        sheet.getRow(rowCount).font = { bold: true, size: 12 };
        
        sheet.columns.forEach(column => column.width = 18);

        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="inventario_${dateStr}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/inventario/pdf
const exportarInventarioPdf = async (req, res, next) => {
    try {
        const doc = new PDFDocument({ margin: 30 });
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="inventario_${dateStr}.pdf"`);
        doc.pipe(res);

        doc.fontSize(20).fillColor('#1F4E79').text('Droguería EKA S.A.C.', { align: 'center' });
        doc.fontSize(14).fillColor('black').text('Estado de Inventario Valorizado', { align: 'center' });
        doc.moveDown(2);

        const productos = await Producto.findAll({ where: { estado: true } });
        
        let sumaTotal = 0;
        doc.fontSize(9);
        doc.font('Helvetica-Bold');
        doc.text('CÓDIGO      | NOMBRE                     | STOCK | PRECIO S/ |  VALOR S/ | ESTADO', { underline: true });
        doc.font('Helvetica').moveDown(0.5);

        productos.forEach(p => {
            const stock = Number(p.stock_actual);
            const valor = stock * Number(p.precio_unitario);
            sumaTotal += valor;
            
            let estado = 'OK';
            if (stock === 0) estado = 'AGOTADO';
            else if (stock <= Number(p.stock_minimo)) estado = 'CRITICO';

            doc.text(`${p.codigo.padEnd(10)} | ${p.nombre.substring(0, 25).padEnd(25)} | ${String(stock).padEnd(5)} | ${String(p.precio_unitario).padEnd(9)} | ${valor.toFixed(2).padEnd(9)} | ${estado}`);
        });

        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1F4E79').text(`VALOR TOTAL DEL INVENTARIO: S/ ${sumaTotal.toFixed(2)}`);

        doc.end();
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/stock-valorizado
const stockValorizado = async (req, res, next) => {
    try {
        const { formato } = req.query;

        // Productos activos
        const productos = await Producto.findAll({
            where: { estado: true }
        });

        // Subconsulta para precio promedio ponderado (entradas)
        const promedios = await MovimientoKardex.findAll({
            where: { tipo_movimiento_id: 1 },
            attributes: [
                'producto_id',
                [sequelize.fn('SUM', sequelize.literal('cantidad * precio_unitario')), 'total_valor'],
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_cantidad']
            ],
            group: ['producto_id']
        });

        const mapPromedios = {};
        promedios.forEach(p => {
            const sumValor = Number(p.getDataValue('total_valor')) || 0;
            const sumCant = Number(p.getDataValue('total_cantidad')) || 0;
            mapPromedios[p.producto_id] = sumCant > 0 ? (sumValor / sumCant) : 0;
        });

        let data = productos.map(prod => {
            const stock_actual = Number(prod.stock_actual);
            const stock_minimo = Number(prod.stock_minimo);
            const precio_promedio = mapPromedios[prod.id] || Number(prod.precio_unitario) || 0;
            const valor_total = stock_actual * precio_promedio;
            const alerta_stock = stock_actual <= stock_minimo;

            return {
                producto_id: prod.id,
                codigo: prod.codigo,
                nombre: prod.nombre,
                categoria: '-', // Para simplicidad si Categoria no está incl., se puede cruzar
                stock_actual,
                precio_promedio,
                valor_total,
                stock_minimo,
                alerta_stock
            };
        });

        // Ordenar por valor total DESC
        data.sort((a, b) => b.valor_total - a.valor_total);

        if (formato === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Stock Valorizado');

            sheet.getRow(1).values = ['Producto', 'Categoría', 'Stock Actual', 'Precio Promedio', 'Valor Total', 'Alerta Stock'];
            sheet.getRow(1).font = { bold: true };

            data.forEach(item => {
                sheet.addRow([
                    item.nombre,
                    item.categoria,
                    item.stock_actual,
                    item.precio_promedio,
                    item.valor_total,
                    item.alerta_stock ? 'CRÍTICO' : 'OK'
                ]);
            });

            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="stock_valorizado_${dateStr}.xlsx"`);
            return workbook.xlsx.write(res).then(() => res.end());
        }

        return res.json({ data });
    } catch (error) {
        next(error);
    }
};

// GET /api/reportes/caducidad
const reporteCaducidad = async (req, res, next) => {
    try {
        const hoy = new Date();
        const maxFecha = new Date();
        maxFecha.setDate(hoy.getDate() + 90);

        const lotes = await LoteProduccion.findAll({
            where: {
                fecha_vencimiento: {
                    [Op.lte]: maxFecha
                },
                cantidad_producida: { [Op.gt]: 0 } // estado=ACTIVO as interpreted by stock > 0
            },
            include: [{ model: Producto, attributes: ['nombre', 'categoria_id'] }]
        });

        const data = lotes.map(lt => {
            const msInDay = 1000 * 60 * 60 * 24;
            const dias_restantes = Math.ceil((new Date(lt.fecha_vencimiento) - hoy) / msInDay);
            let nivel = 'NORMAL';
            if (dias_restantes <= 30) nivel = 'CRITICO';
            else if (dias_restantes <= 60) nivel = 'ADVERTENCIA';

            return {
                lote_id: lt.id,
                numero_lote: lt.numero_lote,
                fecha_vencimiento: lt.fecha_vencimiento,
                dias_restantes,
                nivel,
                producto: {
                    nombre: lt.Producto?.nombre,
                    categoria: lt.Producto?.categoria_id // o el nombre real si hiciste include de Categoria
                }
            };
        });

        data.sort((a, b) => a.dias_restantes - b.dias_restantes);

        return res.json({ data });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    kardexResumen, inventarioDetalle,
    exportarKardexExcel, exportarKardexPdf,
    exportarInventarioExcel, exportarInventarioPdf,
    stockValorizado, reporteCaducidad
};
