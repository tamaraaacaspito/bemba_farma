const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EstadoFactura = sequelize.define('EstadoFactura', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'estados_factura',
    timestamps: false,
    underscored: true
});

module.exports = EstadoFactura;
