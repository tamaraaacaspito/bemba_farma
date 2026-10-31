const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Cliente = sequelize.define('Cliente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ruc: { type: DataTypes.STRING(11), unique: true, allowNull: false },
    razon_social: { type: DataTypes.STRING(200), allowNull: false },
    tipo_entidad: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'PUBLICA' },
    direccion: { type: DataTypes.STRING(255), allowNull: true },
    telefono: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true }
}, {
    tableName: 'clientes',
    timestamps: false,
    underscored: true
});

module.exports = Cliente;
