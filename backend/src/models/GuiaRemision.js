const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GuiaRemision = sequelize.define('GuiaRemision', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_guia: { type: DataTypes.STRING(50), allowNull: true },
    fecha_emision: { type: DataTypes.DATE, allowNull: true },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    factura_id: { type: DataTypes.INTEGER, allowNull: true },
    // R5: Discrimina entre entrega normal y reposición de faltantes
    // DESPACHO   → guía de entrega estándar (vinculada a una factura)
    // REPOSICION → corrección de unidades faltantes reportadas por el cliente (sin nueva factura)
    tipo_guia: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'DESPACHO',
        validate: { isIn: [['DESPACHO', 'REPOSICION']] }
    }
}, {
    tableName: 'guias_remision',
    timestamps: true,
    createdAt: 'fecha_emision',
    updatedAt: false,
    underscored: true
});

module.exports = GuiaRemision;
