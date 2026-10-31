import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Users, Building, Mail, Phone, ShieldCheck, ShieldOff,
    Clock, RefreshCw, AlertCircle, CheckCircle, Search,
    TrendingUp, Activity, ClipboardList, X, Package, FileText
} from 'lucide-react';

const TIPO_COLORS = {
    HOSPITAL: 'bg-blue-100 text-blue-700',
    CLINICA:  'bg-purple-100 text-purple-700',
    ESSALUD:  'bg-cyan-100 text-cyan-700',
    FARMACIA: 'bg-emerald-100 text-emerald-700',
    OTRO:     'bg-slate-100 text-slate-600',
};

const ESTADO_CONFIG = {
    NUEVO:      { label: 'Recibido',       cls: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
    EN_PROCESO: { label: 'En Proceso',     cls: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-400' },
    ATENDIDO:   { label: 'Aprobado',       cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
    DESCARTADO: { label: 'No disponible',  cls: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-400' },
};

// ── Modal de Historial ─────────────────────────────────────────────────────────
function ModalHistorial({ cliente, onClose }) {
    const [pedidos, setPedidos]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);

    useEffect(() => {
        const fetchPedidos = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/pedidos-web/cliente/${cliente.id}`);
                setPedidos(data.data || []);
            } catch {
                setError('No se pudo cargar el historial de pedidos.');
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, [cliente.id]);

    return (
        /* Backdrop */
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-end" onClick={onClose}>
            {/* Drawer lateral */}
            <div
                className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideInRight .3s ease' }}
            >
                {/* Header */}
                <div className="bg-sky-600 text-white p-6 relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 text-sky-200 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                    <p className="text-[10px] font-bold text-sky-200 mb-2 uppercase tracking-widest">Historial de Pedidos</p>
                    <h2 className="text-xl font-bold leading-tight mb-2 pr-6">{cliente.nombre_completo}</h2>
                    <div className="flex items-center gap-2 text-xs text-sky-100">
                        <span className="bg-sky-700/50 px-2 py-0.5 rounded border border-sky-500/30 font-mono">{cliente.ruc_dni || 'Sin RUC/DNI'}</span>
                        <span>{cliente.entidad || cliente.email}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <RefreshCw className="animate-spin mb-3" size={28} />
                            <p className="text-sm">Cargando pedidos...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-48 text-red-400">
                            <AlertCircle className="mb-3" size={28} />
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : pedidos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <Package className="mb-3" size={36} />
                            <p className="font-medium text-slate-500">Sin pedidos registrados</p>
                            <p className="text-xs mt-1">Este cliente aún no ha enviado cotizaciones.</p>
                        </div>
                    ) : (
                        pedidos.map(pedido => {
                            const est   = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.NUEVO;
                            const fecha = new Date(pedido.fecha_recepcion).toLocaleString('es-PE', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            });

                            let productosParseados = null;
                            if (pedido.productos_cotizados) {
                                try { productosParseados = JSON.parse(pedido.productos_cotizados); } catch {}
                            }

                            return (
                                <div key={pedido.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    {/* Top row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-xs text-slate-400">
                                            #REQ-{String(pedido.id).padStart(4,'0')}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${est.cls}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                                            {est.label}
                                        </span>
                                    </div>

                                    {/* Mensaje */}
                                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                                        <FileText size={12} className="inline mr-1 text-slate-400" />
                                        {(pedido.mensaje_requerimiento || '').substring(0, 200)}
                                        {pedido.mensaje_requerimiento?.length > 200 ? '...' : ''}
                                    </p>

                                    {/* Productos */}
                                    {productosParseados && productosParseados.length > 0 && (
                                        <div className="bg-white border border-slate-100 rounded-lg p-3 mt-2">
                                            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                                <Package size={12} /> Productos cotizados
                                            </p>
                                            {productosParseados.map((p, i) => (
                                                <div key={i} className="flex justify-between text-xs text-slate-600 py-0.5">
                                                    <span>• {p.nombre}</span>
                                                    <span className="font-semibold text-sky-600">{p.cantidad} {p.unidad}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Fecha */}
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <Clock size={11} /> {fecha}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                    <p className="text-xs text-slate-400 text-center">
                        Total: <strong className="text-slate-600">{pedidos.length} pedido{pedidos.length !== 1 && 's'}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Página Principal ───────────────────────────────────────────────────────────
export default function ClientesWeb() {
    const [clientes, setClientes]           = useState([]);
    const [loading, setLoading]             = useState(true);
    const [busqueda, setBusqueda]           = useState('');
    const [toast, setToast]                 = useState(null);
    const [clienteHistorial, setClienteHistorial] = useState(null); // cliente seleccionado para ver historial

    const showToast = (msg, tipo = 'success') => {
        setToast({ msg, tipo });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/clientes-web');
            setClientes(data.data || []);
        } catch {
            showToast('Error al cargar el directorio de clientes web.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClientes(); }, []);

    const handleToggleEstado = async (id) => {
        try {
            const { data } = await api.put(`/clientes-web/${id}/estado`);
            showToast(data.mensaje);
            fetchClientes();
        } catch {
            showToast('Error al cambiar el estado del cliente.', 'error');
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.entidad || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        c.email.toLowerCase().includes(busqueda.toLowerCase())
    );

    const kpis = {
        total:     clientes.length,
        activos:   clientes.filter(c => c.activo).length,
        hospitales: clientes.filter(c => c.tipo === 'HOSPITAL' || c.tipo === 'ESSALUD').length,
        privados:  clientes.filter(c => c.tipo === 'CLINICA'  || c.tipo === 'FARMACIA').length,
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            {/* CSS para animación del drawer */}
            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
            `}</style>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-xl shadow-xl flex items-center gap-3 border ${toast.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {toast.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-medium">{toast.msg}</p>
                </div>
            )}

            {/* Modal historial */}
            {clienteHistorial && (
                <ModalHistorial
                    cliente={clienteHistorial}
                    onClose={() => setClienteHistorial(null)}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <Users className="text-sky-600" size={28} />
                            Directorio de Clientes B2B
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Cuentas registradas en el portal web institucional. Monitoreo de actividad comercial.
                        </p>
                    </div>
                    <button onClick={fetchClientes} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                        <RefreshCw size={16} /> Actualizar
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Registrados', value: kpis.total,     icon: Users,       color: 'text-sky-600',    bg: 'bg-sky-50' },
                        { label: 'Cuentas Activas',   value: kpis.activos,   icon: Activity,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Sector Público',    value: kpis.hospitales, icon: Building,   color: 'text-blue-600',   bg: 'bg-blue-50' },
                        { label: 'Sector Privado',    value: kpis.privados,  icon: TrendingUp,  color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{loading ? '—' : value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${bg}`}><Icon size={22} className={color} /></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="font-bold text-slate-800">Cuentas Registradas</h2>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, entidad o email..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:border-sky-400"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Cliente</th>
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Entidad</th>
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Contacto</th>
                                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Tipo</th>
                                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Estado</th>
                                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Último Acceso</th>
                                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <RefreshCw className="animate-spin mx-auto text-slate-300 mb-2" size={24} />
                                        <span className="text-slate-400 text-sm">Cargando directorio...</span>
                                    </td></tr>
                                ) : filteredClientes.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <Users className="mx-auto text-slate-200 mb-3" size={40} />
                                        <p className="text-slate-500 font-medium">No hay clientes web registrados aún.</p>
                                        <p className="text-slate-400 text-xs mt-1">Los clientes se registran desde la web institucional.</p>
                                    </td></tr>
                                ) : (
                                    filteredClientes.map(cliente => (
                                        <tr key={cliente.id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Cliente */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                        {cliente.nombre_completo.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{cliente.nombre_completo}</p>
                                                        {cliente.ruc_dni && <p className="text-xs text-slate-400">RUC/DNI: {cliente.ruc_dni}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Entidad */}
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-700">{cliente.entidad || '—'}</p>
                                            </td>
                                            {/* Contacto */}
                                            <td className="px-5 py-4">
                                                <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 text-sky-600 hover:underline text-xs mb-1">
                                                    <Mail size={12} /> {cliente.email}
                                                </a>
                                                {cliente.telefono && (
                                                    <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 text-slate-500 text-xs">
                                                        <Phone size={12} /> {cliente.telefono}
                                                    </a>
                                                )}
                                            </td>
                                            {/* Tipo */}
                                            <td className="px-5 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIPO_COLORS[cliente.tipo] || TIPO_COLORS.OTRO}`}>
                                                    {cliente.tipo}
                                                </span>
                                            </td>
                                            {/* Estado */}
                                            <td className="px-5 py-4 text-center">
                                                {cliente.activo ? (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 justify-center">
                                                        <ShieldCheck size={12} /> Activo
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 flex items-center gap-1 justify-center">
                                                        <ShieldOff size={12} /> Inactivo
                                                    </span>
                                                )}
                                            </td>
                                            {/* Último acceso */}
                                            <td className="px-5 py-4 text-center text-xs text-slate-500">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock size={12} />
                                                    {cliente.ultimo_acceso
                                                        ? new Date(cliente.ultimo_acceso).toLocaleString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                                                        : 'Nunca accedió'}
                                                </div>
                                            </td>
                                            {/* Acciones */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* VER HISTORIAL */}
                                                    <button
                                                        onClick={() => setClienteHistorial(cliente)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                                                        title="Ver historial de pedidos"
                                                    >
                                                        <ClipboardList size={13} /> Historial
                                                    </button>
                                                    {/* ACTIVAR / DESACTIVAR */}
                                                    <button
                                                        onClick={() => handleToggleEstado(cliente.id)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${cliente.activo
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                        title={cliente.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                                                    >
                                                        {cliente.activo ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
