const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrdenCompra = sequelize.define('OrdenCompra', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    proveedor_id: { type: DataTypes.INTEGER, allowNull: true },
    proveedor_nombre: { type: DataTypes.STRING(200), allowNull: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_orden: { type: DataTypes.STRING(50), unique: true, allowNull: true },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha_emision: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: true }
}, {
    tableName: 'ordenes_compra',
    timestamps: true,
    createdAt: 'fecha_emision',
    updatedAt: false,
    underscored: true
});

module.exports = OrdenCompra;
