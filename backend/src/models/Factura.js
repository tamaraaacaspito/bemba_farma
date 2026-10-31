const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Factura = sequelize.define('Factura', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_factura: { type: DataTypes.STRING(50), unique: true, allowNull: true },
    tipo_documento: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FACTURA', validate: { isIn: [['FACTURA', 'BOLETA']] } },
    fecha_emision: { type: DataTypes.DATE, allowNull: true },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    estado_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'facturas',
    timestamps: true,
    createdAt: 'fecha_emision',
    updatedAt: false,
    underscored: true
});

module.exports = Factura;
