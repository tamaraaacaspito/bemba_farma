const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EstadoGuia = sequelize.define('EstadoGuia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'estados_guia',
    timestamps: false,
    underscored: true
});

module.exports = EstadoGuia;
