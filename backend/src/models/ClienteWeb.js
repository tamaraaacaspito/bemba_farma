const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * ClienteWeb — Cuenta de usuario del portal institucional B2B.
 * Separado del modelo "Cliente" interno (que requiere RUC fiscal obligatorio).
 * Un ClienteWeb puede hacer múltiples PedidosWeb vinculados a su cuenta.
 */
const ClienteWeb = sequelize.define('ClienteWeb', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre_completo:  { type: DataTypes.STRING(150), allowNull: false },
    entidad:          { type: DataTypes.STRING(150), allowNull: true },
    ruc_dni:          { type: DataTypes.STRING(20),  allowNull: true },
    email:            { type: DataTypes.STRING(100), allowNull: false, unique: true },
    telefono:         { type: DataTypes.STRING(20),  allowNull: true },
    password_hash:    { type: DataTypes.STRING(255), allowNull: false },
    tipo:             { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'HOSPITAL' },
    activo:           { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
    ultimo_acceso:    { type: DataTypes.DATE,        allowNull: true },
    fecha_registro:   { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'clientes_web',
    timestamps: false,
    underscored: true
});

module.exports = ClienteWeb;

