const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DetalleGuia = sequelize.define('DetalleGuia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    guia_id: { type: DataTypes.INTEGER, allowNull: false },
    producto_id: { type: DataTypes.INTEGER, allowNull: false },
    lote_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
}, {
    tableName: 'detalle_guias',
    timestamps: false,
    underscored: true
});

module.exports = DetalleGuia;
