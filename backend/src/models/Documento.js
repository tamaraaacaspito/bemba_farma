const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Documento = sequelize.define('Documento', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_doc: { type: DataTypes.STRING(50), allowNull: false },
    numero_doc: { type: DataTypes.STRING(50), allowNull: true },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    cliente_id: { type: DataTypes.INTEGER, allowNull: true },
    blob_url: { type: DataTypes.STRING(500), allowNull: true },
    estado: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ACTIVO' },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'documentos',
    timestamps: true,
    createdAt: 'fecha',
    updatedAt: false,
    underscored: true
});

module.exports = Documento;
