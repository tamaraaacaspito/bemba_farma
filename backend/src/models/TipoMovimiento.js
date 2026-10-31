const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TipoMovimiento = sequelize.define('TipoMovimiento', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
    tableName: 'tipos_movimiento',
    timestamps: false,
    underscored: true
});

module.exports = TipoMovimiento;
