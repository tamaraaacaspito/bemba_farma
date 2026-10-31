'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LogError = sequelize.define('LogError', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    guia: { type: DataTypes.STRING(50) },
    codigo_producto: { type: DataTypes.STRING(20) },
    lote: { type: DataTypes.STRING(50) },
    motivo: { type: DataTypes.STRING(255) },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: 'log_errores',
    timestamps: false
});

module.exports = LogError;
