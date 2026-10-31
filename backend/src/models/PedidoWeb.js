const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PedidoWeb = sequelize.define('PedidoWeb', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre_completo: { type: DataTypes.STRING(150), allowNull: false },
    entidad: { type: DataTypes.STRING(150), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: false },
    telefono: { type: DataTypes.STRING(20), allowNull: false },
    mensaje_requerimiento: { type: DataTypes.TEXT, allowNull: false },
    fecha_recepcion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    cliente_web_id: { type: DataTypes.INTEGER, allowNull: true },
    productos_cotizados: { type: DataTypes.TEXT, allowNull: true }, // JSON con [{id, nombre, cantidad}]
    estado: { 
        type: DataTypes.ENUM('NUEVO', 'EN_PROCESO', 'ATENDIDO', 'DESCARTADO'), 
        allowNull: false, 
        defaultValue: 'NUEVO' 
    },
}, {
    tableName: 'pedidos_web',
    timestamps: true,
    createdAt: 'fecha_recepcion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

module.exports = PedidoWeb;
