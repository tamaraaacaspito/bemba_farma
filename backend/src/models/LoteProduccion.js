const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LoteProduccion = sequelize.define('LoteProduccion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    producto_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_lote: { type: DataTypes.STRING(50), unique: true, allowNull: true },
    cantidad_producida: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha_produccion: { type: DataTypes.DATE, allowNull: true },
    fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'lotes_produccion',
    timestamps: true,
    createdAt: 'fecha_produccion',
    updatedAt: false,
    underscored: true
});

module.exports = LoteProduccion;
