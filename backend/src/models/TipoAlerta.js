const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TipoAlerta = sequelize.define('TipoAlerta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'tipos_alerta',
    timestamps: false,
    underscored: true
});

module.exports = TipoAlerta;
