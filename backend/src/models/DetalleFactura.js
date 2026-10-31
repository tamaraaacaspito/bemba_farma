const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DetalleFactura = sequelize.define('DetalleFactura', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    factura_id: { type: DataTypes.INTEGER, allowNull: false },
    producto_id: { type: DataTypes.INTEGER, allowNull: false },
    lote_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, {
    tableName: 'detalle_facturas',
    timestamps: false,
    underscored: true
});

module.exports = DetalleFactura;
