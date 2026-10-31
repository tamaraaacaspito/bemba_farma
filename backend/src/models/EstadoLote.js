const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EstadoLote = sequelize.define('EstadoLote', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'estados_lote',
    timestamps: false,
    underscored: true
});

module.exports = EstadoLote;
