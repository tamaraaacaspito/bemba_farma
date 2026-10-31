/**
 * src/pages/Documentos.jsx
 * Módulo central de documentos operativos:
 *   Tab 1 â€” Facturas (ventas a clientes)
 *   Tab 2 â€” GuÃ­as de Remisión (despacho / reposición)
 *   Tab 3 â€” Archivos adjuntos
 *
 * Reglas de negocio aplicadas:
 *   R1  â€” precio_unitario ingresado manualmente por transacciÃ³n
 *   R3  â€” una guÃ­a puede tener múltiples lotes (multi-lÃ­nea)
 *   R5A â€” guÃ­as de tipo REPOSICION no requieren factura vinculada
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    FileText, Truck, Paperclip, Plus, Search, X,
    ChevronLeft, ChevronRight, Eye, Ban, RefreshCw,
    Package, Trash2, AlertTriangle, CheckCircle,
    Clock, DollarSign, Hash, Calendar, User
} from 'lucide-react';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const formatFecha = (d) =>
    d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”';

const formatSoles = (v) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(v) || 0);

const BADGE_FACTURA = {
    BORRADOR:  'bg-slate-100  text-slate-600',
    EMITIDA:   'bg-blue-100   text-blue-700',
    PAGADA:    'bg-emerald-100 text-emerald-700',
    ANULADA:   'bg-red-100    text-red-600',
};

const BADGE_GUIA = {
    PENDIENTE:    'bg-amber-100  text-amber-700',
    EN_TRANSITO:  'bg-blue-100   text-blue-700',
    ENTREGADA:    'bg-emerald-100 text-emerald-700',
    ANULADA:      'bg-red-100    text-red-600',
};

function StatusBadge({ estado, map }) {
    const cls = map[estado] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {estado}
        </span>
    );
}

// â”€â”€ LÃ­nea de detalle (producto + lote + cantidad + precio) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LineaDetalle({ index, línea, productos, onChange, onRemove }) {
    const [lotes, setLotes] = useState([]);

    useEffect(() => {
        if (línea.producto_id) {
            api.get(`/productos/${línea.producto_id}/lotes`)
                .then(r => setLotes(r.data || []))
                .catch(() => setLotes([]));
        } else {
            setLotes([]);
        }
    }, [línea.producto_id]);

    const set = (k, v) => onChange(index, { ...línea, [k]: v });

    return (
        <div className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
            {/* Producto */}
            <div className="col-span-4">
                {index === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Producto</p>}
                <select
                    required
                    value={línea.producto_id}
                    onChange={e => set('producto_id', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">Seleccionar...</option>
                    {productos.map(p => (
                        <option key={p.id} value={p.id}>[{p.codigo}] {p.nombre}</option>
                    ))}
                </select>
            </div>
            {/* Lote */}
            <div className="col-span-3">
                {index === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lote *</p>}
                <select
                    required
                    value={línea.lote_id}
                    onChange={e => set('lote_id', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={!línea.producto_id}
                >
                    <option value="">Seleccionar lote...</option>
                    {lotes.filter(l => Number(l.stock_actual ?? l.cantidad_producida) > 0).map(l => (
                        <option key={l.id} value={l.id}>
                            {l.numero_lote || l.codigo_lote} Â· Stock: {Number(l.stock_actual ?? l.cantidad_producida).toFixed(2)}
                        </option>
                    ))}
                </select>
            </div>
            {/* Cantidad */}
            <div className="col-span-2">
                {index === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cant.</p>}
                <input
                    required type="number" min="0.01" step="0.01"
                    value={línea.cantidad}
                    onChange={e => set('cantidad', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                />
            </div>
            {/* Precio unitario */}
            <div className="col-span-2">
                {index === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">P. Unit. (S/.)</p>}
                <input
                    type="number" min="0" step="0.01"
                    value={línea.precio_unitario}
                    onChange={e => set('precio_unitario', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0.00"
                />
            </div>
            {/* Eliminar lÃ­nea */}
            <div className={`col-span-1 flex ${index === 0 ? 'mt-5' : ''} justify-center`}>
                <button type="button" onClick={() => onRemove(index)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

const LINE_EMPTY = { producto_id: '', lote_id: '', cantidad: '', precio_unitario: '' };

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 1 â€” FACTURAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TabFacturas() {
    const { isAdmin } = useAuth();
    const [facturas, setFacturas]     = useState([]);
    const [loading, setLoading]       = useState(false);
    const [page, setPage]             = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda]     = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    // Modal nueva factura
    const [showModal, setShowModal]   = useState(false);
    const [clientes, setClientes]     = useState([]);
    const [productos, setProductos]   = useState([]);
    const [guardando, setGuardando]   = useState(false);
    const [form, setForm]             = useState({
        cliente_id: '', tipo_documento: 'FACTURA', numero_factura: '', fecha_emision: new Date().toISOString().split('T')[0],
        observaciones: ''
    });
    const [filtroTipoDoc, setFiltroTipoDoc] = useState('');
    const [líneas, setLíneas]         = useState([{ ...LINE_EMPTY }]);

    // Modal detalle
    const [detalle, setDetalle]       = useState(null);

    const fetchFacturas = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/facturas', {
                params: { page, limit: 12, busqueda, estado: filtroEstado || undefined, tipo_documento: filtroTipoDoc || undefined }
            }).catch(() => ({ data: { data: [], totalPages: 1 } }));
            setFacturas(data.data || []);
            setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    }, [page, busqueda, filtroEstado, filtroTipoDoc]);

    useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

    const abrirModal = async () => {
        const [cl, pr] = await Promise.all([
            api.get('/clientes', { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
            api.get('/productos', { params: { limit: 500, estado: 1 } }).catch(() => ({ data: { data: [] } })),
        ]);
        setClientes(cl.data?.data || cl.data || []);
        setProductos(pr.data?.data || []);
        setForm({ cliente_id: '', tipo_documento: 'FACTURA', numero_factura: '', fecha_emision: new Date().toISOString().split('T')[0], observaciones: '' });
        setLíneas([{ ...LINE_EMPTY }]);
        setShowModal(true);
    };

    const handleLinea = (i, val) => setLíneas(ls => ls.map((l, idx) => idx === i ? val : l));
    const addLinea    = () => setLíneas(ls => [...ls, { ...LINE_EMPTY }]);
    const removeLinea = (i) => { if (líneas.length > 1) setLíneas(ls => ls.filter((_, idx) => idx !== i)); };

    const totalFactura = líneas.reduce((s, l) =>
        s + (Number(l.cantidad) * Number(l.precio_unitario) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (líneas.some(l => !l.producto_id || !l.lote_id || !l.cantidad)) {
            return toast.error('Completa todas las lÃ­neas: producto, lote y cantidad son obligatorios.');
        }
        setGuardando(true);
        try {
            await api.post('/facturas', {
                ...form,
                detalles: líneas.map(l => ({
                    producto_id:    Number(l.producto_id),
                    lote_id:        Number(l.lote_id),
                    cantidad:       Number(l.cantidad),
                    precio_unitario: l.precio_unitario !== '' ? Number(l.precio_unitario) : null,
                }))
            });
            toast.success('Factura creada correctamente');
            setShowModal(false);
            fetchFacturas();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al crear la factura');
        } finally { setGuardando(false); }
    };

    const handleAnular = async (fac) => {
        try {
            await api.patch(`/facturas/${fac.id}/anular`, { motivo: 'Anulada por usuario' });
            toast.success('Factura anulada');
            fetchFacturas();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al anular');
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" placeholder="Buscar por NÂ° factura o cliente..."
                            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filtroTipoDoc} onChange={e => { setFiltroTipoDoc(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 min-w-[130px]"
                    >
                        <option value="">Factura y Boleta</option>
                        <option value="FACTURA">Solo Facturas</option>
                        <option value="BOLETA">Solo Boletas</option>
                    </select>
                    <select
                        value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 min-w-[140px]"
                    >
                        <option value="">Todos los estados</option>
                        <option value="BORRADOR">Borrador</option>
                        <option value="EMITIDA">Emitida</option>
                        <option value="PAGADA">Pagada</option>
                        <option value="ANULADA">Anulada</option>
                    </select>
                    <button onClick={fetchFacturas} className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-xl bg-white">
                        <RefreshCw size={16} />
                    </button>
                </div>
                {isAdmin() && (
                    <button onClick={abrirModal}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap">
                        <Plus size={16} /> Nueva Factura
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">NÂ° Documento</th>
                                <th className="px-5 py-3.5 font-semibold">Tipo</th>
                                <th className="px-5 py-3.5 font-semibold">Cliente</th>
                                <th className="px-5 py-3.5 font-semibold">Fecha</th>
                                <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                                <th className="px-5 py-3.5 font-semibold text-center">Estado</th>
                                <th className="px-5 py-3.5 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw size={20} className="animate-spin text-indigo-400" />
                                        <span className="text-sm">Cargando facturas...</span>
                                    </div>
                                </td></tr>
                            ) : facturas.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <FileText size={40} className="opacity-30" />
                                        <div>
                                            <p className="font-semibold text-slate-500">No hay facturas registradas</p>
                                            <p className="text-xs mt-1">Crea la primera factura con el botón "Nueva Factura".</p>
                                        </div>
                                    </div>
                                </td></tr>
                            ) : facturas.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <span className="font-mono font-bold text-indigo-600 text-xs">{f.numero_factura || `${(f.tipo_documento || 'FAC').slice(0,3)}-${String(f.id).padStart(5, '0')}`}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${f.tipo_documento === 'BOLETA' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {f.tipo_documento || 'FACTURA'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-slate-800">{f.Cliente?.razon_social || f.Cliente?.nombre || 'â€”'}</p>
                                        <p className="text-[11px] text-slate-400">{f.Cliente?.ruc || ''}</p>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatFecha(f.fecha_emision)}</td>
                                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">{formatSoles(f.total || 0)}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <StatusBadge estado={f.estado || 'BORRADOR'} map={BADGE_FACTURA} />
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setDetalle({ tipo: 'factura', data: f })}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalle">
                                                <Eye size={15} />
                                            </button>
                                            {isAdmin() && f.estado !== 'ANULADA' && (
                                                <button onClick={() => handleAnular(f)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Anular">
                                                    <Ban size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* PáginaciÃ³n */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">PÃ¡gina <b>{page}</b> de <b>{totalPages}</b></span>
                    <div className="flex gap-1.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"><ChevronLeft size={15} /></button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"><ChevronRight size={15} /></button>
                    </div>
                </div>
            </div>

            {/* â”€â”€ MODAL NUEVA FACTURA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 mb-10">
                        {/* Header modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <FileText size={18} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Nueva Factura</h2>
                                    <p className="text-xs text-slate-400">Los precios son ingresados manualmente (R1)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Datos cabecera */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        <Hash size={12} className="inline mr-1" />NÂ° Factura
                                    </label>
                                    <input
                                        type="text" value={form.numero_factura}
                                        onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="FAC-001 (opcional)"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        <Calendar size={12} className="inline mr-1" />Fecha Emisión
                                    </label>
                                    <input
                                        type="date" required value={form.fecha_emision}
                                        onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        <User size={12} className="inline mr-1" />Cliente
                                    </label>
                                    <select
                                        value={form.cliente_id}
                                        onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="">Seleccionar cliente...</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.id}>{c.razon_social || c.nombre} {c.ruc ? `Â· ${c.ruc}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de documento</label>
                                    <div className="flex gap-2">
                                        {['FACTURA', 'BOLETA'].map(t => (
                                            <button type="button" key={t}
                                                onClick={() => setForm(f => ({ ...f, tipo_documento: t }))}
                                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold border transition-colors ${
                                                    form.tipo_documento === t
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                }`}>
                                                {t === 'FACTURA' ? 'Factura' : 'Boleta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* LÃ­neas de detalle */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Package size={15} /> LÃ­neas de Detalle
                                        <span className="text-xs font-normal text-slate-400">(multi-lote R3)</span>
                                    </p>
                                    <button type="button" onClick={addLinea}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus size={13} /> AÃ±adir lÃ­nea
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {líneas.map((l, i) => (
                                        <LineaDetalle key={i} index={i} línea={l} productos={productos}
                                            onChange={handleLinea} onRemove={removeLinea} />
                                    ))}
                                </div>
                            </div>

                            {/* Total calculado */}
                            <div className="flex justify-end">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center gap-3">
                                    <DollarSign size={18} className="text-indigo-500" />
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Calculado</p>
                                        <p className="text-xl font-black text-indigo-700 tracking-tight">{formatSoles(totalFactura)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observaciones</label>
                                <textarea rows={2} value={form.observaciones}
                                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Notas adicionales (opcional)"
                                />
                            </div>

                            {/* Acciones */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {guardando ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</> : <><CheckCircle size={14} /> Registrar Factura</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* â”€â”€ MODAL DETALLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetalle(null)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-slate-800">Detalle de Factura</h3>
                            <button onClick={() => setDetalle(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="flex justify-between"><span className="font-semibold">NÂ° Factura</span><span className="font-mono text-indigo-600">{detalle.data.numero_factura || `FAC-${String(detalle.data.id).padStart(5,'0')}`}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Cliente</span><span>{detalle.data.Cliente?.razon_social || 'â€”'}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Fecha</span><span>{formatFecha(detalle.data.fecha_emision)}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Estado</span><StatusBadge estado={detalle.data.estado || 'BORRADOR'} map={BADGE_FACTURA} /></div>
                            <div className="flex justify-between"><span className="font-semibold">Total</span><span className="font-bold text-indigo-700">{formatSoles(detalle.data.total || 0)}</span></div>
                            {detalle.data.observaciones && <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-400">{detalle.data.observaciones}</p></div>}
                        </div>
                        <button onClick={() => setDetalle(null)} className="mt-5 w-full py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 2 â€” GUÃAS DE REMISIÃ“N
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TabGuias() {
    const { isAdmin } = useAuth();
    const [guias, setGuias]           = useState([]);
    const [loading, setLoading]       = useState(false);
    const [page, setPage]             = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda]     = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    // Modal nueva guÃ­a
    const [showModal, setShowModal]   = useState(false);
    const [productos, setProductos]   = useState([]);
    const [guardando, setGuardando]   = useState(false);
    const [form, setForm]             = useState({
        tipo_guia: 'DESPACHO', numero_guia: '',
        fecha_emision: new Date().toISOString().split('T')[0],
        factura_id: '', destinatario: '', observaciones: ''
    });
    const [líneas, setLíneas]         = useState([{ ...LINE_EMPTY }]);
    const [detalle, setDetalle]       = useState(null);

    const fetchGuias = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/guias', {
                params: { page, limit: 12, busqueda, tipo_guia: filtroTipo || undefined }
            }).catch(() => ({ data: { data: [], totalPages: 1 } }));
            setGuias(data.data || []);
            setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    }, [page, busqueda, filtroTipo]);

    useEffect(() => { fetchGuias(); }, [fetchGuias]);

    const abrirModal = async () => {
        const { data } = await api.get('/productos', { params: { limit: 500, estado: 1 } })
            .catch(() => ({ data: { data: [] } }));
        setProductos(data.data || []);
        setForm({ tipo_guia: 'DESPACHO', numero_guia: '', fecha_emision: new Date().toISOString().split('T')[0], factura_id: '', destinatario: '', observaciones: '' });
        setLíneas([{ ...LINE_EMPTY }]);
        setShowModal(true);
    };

    const handleLinea = (i, val) => setLíneas(ls => ls.map((l, idx) => idx === i ? val : l));
    const addLinea    = () => setLíneas(ls => [...ls, { ...LINE_EMPTY }]);
    const removeLinea = (i) => { if (líneas.length > 1) setLíneas(ls => ls.filter((_, idx) => idx !== i)); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (líneas.some(l => !l.producto_id || !l.lote_id || !l.cantidad)) {
            return toast.error('Completa todas las lÃ­neas: producto, lote y cantidad son obligatorios.');
        }
        setGuardando(true);
        try {
            await api.post('/guias', {
                ...form,
                factura_id: form.factura_id || null,
                detalles: líneas.map(l => ({
                    producto_id:     Number(l.producto_id),
                    lote_id:         Number(l.lote_id),
                    cantidad:        Number(l.cantidad),
                    precio_unitario: l.precio_unitario !== '' ? Number(l.precio_unitario) : null,
                }))
            });
            toast.success('GuÃ­a de remisiÃ³n creada correctamente');
            setShowModal(false);
            fetchGuias();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al crear la guÃ­a');
        } finally { setGuardando(false); }
    };

    const handleAnular = async (g) => {
        try {
            await api.patch(`/guias/${g.id}/anular`, { motivo: 'Anulada por usuario' });
            toast.success('GuÃ­a anulada');
            fetchGuias();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al anular');
        }
    };

    const TIPO_BADGE = {
        DESPACHO:   'bg-blue-100 text-blue-700',
        REPOSICION: 'bg-sky-100 text-sky-700',
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" placeholder="Buscar por NÂ° guÃ­a o destinatario..."
                            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 min-w-[140px]"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="DESPACHO">Despacho</option>
                        <option value="REPOSICION">Reposición</option>
                    </select>
                    <button onClick={fetchGuias} className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-xl bg-white">
                        <RefreshCw size={16} />
                    </button>
                </div>
                {isAdmin() && (
                    <button onClick={abrirModal}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shadow-sm transition-all whitespace-nowrap">
                        <Plus size={16} /> Nueva GuÃ­a
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">NÂ° GuÃ­a</th>
                                <th className="px-5 py-3.5 font-semibold">Tipo</th>
                                <th className="px-5 py-3.5 font-semibold">Destinatario</th>
                                <th className="px-5 py-3.5 font-semibold">Fecha</th>
                                <th className="px-5 py-3.5 font-semibold">Factura</th>
                                <th className="px-5 py-3.5 font-semibold text-center">Estado</th>
                                <th className="px-5 py-3.5 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw size={20} className="animate-spin text-teal-400" />
                                        <span className="text-sm">Cargando guÃ­as...</span>
                                    </div>
                                </td></tr>
                            ) : guias.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <Truck size={40} className="opacity-30" />
                                        <div>
                                            <p className="font-semibold text-slate-500">No hay guÃ­as registradas</p>
                                            <p className="text-xs mt-1">Crea la primera guÃ­a con el botón "Nueva GuÃ­a".</p>
                                        </div>
                                    </div>
                                </td></tr>
                            ) : guias.map(g => (
                                <tr key={g.id} className="hover:bg-slate-50/70 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <span className="font-mono font-bold text-teal-600 text-xs">{g.numero_guia || `GR-${String(g.id).padStart(5, '0')}`}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[g.tipo_guia] || 'bg-slate-100 text-slate-600'}`}>
                                            {g.tipo_guia}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-700">{g.destinatario || 'â€”'}</td>
                                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatFecha(g.fecha_emision)}</td>
                                    <td className="px-5 py-3.5 text-xs">
                                        {g.Factura
                                            ? <span className="font-mono text-indigo-500">{g.Factura.numero_factura || `FAC-${String(g.Factura.id).padStart(5,'0')}`}</span>
                                            : <span className="text-slate-300 italic">Sin factura</span>
                                        }
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <StatusBadge estado={g.estado || 'PENDIENTE'} map={BADGE_GUIA} />
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setDetalle(g)}
                                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Ver detalle">
                                                <Eye size={15} />
                                            </button>
                                            {isAdmin() && g.estado !== 'ANULADA' && (
                                                <button onClick={() => handleAnular(g)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Anular">
                                                    <Ban size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">PÃ¡gina <b>{page}</b> de <b>{totalPages}</b></span>
                    <div className="flex gap-1.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"><ChevronLeft size={15} /></button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"><ChevronRight size={15} /></button>
                    </div>
                </div>
            </div>

            {/* â”€â”€ MODAL NUEVA GUÃA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 mb-10">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                                    <Truck size={18} className="text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Nueva GuÃ­a de Remisión</h2>
                                    <p className="text-xs text-slate-400">Tipo REPOSICION no requiere factura vinculada (R5-A)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Tipo de guÃ­a */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de GuÃ­a *</label>
                                <div className="flex gap-3">
                                    {['DESPACHO', 'REPOSICION'].map(tipo => (
                                        <label key={tipo}
                                            className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-all text-sm font-semibold ${
                                                form.tipo_guia === tipo
                                                    ? tipo === 'DESPACHO'
                                                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                                                        : 'border-sky-500 bg-sky-50 text-sky-800'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}>
                                            <input type="radio" value={tipo} checked={form.tipo_guia === tipo}
                                                onChange={e => setForm(f => ({ ...f, tipo_guia: e.target.value }))} className="sr-only" />
                                            {tipo === 'DESPACHO' ? <Truck size={16} /> : <RefreshCw size={16} />}
                                            {tipo}
                                        </label>
                                    ))}
                                </div>
                                {form.tipo_guia === 'REPOSICION' && (
                                    <p className="mt-2 text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                                        <AlertTriangle size={12} className="inline mr-1" />
                                        GuÃ­a de corrección por faltantes en entrega previa. La factura es opcional.
                                    </p>
                                )}
                            </div>

                            {/* Datos cabecera */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5"><Hash size={12} className="inline mr-1" />NÂ° GuÃ­a</label>
                                    <input type="text" value={form.numero_guia}
                                        onChange={e => setForm(f => ({ ...f, numero_guia: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        placeholder="GR-001 (opcional)" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5"><Calendar size={12} className="inline mr-1" />Fecha</label>
                                    <input type="date" required value={form.fecha_emision}
                                        onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        <FileText size={12} className="inline mr-1" />Factura vinculada
                                        {form.tipo_guia === 'REPOSICION' && <span className="ml-1 text-sky-500">(opcional)</span>}
                                    </label>
                                    <input type="text" value={form.factura_id}
                                        onChange={e => setForm(f => ({ ...f, factura_id: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        placeholder="ID de factura" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5"><User size={12} className="inline mr-1" />Destinatario</label>
                                <input type="text" value={form.destinatario}
                                    onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="Nombre o razón social del destinatario" />
                            </div>

                            {/* LÃ­neas de detalle */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Package size={15} /> LÃ­neas de Detalle
                                        <span className="text-xs font-normal text-slate-400">(multi-lote R3)</span>
                                    </p>
                                    <button type="button" onClick={addLinea}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus size={13} /> AÃ±adir lÃ­nea
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {líneas.map((l, i) => (
                                        <LineaDetalle key={i} index={i} línea={l} productos={productos}
                                            onChange={handleLinea} onRemove={removeLinea} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observaciones</label>
                                <textarea rows={2} value={form.observaciones}
                                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="Notas adicionales (opcional)" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {guardando ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</> : <><CheckCircle size={14} /> Registrar GuÃ­a</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal detalle guÃ­a */}
            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetalle(null)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-slate-800">Detalle de GuÃ­a</h3>
                            <button onClick={() => setDetalle(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="flex justify-between"><span className="font-semibold">NÂ° GuÃ­a</span><span className="font-mono text-teal-600">{detalle.numero_guia || `GR-${String(detalle.id).padStart(5,'0')}`}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Tipo</span><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[detalle.tipo_guia] || 'bg-slate-100 text-slate-600'}`}>{detalle.tipo_guia}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Destinatario</span><span>{detalle.destinatario || 'â€”'}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Fecha</span><span>{formatFecha(detalle.fecha_emision)}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Estado</span><StatusBadge estado={detalle.estado || 'PENDIENTE'} map={BADGE_GUIA} /></div>
                            {detalle.observaciones && <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-400">{detalle.observaciones}</p></div>}
                        </div>
                        <button onClick={() => setDetalle(null)} className="mt-5 w-full py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 3 â€” ARCHIVOS ADJUNTOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TabArchivos() {
    const [docs, setDocs]   = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get('/documentos').then(r => setDocs(r.data || [])).catch(() => setDocs([])).finally(() => setLoading(false));
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
                <div className="py-16 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Cargando archivos...</p>
                </div>
            ) : docs.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                    <Paperclip size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-slate-500">No hay archivos adjuntos</p>
                    <p className="text-xs mt-1">Los documentos PDF y adjuntos aparecerÃ¡n aquí­.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {docs.map((d, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                            <Paperclip size={16} className="text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{d.nombre || d.name}</p>
                                <p className="text-xs text-slate-400">{formatFecha(d.fecha || d.createdAt)}</p>
                            </div>
                            {d.url && (
                                <a href={d.url} target="_blank" rel="noreferrer"
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                    Ver â†’
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â

export default function Documentos() {
    const [activeTab, setActiveTab] = React.useState('facturas');

    const tabs = [
        { id: 'facturas', label: 'Facturas' },
        { id: 'guias', label: 'Guías de Remisión' },
        { id: 'archivos', label: 'Archivos Adjuntos' },
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Documentos Operativos</h1>
                <p className="text-sm text-slate-500 mt-1">Gestión de facturas, boletas, guías de remisión y comprobantes adjuntos.</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                                isActive
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'facturas' && <TabFacturas />}
                {activeTab === 'guias' && <TabGuias />}
                {activeTab === 'archivos' && <TabArchivos />}
            </div>
        </div>
    );
}
