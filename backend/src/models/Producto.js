const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Producto = sequelize.define('Producto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    categoria_id: { type: DataTypes.INTEGER, allowNull: false },
    unidad_medida: { type: DataTypes.STRING(20), allowNull: true },
    stock_actual: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            isStockPositivo(val) {
                if (val < 0) throw new Error('Stock no puede ser negativo');
            }
        }
    },
    stock_minimo: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: 'productos',
    timestamps: false,
    underscored: true
});

module.exports = Producto;
