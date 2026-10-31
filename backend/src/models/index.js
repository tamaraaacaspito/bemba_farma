'use strict';
const { sequelize, conectarDB } = require('../config/db');

const Rol = require('./Rol');
const TipoMovimiento = require('./TipoMovimiento');
const EstadoOrden = require('./EstadoOrden');
const EstadoFactura = require('./EstadoFactura');
const EstadoGuia = require('./EstadoGuia');
const EstadoLote = require('./EstadoLote');
const TipoAlerta = require('./TipoAlerta');
const Categoria = require('./Categoria');
const Usuario = require('./Usuario');
const Producto = require('./Producto');
const Proveedor = require('./Proveedor');
const Cliente = require('./Cliente');
const LoteProduccion = require('./LoteProduccion');
const MovimientoKardex = require('./MovimientoKardex');
const OrdenCompra = require('./OrdenCompra');
const DetalleOrden = require('./DetalleOrden');
const Factura = require('./Factura');
const DetalleFactura = require('./DetalleFactura');
const GuiaRemision = require('./GuiaRemision');
const DetalleGuia = require('./DetalleGuia');
const Documento = require('./Documento');
const Alerta = require('./Alerta');
const LogError = require('./LogError');
const PedidoWeb = require('./PedidoWeb');
const ClienteWeb = require('./ClienteWeb');

// ASOCIACIONES
Rol.hasMany(Usuario, { foreignKey: 'rol_id' });
Usuario.belongsTo(Rol, { foreignKey: 'rol_id' });

Categoria.hasMany(Producto, { foreignKey: 'categoria_id' });
Producto.belongsTo(Categoria, { as: 'Categoria', foreignKey: 'categoria_id' });

Producto.hasMany(LoteProduccion, { foreignKey: 'producto_id' });
LoteProduccion.belongsTo(Producto, { foreignKey: 'producto_id' });
EstadoLote.hasMany(LoteProduccion, { foreignKey: 'estado_id' });
LoteProduccion.belongsTo(EstadoLote, { foreignKey: 'estado_id' });
Usuario.hasMany(LoteProduccion, { foreignKey: 'registrado_por' });
LoteProduccion.belongsTo(Usuario, { foreignKey: 'registrado_por' });

Producto.hasMany(MovimientoKardex, { foreignKey: 'producto_id', onDelete: 'NO ACTION' });
MovimientoKardex.belongsTo(Producto, { foreignKey: 'producto_id' });
Usuario.hasMany(MovimientoKardex, { foreignKey: 'usuario_id', onDelete: 'NO ACTION' });
MovimientoKardex.belongsTo(Usuario, { foreignKey: 'usuario_id' });
TipoMovimiento.hasMany(MovimientoKardex, { foreignKey: 'tipo_movimiento_id', onDelete: 'NO ACTION' });
MovimientoKardex.belongsTo(TipoMovimiento, { foreignKey: 'tipo_movimiento_id' });
LoteProduccion.hasMany(MovimientoKardex, { foreignKey: 'lote_id', onDelete: 'NO ACTION' });
MovimientoKardex.belongsTo(LoteProduccion, { foreignKey: 'lote_id' });

Proveedor.hasMany(OrdenCompra, { foreignKey: 'proveedor_id' });
OrdenCompra.belongsTo(Proveedor, { foreignKey: 'proveedor_id' });
Usuario.hasMany(OrdenCompra, { foreignKey: 'usuario_id' });
OrdenCompra.belongsTo(Usuario, { foreignKey: 'usuario_id' });
EstadoOrden.hasMany(OrdenCompra, { foreignKey: 'estado_id' });
OrdenCompra.belongsTo(EstadoOrden, { foreignKey: 'estado_id' });

OrdenCompra.hasMany(DetalleOrden, { foreignKey: 'orden_compra_id', onDelete: 'CASCADE' });
DetalleOrden.belongsTo(OrdenCompra, { foreignKey: 'orden_compra_id' });
Producto.hasMany(DetalleOrden, { foreignKey: 'producto_id' });
DetalleOrden.belongsTo(Producto, { foreignKey: 'producto_id' });

Cliente.hasMany(Factura, { foreignKey: 'cliente_id' });
Factura.belongsTo(Cliente, { foreignKey: 'cliente_id' });
Usuario.hasMany(Factura, { foreignKey: 'usuario_id' });
Factura.belongsTo(Usuario, { foreignKey: 'usuario_id' });
EstadoFactura.hasMany(Factura, { foreignKey: 'estado_id' });
Factura.belongsTo(EstadoFactura, { foreignKey: 'estado_id' });

Factura.hasMany(DetalleFactura, { foreignKey: 'factura_id', onDelete: 'CASCADE' });
DetalleFactura.belongsTo(Factura, { foreignKey: 'factura_id' });
Producto.hasMany(DetalleFactura, { foreignKey: 'producto_id', onDelete: 'NO ACTION' });
DetalleFactura.belongsTo(Producto, { foreignKey: 'producto_id' });
LoteProduccion.hasMany(DetalleFactura, { foreignKey: 'lote_id', onDelete: 'NO ACTION' });
DetalleFactura.belongsTo(LoteProduccion, { foreignKey: 'lote_id' });

Cliente.hasMany(GuiaRemision, { foreignKey: 'cliente_id' });
GuiaRemision.belongsTo(Cliente, { foreignKey: 'cliente_id' });
Usuario.hasMany(GuiaRemision, { foreignKey: 'usuario_id' });
GuiaRemision.belongsTo(Usuario, { foreignKey: 'usuario_id' });
EstadoGuia.hasMany(GuiaRemision, { foreignKey: 'estado_id' });
GuiaRemision.belongsTo(EstadoGuia, { foreignKey: 'estado_id' });
Factura.hasMany(GuiaRemision, { foreignKey: 'factura_id', onDelete: 'NO ACTION' });
GuiaRemision.belongsTo(Factura, { foreignKey: 'factura_id' });

GuiaRemision.hasMany(DetalleGuia, { foreignKey: 'guia_id', onDelete: 'CASCADE' });
DetalleGuia.belongsTo(GuiaRemision, { foreignKey: 'guia_id' });
Producto.hasMany(DetalleGuia, { foreignKey: 'producto_id', onDelete: 'NO ACTION' });
DetalleGuia.belongsTo(Producto, { foreignKey: 'producto_id' });
LoteProduccion.hasMany(DetalleGuia, { foreignKey: 'lote_id', onDelete: 'NO ACTION' });
DetalleGuia.belongsTo(LoteProduccion, { foreignKey: 'lote_id' });

Cliente.hasMany(Documento, { foreignKey: 'cliente_id' });
Documento.belongsTo(Cliente, { foreignKey: 'cliente_id' });
Usuario.hasMany(Documento, { foreignKey: 'usuario_id' });
Documento.belongsTo(Usuario, { foreignKey: 'usuario_id' });

TipoAlerta.hasMany(Alerta, { foreignKey: 'tipo_id' });
Alerta.belongsTo(TipoAlerta, { foreignKey: 'tipo_id' });
Producto.hasMany(Alerta, { foreignKey: 'producto_id' });
Alerta.belongsTo(Producto, { foreignKey: 'producto_id' });
Usuario.hasMany(Alerta, { foreignKey: 'usuario_id' });
Alerta.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// ClienteWeb → PedidoWeb
ClienteWeb.hasMany(PedidoWeb, { foreignKey: 'cliente_web_id', onDelete: 'SET NULL' });
PedidoWeb.belongsTo(ClienteWeb, { foreignKey: 'cliente_web_id', as: 'ClienteWeb' });

const sincronizarModelos = async () => {
    try {
        await sequelize.authenticate();
        // Sincronizar esquemas primero (CREATE TABLE IF NOT EXISTS)
        await sequelize.sync(); // alter: true crashea en SQL Server con UNIQUE constraints
        console.log('✅ Conexión a DB verificada en modelos. Esquema sincronizado.');
    } catch (error) {
        console.error('❌ Error crítico sincronizando BD:', error.message);
        throw error;
    }
};

module.exports = {
    sequelize,
    conectarDB,
    sincronizarModelos,
    Rol, TipoMovimiento, EstadoOrden, EstadoFactura, EstadoGuia, EstadoLote, TipoAlerta, Categoria,
    Usuario, Producto, Proveedor, Cliente, LoteProduccion, MovimientoKardex, OrdenCompra, DetalleOrden,
    Factura, DetalleFactura, GuiaRemision, DetalleGuia, Documento, Alerta, LogError, PedidoWeb, ClienteWeb
};
