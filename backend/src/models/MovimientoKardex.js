const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MovimientoKardex = sequelize.define('MovimientoKardex', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    producto_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_movimiento_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isCantidadPositiva(val) {
                if (val <= 0) throw new Error('Cantidad debe ser mayor a 0');
            }
        }
    },
    stock_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock_nuevo: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    referencia_tipo: {
        type: DataTypes.ENUM(
            'FACTURA', 'GUIA', 'PRODUCCION', 'ORDEN', 'AJUSTE',
            // R5-B: Canje (producto defectuoso) → entrada del defectuoso / salida del reemplazo
            'CANJE',
            // R5-A: Reposición → salida por unidades faltantes reportadas (sin nueva factura)
            'REPOSICION',
            'MUESTRA', 'OTRO', 'PEDIDO_WEB'
            // NOTA: 'DEVOLUCION' eliminado — EKA S.A.C. no maneja devoluciones clásicas
        ),
        allowNull: true
    },
    referencia_id: { type: DataTypes.INTEGER, allowNull: true },
    lote_id: { type: DataTypes.INTEGER, allowNull: true },
    motivo: { type: DataTypes.STRING(255), allowNull: true },
    fecha_movimiento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'movimientos_kardex',
    timestamps: true,
    createdAt: 'fecha_movimiento',
    updatedAt: false,
    underscored: true
});

module.exports = MovimientoKardex;
