const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DetalleOrden = sequelize.define('DetalleOrden', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orden_compra_id: { type: DataTypes.INTEGER, allowNull: false },
    producto_id: { type: DataTypes.INTEGER, allowNull: true },
    producto_nombre: { type: DataTypes.STRING(200), allowNull: true },
    cantidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
}, {
    tableName: 'detalle_ordenes',
    timestamps: false,
    underscored: true
});

module.exports = DetalleOrden;
