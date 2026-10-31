/**
 * OrdenesCompra.jsx
 * 
 * FLUJO COMPLETO DE PEDIDO WEB:
 *  NUEVO → (✓ Tomar) → EN_PROCESO → (📦 Despachar) → ATENDIDO
 *                                         ↕
 *                              Modal Despacho:
 *                              - Precios por producto (variables por cliente)
 *                              - Genera salida de Kardex
 *                              - Genera Guía de Remisión
 *                              - Genera Factura
 *                              - Email automático al cliente
 *  EN_PROCESO / NUEVO → (✗ Descartar) → DESCARTADO + Email al cliente
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    ShoppingCart, Globe, Phone, Mail, CheckCircle,
    XCircle, Clock, Building, User, FileText, AlertCircle,
    RefreshCw, Truck, ChevronRight, Package, ArrowRight,
    DollarSign, X, Receipt
} from 'lucide-react';

// ── Badge de estado ─────────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
    const ESTADOS = {
        NUEVO:      { label: 'NUEVA LLEGADA', cls: 'bg-amber-100 text-amber-700 border-amber-200',  Icon: Clock,        dot: 'bg-amber-400' },
        EN_PROCESO: { label: 'EN PROCESO',    cls: 'bg-blue-100 text-blue-700 border-blue-200',     Icon: ArrowRight,   dot: 'bg-blue-400' },
        ATENDIDO:   { label: 'ATENDIDO',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle, dot: 'bg-emerald-400' },
        DESCARTADO: { label: 'DESCARTADO',    cls: 'bg-slate-100 text-slate-500 border-slate-200',  Icon: XCircle,      dot: 'bg-slate-300' },
    };
    const cfg = ESTADOS[estado] || ESTADOS.NUEVO;
    const Icon = cfg.Icon;
    return (
        <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Color de faja lateral por estado ────────────────────────────────────────
const FAJA_COLOR = {
    NUEVO:      'bg-amber-400',
    EN_PROCESO: 'bg-blue-500',
    ATENDIDO:   'bg-emerald-500',
    DESCARTADO: 'bg-slate-300',
};

// ── Modal de Despacho ────────────────────────────────────────────────────────
function ModalDespacho({ pedido, onClose, onDespachado }) {
    const [productos, setProductos] = useState([]);
    const [tipoDoc, setTipoDoc]     = useState('FACTURA');
    const [direccionEntrega, setDireccionEntrega] = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Parsear los productos del carrito cotizado y pre-cargar el precio sugerido.
    // El precio base lo configura el ingeniero de ventas en el producto
    // (Producto.precio_unitario); aquí se muestra como sugerencia EDITABLE por cliente.
    useEffect(() => {
        if (!pedido.productos_cotizados) return;
        let parsed = [];
        try {
            parsed = JSON.parse(pedido.productos_cotizados);
        } catch {
            setProductos([]);
            return;
        }

        // Inicializa con precio vacío; luego lo completamos con el sugerido del catálogo.
        const base = parsed.map(p => ({
            ...p,
            precio_unitario: '',
            lote_id: p.lote_id || null,
            lote_num: p.lote_num || null
        }));
        setProductos(base);

        // Traer los precios sugeridos del catálogo (fijados por el ingeniero de ventas).
        api.get('/productos/catalogo')
            .then(res => {
                const mapa = {};
                (res.data?.data || []).forEach(prod => {
                    if (prod.precio_unitario != null) mapa[prod.id] = String(prod.precio_unitario);
                });
                setProductos(prev => prev.map(p => ({
                    ...p,
                    // Solo sugerimos si el producto tiene precio configurado (> 0)
                    precio_unitario: mapa[p.id] && parseFloat(mapa[p.id]) > 0 ? mapa[p.id] : p.precio_unitario
                })));
            })
            .catch(() => { /* si falla el catálogo, se deja el precio en blanco para ingreso manual */ });
    }, [pedido]);

    const updatePrecio = (idx, val) => {
        setProductos(prev => prev.map((p, i) => i === idx ? { ...p, precio_unitario: val } : p));
    };

    const totalCalculado = productos.reduce((acc, p) => {
        return acc + (parseFloat(p.precio_unitario) || 0) * (p.cantidad || 1);
    }, 0);

    const handleDespachar = async () => {
        setError(null);
        // Validar precios si hay productos en carrito
        if (productos.length > 0) {
            const sinPrecio = productos.some(p => !p.precio_unitario || isNaN(parseFloat(p.precio_unitario)));
            if (sinPrecio) {
                setError('Debes ingresar el precio de venta para cada producto antes de despachar.');
                return;
            }
        }

        setLoading(true);
        try {
            // Despacho consolidado en el backend (transacción única):
            // crea/vincula el Cliente, registra las salidas de kardex (bloqueando
            // lotes vencidos), genera la Factura/Boleta + Guía y marca ATENDIDO.
            await api.post(`/pedidos-web/${pedido.id}/despachar`, {
                tipo_documento: tipoDoc,             // 'FACTURA' | 'BOLETA'
                generar_guia: true,
                productos: productos.map(p => ({
                    producto_id: p.id,
                    cantidad: p.cantidad,
                    precio_unitario: parseFloat(p.precio_unitario),
                    lote_id: p.lote_id
                }))
            });

            onDespachado();
            onClose();
        } catch (e) {
            // El backend devuelve 409 con el detalle del lote vencido/rechazado.
            setError(e.response?.data?.error || ('Error al procesar el despacho: ' + e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'popIn .25s ease' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/70 uppercase tracking-widest font-semibold mb-0.5">Confirmar Despacho</p>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Truck size={20} /> {pedido.nombre_completo}
                        </h2>
                        <p className="text-sm text-white/80 mt-0.5">
                            {pedido.entidad} · #REQ-{String(pedido.id).padStart(4,'0')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span className="whitespace-pre-line">{error}</span>
                        </div>
                    )}

                    {/* Requerimiento */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                            <FileText size={12} /> Requerimiento del cliente
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{pedido.mensaje_requerimiento}</p>
                    </div>

                    {/* Productos con precio variable */}
                    {productos.length > 0 ? (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1">
                                <DollarSign size={12} /> Precios de venta (variables por cliente)
                            </p>
                            <div className="space-y-2">
                                {productos.map((prod, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-800">{prod.nombre}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-400">{prod.cantidad} {prod.unidad}</p>
                                                {prod.lote_num && (
                                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                                                        LOTE: {prod.lote_num}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400 font-semibold">S/</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={prod.precio_unitario}
                                                onChange={e => updatePrecio(idx, e.target.value)}
                                                className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-bold focus:outline-none focus:border-emerald-400"
                                            />
                                            <span className="text-xs text-slate-400">/ und</span>
                                        </div>
                                        <div className="w-20 text-right">
                                            <p className="text-sm font-bold text-emerald-600">
                                                S/ {((parseFloat(prod.precio_unitario) || 0) * prod.cantidad).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-2 border-t border-slate-100">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Total estimado</p>
                                        <p className="text-xl font-bold text-slate-800">S/ {totalCalculado.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                            <Package size={16} className="inline mr-2" />
                            Este pedido no tiene productos del catálogo. Se atenderá como requerimiento general.
                        </div>
                    )}

                    {/* Dirección de entrega */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                            Dirección de entrega (opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Jr. Ejemplo 123, Lima — o dejar vacío si recogen en almacén"
                            value={direccionEntrega}
                            onChange={e => setDireccionEntrega(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                        />
                    </div>

                    {/* Tipo de documento */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                            <Receipt size={12} /> Documento a emitir
                        </label>
                        <div className="flex gap-3">
                            {['FACTURA', 'BOLETA'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTipoDoc(t)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tipoDoc === t
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDespachar}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Truck size={16} />}
                        {loading ? 'Procesando...' : 'Confirmar Despacho'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Drawer de Nueva Orden ──────────────────────────────────────────────────
function DrawerNuevaOrden({ onClose, onSaved }) {
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Formulario
    const [proveedorId, setProveedorId] = useState('');
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
    const [nuevoProd, setNuevoProd] = useState('');
    const [detalles, setDetalles] = useState([]); // { producto_id, producto_nombre, cantidad, precio_unitario }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resProv, resProd] = await Promise.all([
                    api.get('/proveedores'),
                    api.get('/productos', { params: { limit: 500 } })
                ]);
                setProveedores(resProv.data.data || []);
                setProductos(resProd.data.data || []);
            } catch (error) {
                console.error("Error cargando catálogos", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    // Agregar producto por texto libre. Si el texto coincide con un producto del
    // catálogo, se vincula su id; si no, se guarda solo el nombre (cotización).
    const handleAddProdLibre = () => {
        const nombre = nuevoProd.trim();
        if (!nombre) return;
        const match = productos.find(p => (p.nombre || '').toLowerCase() === nombre.toLowerCase());
        setDetalles([...detalles, {
            producto_id: match ? match.id : null,
            producto_nombre: match ? match.nombre : nombre,
            cantidad: 1,
            precio_unitario: ''
        }]);
        setNuevoProd('');
    };

    const updateDetalle = (idx, field, val) => {
        const newDetalles = [...detalles];
        newDetalles[idx][field] = val;
        setDetalles(newDetalles);
    };

    const removeDetalle = (idx) => {
        setDetalles(detalles.filter((_, i) => i !== idx));
    };

    const total = detalles.reduce((acc, d) => acc + (parseFloat(d.precio_unitario) || 0) * (parseInt(d.cantidad) || 0), 0);

    const handleSave = async () => {
        if (!proveedorNombre.trim()) return alert('Indica el proveedor');
        if (detalles.length === 0) return alert('Agrega al menos un producto');

        try {
            setSaving(true);
            // Total opcional: la orden es una cotización al proveedor.
            await api.post('/ordenes', {
                proveedor_nombre: proveedorNombre.trim(),
                fecha_emision: fechaEmision,
                detalles: detalles.map(d => ({
                    producto_id: d.producto_id || null,
                    producto_nombre: d.producto_nombre || d.nombre || null,
                    cantidad: parseInt(d.cantidad),
                    precio_unitario: d.precio_unitario ? parseFloat(d.precio_unitario) : null
                }))
            });
            onSaved();
            onClose();
        } catch (error) {
            alert('Error al guardar: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="bg-emerald-600 text-white p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-emerald-200 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                    <p className="text-[10px] font-bold text-emerald-200 mb-2 uppercase tracking-widest">Abastecimiento</p>
                    <h2 className="text-xl font-bold leading-tight flex items-center gap-2">
                        <ShoppingCart size={22} /> Nueva Orden de Compra
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                    {loadingData ? (
                        <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                            <RefreshCw className="animate-spin mb-2" size={24} /> Cargando catálogos...
                        </div>
                    ) : (
                        <>
                            {/* Proveedor y Fecha */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proveedor</label>
                                    <input
                                        list="lista-proveedores"
                                        value={proveedorNombre}
                                        onChange={e => setProveedorNombre(e.target.value)}
                                        placeholder="Escribe el nombre del proveedor..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                    <datalist id="lista-proveedores">
                                        {proveedores.map(p => <option key={p.id} value={p.razon_social}>{p.ruc}</option>)}
                                    </datalist>
                                    <p className="text-[11px] text-slate-400 mt-1">Texto libre. Si más adelante registras proveedores, aparecerán como sugerencias.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Emisión</label>
                                    <input 
                                        type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Agregar Productos (texto libre) */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agregar Productos</label>
                                <div className="flex gap-2">
                                    <input
                                        list="lista-productos-oc"
                                        type="text"
                                        placeholder="Escribe el producto y presiona Agregar..."
                                        value={nuevoProd}
                                        onChange={e => setNuevoProd(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProdLibre(); } }}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                                    />
                                    <button type="button" onClick={handleAddProdLibre}
                                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                                        Agregar
                                    </button>
                                </div>
                                <datalist id="lista-productos-oc">
                                    {productos.map(p => <option key={p.id} value={p.nombre}>{p.codigo}</option>)}
                                </datalist>
                                <p className="text-[11px] text-slate-400 mt-1">Texto libre; si coincide con un producto del catálogo se vincula automáticamente.</p>
                            </div>

                            {/* Lista de Detalles */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle de la Orden ({detalles.length})</p>
                                {detalles.map((d, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm relative group flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 mb-2 truncate pr-6">{d.producto_nombre || d.nombre}</p>
                                            <div className="flex gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Cant.</label>
                                                    <input type="number" min="1" value={d.cantidad} onChange={e => updateDetalle(i, 'cantidad', e.target.value)} className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm block" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Precio Unit. (S/)</label>
                                                    <input type="number" step="0.01" min="0" value={d.precio_unitario} onChange={e => updateDetalle(i, 'precio_unitario', e.target.value)} className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm block" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 mb-1">Subtotal</p>
                                            <p className="text-sm font-bold text-emerald-600">S/ {((parseFloat(d.precio_unitario)||0) * (parseInt(d.cantidad)||0)).toFixed(2)}</p>
                                        </div>
                                        <button onClick={() => removeDetalle(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-full"><XCircle size={18}/></button>
                                    </div>
                                ))}
                                {detalles.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">Agrega productos a la orden.</div>}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase">Total Estimado</span>
                        <span className="text-2xl font-black text-emerald-600">S/ {total.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handleSave} disabled={saving || loadingData}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />} {saving ? 'Guardando...' : 'Generar Orden'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function OrdenesCompra() {
    const [activeTab, setActiveTab]       = useState(1);
    const [pedidosWeb, setPedidosWeb]     = useState([]);
    const [ordenes, setOrdenes]           = useState([]);
    const [loading, setLoading]           = useState(false);
    const [toast, setToast]               = useState(null);
    const [pedidoDespacho, setPedidoDespacho] = useState(null); // pedido seleccionado para modal
    const [drawerNuevaOrden, setDrawerNuevaOrden] = useState(false); // Modal drawer nueva orden

    const showToast = (mensaje, tipo = 'success') => {
        setToast({ mensaje, tipo });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchPedidosWeb = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/pedidos-web');
            setPedidosWeb(data.data || []);
        } catch {
            showToast('Error cargando los requerimientos web', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/ordenes');
            setOrdenes(data.data || []);
        } catch {
            showToast('Error cargando Órdenes a Proveedores', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 1) fetchPedidosWeb();
        else fetchOrdenes();
    }, [activeTab]);

    const cambiarEstado = async (id, nuevoEstado) => {
        try {
            await api.put(`/pedidos-web/${id}/estado`, { estado: nuevoEstado });
            showToast(
                nuevoEstado === 'EN_PROCESO'
                    ? '✅ Pedido tomado — ahora está EN PROCESO'
                    : nuevoEstado === 'DESCARTADO'
                    ? '🚫 Pedido descartado. Se notificó al cliente.'
                    : `Pedido actualizado: ${nuevoEstado}`
            );
            fetchPedidosWeb();
        } catch {
            showToast('Error al actualizar el estado', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans relative">
            <style>{`
                @keyframes popIn { from { transform: scale(.94) translateY(16px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
            `}</style>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 w-96 border ${toast.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {toast.tipo === 'success'
                        ? <CheckCircle size={24} className="text-emerald-500 flex-shrink-0" />
                        : <AlertCircle size={24} className="text-rose-500 flex-shrink-0" />}
                    <p className="text-sm font-medium leading-tight">{toast.mensaje}</p>
                </div>
            )}

            {/* Modal de Despacho */}
            {pedidoDespacho && (
                <ModalDespacho
                    pedido={pedidoDespacho}
                    onClose={() => setPedidoDespacho(null)}
                    onDespachado={() => {
                        fetchPedidosWeb();
                        showToast('🚚 ¡Pedido despachado correctamente! Se notificó al cliente por email.');
                    }}
                />
            )}

            {/* Drawer Nueva Orden */}
            {drawerNuevaOrden && (
                <DrawerNuevaOrden 
                    onClose={() => setDrawerNuevaOrden(false)}
                    onSaved={() => {
                        fetchOrdenes();
                        showToast('✅ Orden de compra generada correctamente');
                    }}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Cabecera + tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Órdenes y Requerimientos</h1>
                        <p className="text-sm text-slate-500 mt-1">Gestión de abastecimiento a laboratorios y solicitudes comerciales web.</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab(1)}
                            className={`px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all ${activeTab === 1 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Globe size={18} /> Pedidos Web
                        </button>
                        <button
                            onClick={() => setActiveTab(2)}
                            className={`px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all ${activeTab === 2 ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShoppingCart size={18} /> Órdenes Proveedor
                        </button>
                    </div>
                </div>

                {/* ── TAB 1: PEDIDOS WEB ──────────────────────────────────────── */}
                {activeTab === 1 && (
                    <div>
                        {/* Leyenda de flujo */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 flex-wrap">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full font-bold border border-amber-200">🔔 NUEVA LLEGADA</span>
                            <ChevronRight size={14} />
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-bold border border-blue-200">🔄 EN PROCESO</span>
                            <ChevronRight size={14} />
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">✅ ATENDIDO</span>
                            <span className="ml-2 text-slate-300">|</span>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold border border-slate-200">✗ DESCARTADO</span>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Bandeja de Cotizaciones Web</h2>
                            <button onClick={fetchPedidosWeb} className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all">
                                <RefreshCw size={16} /> Refrescar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {loading ? (
                                <div className="col-span-full py-12 text-center text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                                    Cargando requerimientos de clientes...
                                </div>
                            ) : pedidosWeb.length === 0 ? (
                                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                                    <Globe className="mx-auto mb-4 text-slate-300" size={48} />
                                    <h3 className="text-lg font-semibold text-slate-700">Sin pedidos registrados</h3>
                                    <p className="text-slate-500 text-sm mt-1">Los pedidos web llegarán aquí cuando los clientes envíen cotizaciones.</p>
                                </div>
                            ) : (
                                pedidosWeb.map(pedido => (
                                    <div key={pedido.id}
                                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                                    >
                                        {/* Faja lateral de color por estado */}
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${FAJA_COLOR[pedido.estado] || 'bg-slate-200'}`} />

                                        {/* Cabecera tarjeta */}
                                        <div className="flex justify-between items-start mb-4 pl-2">
                                            <div>
                                                <EstadoBadge estado={pedido.estado} />
                                                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(pedido.fecha_recepcion).toLocaleString('es-PE')}
                                                </p>
                                            </div>

                                            {/* Botones de acción según estado */}
                                            <div className="flex gap-2">
                                                {/* NUEVO → tomar → EN_PROCESO */}
                                                {pedido.estado === 'NUEVO' && (
                                                    <>
                                                        <button
                                                            onClick={() => cambiarEstado(pedido.id, 'EN_PROCESO')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                                            title="Tomar pedido y poner EN PROCESO"
                                                        >
                                                            <CheckCircle size={14} /> Tomar
                                                        </button>
                                                        <button
                                                            onClick={() => cambiarEstado(pedido.id, 'DESCARTADO')}
                                                            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                                            title="Descartar"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                {/* EN_PROCESO → despachar → ATENDIDO */}
                                                {pedido.estado === 'EN_PROCESO' && (
                                                    <>
                                                        <button
                                                            onClick={() => setPedidoDespacho(pedido)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow"
                                                            title="Abrir modal de despacho"
                                                        >
                                                            <Truck size={14} /> Despachar
                                                        </button>
                                                        <button
                                                            onClick={() => cambiarEstado(pedido.id, 'DESCARTADO')}
                                                            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                                            title="Descartar"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Datos del cliente */}
                                        <div className="space-y-4 pl-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    <User size={18} className="text-indigo-400" /> {pedido.nombre_completo}
                                                </h3>
                                                {pedido.entidad && (
                                                    <p className="text-sm font-medium text-slate-600 flex items-center gap-2 mt-1">
                                                        <Building size={16} className="text-slate-400" /> {pedido.entidad}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <a href={`mailto:${pedido.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                                    <Mail size={13} /> {pedido.email}
                                                </a>
                                                {pedido.telefono && (
                                                    <a href={`tel:${pedido.telefono}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                                        <Phone size={13} /> {pedido.telefono}
                                                    </a>
                                                )}
                                            </div>

                                            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-50">
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                    <FileText size={15} className="inline mr-1.5 text-indigo-400 mb-0.5" />
                                                    {pedido.mensaje_requerimiento}
                                                </p>
                                            </div>

                                            {/* Nota de despacho si ya está atendido */}
                                            {pedido.estado === 'ATENDIDO' && (
                                                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                                                    <Truck size={14} /> Pedido despachado · Cliente notificado por email
                                                </div>
                                            )}
                                            {pedido.estado === 'DESCARTADO' && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                    <XCircle size={14} /> Pedido descartado · Cliente notificado por email
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB 2: ÓRDENES PROVEEDOR ──────────────────────────────── */}
                {activeTab === 2 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ShoppingCart size={24} className="text-emerald-600" /> Órdenes a Proveedores
                            </h2>
                            <button onClick={() => setDrawerNuevaOrden(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 hover:shadow transition-all focus:ring-4 focus:ring-emerald-100 flex items-center gap-2">
                                <ShoppingCart size={16} /> Nueva Orden
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">N° Orden</th>
                                        <th className="px-6 py-4 font-semibold">Laboratorio / Proveedor</th>
                                        <th className="px-6 py-4 font-semibold">Fecha Emisión</th>
                                        <th className="px-6 py-4 font-semibold text-right">Total</th>
                                        <th className="px-6 py-4 font-semibold text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Cargando órdenes...</td></tr>
                                    ) : ordenes.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-16 text-center">
                                            <ShoppingCart size={48} className="mx-auto mb-4 text-slate-300" />
                                            <p className="font-semibold text-slate-600">No hay órdenes de compra emitidas.</p>
                                        </td></tr>
                                    ) : ordenes.map(oc => (
                                        <tr key={oc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-emerald-600">{oc.numero_orden || `OC-000${oc.id}`}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-800">{oc.Proveedor?.razon_social}</span>
                                                <span className="block text-xs text-slate-400">RUC: {oc.Proveedor?.ruc}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{new Date(oc.fecha_emision).toLocaleDateString('es-PE')}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 text-right">S/ {Number(oc.total || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                                                    {oc.EstadoOrden?.nombre || 'EMITIDO'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
