const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Alerta = sequelize.define('Alerta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    mensaje: { type: DataTypes.STRING(500), allowNull: true },
    producto_id: { type: DataTypes.INTEGER, allowNull: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'alertas',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true
});

module.exports = Alerta;
