const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EstadoOrden = sequelize.define('EstadoOrden', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'estados_orden',
    timestamps: false,
    underscored: true
});

module.exports = EstadoOrden;
