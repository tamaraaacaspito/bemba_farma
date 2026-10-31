import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    ArrowUpCircle, ArrowDownCircle, Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    AlertCircle, Search, Calendar, FileText, CheckCircle, FileSpreadsheet, Box, Fingerprint,
    RefreshCcw
} from 'lucide-react';

export default function Kardex() {
    const { isAdmin, isAlmacen } = useAuth();
    const canOperate = isAdmin() || isAlmacen();

    const [activeTab, setActiveTab] = useState(1);

    // ── ESTADOS TAB 1: REGISTRAR ──────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [suggestedProductos, setSuggestedProductos] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const [selectedProducto, setSelectedProducto] = useState(null);
    const [tipoMovimiento, setTipoMovimiento] = useState('ENTRADA'); 
    const [cantidad, setCantidad] = useState('');
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const comboRef = useRef(null);

    // Lotes Médicos
    const [lotesDisponibles, setLotesDisponibles] = useState([]);
    const [lote, setLote] = useState('');
    const [loteReemplazo, setLoteReemplazo] = useState(''); // Solo para CANJE (lote de salida)
    const [registroSanitario, setRegistroSanitario] = useState('');
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    
    // Documentos Referencias
    const [siaf, setSiaf] = useState('');
    const [guia, setGuia] = useState('');
    const [factura, setFactura] = useState('');
    const [ordenCompra, setOrdenCompra] = useState('');
    const [mostrarReferencias, setMostrarReferencias] = useState(false);
    // Listas para elegir factura/guía existentes en las referencias de auditoría
    const [facturasRef, setFacturasRef] = useState([]);
    const [guiasRef, setGuiasRef] = useState([]);

    useEffect(() => {
        api.get('/facturas', { params: { limit: 100 } })
            .then(r => setFacturasRef(r.data?.data || []))
            .catch(() => setFacturasRef([]));
        api.get('/guias', { params: { limit: 100 } })
            .then(r => setGuiasRef(r.data?.data || []))
            .catch(() => setGuiasRef([]));
    }, []);

    // ── ESTADOS TAB 2: HISTORIAL ──────────────────────────────────────────────
    const [historial, setHistorial] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    
    // Filtros Historial
    const [fProducto, setFProducto] = useState('');
    const [fTipo, setFTipo] = useState('');
    const [fFechaInicio, setFFechaInicio] = useState('');
    const [fFechaFin, setFFechaFin] = useState('');

    const [toast, setToast] = useState(null);

    const showToast = (mensaje, tipo = 'success') => {
        setToast({ mensaje, tipo });
        setTimeout(() => setToast(null), 7000);
    };

    // ── HOOKS BÚSQUEDA PRODUCTO ────────────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            buscarProductos(debouncedSearch);
        } else {
            setSuggestedProductos([]);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (comboRef.current && !comboRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedProducto) {
            const fetchLotes = async () => {
                try {
                    const { data } = await api.get(`/productos/${selectedProducto.id}/lotes`);
                    setLotesDisponibles(data || []);
                } catch (err) {
                    console.error('Error fetching lotes', err);
                }
            };
            fetchLotes();
        } else {
            setLotesDisponibles([]);
        }
    }, [selectedProducto]);

    // ── API HANDLERS ───────────────────────────────────────────────────────────
    const buscarProductos = async (q) => {
        try {
            const { data } = await api.get('/productos', { params: { busqueda: q, limit: 10, estado: 1 }});
            setSuggestedProductos(data.data || []);
            setIsDropdownOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHistorial = async () => {
        try {
            setLoadingHistorial(true);
            const params = { page, limit: 15 };
            if (fProducto) params.producto_id = fProducto;
            if (fTipo) params.tipo_movimiento_id = fTipo;
            if (fFechaInicio) params.fecha_inicio = fFechaInicio;
            if (fFechaFin) params.fecha_fin = fFechaFin;

            const { data } = await api.get('/kardex', { params });
            setHistorial(data.data || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistorial(false);
        }
    };

    useEffect(() => {
        if (activeTab === 2) fetchHistorial();
    }, [activeTab, page, fProducto, fTipo, fFechaInicio, fFechaFin]);

    const handleLoteSelect = (val) => {
        setLote(val);
        const match = lotesDisponibles.find(l => (l.numero_lote || l.codigo_lote) === val);
        if (match) {
            if (match.fecha_vencimiento) {
                setFechaVencimiento(match.fecha_vencimiento.split('T')[0]);
            } else {
                setFechaVencimiento('');
            }
        } else {
            setFechaVencimiento('');
        }
    };

    // ── LÓGICA FORMULARIO KARDEX ────────────────────────────────────────────────
    const handleRegistrar = async (e) => {
        e.preventDefault();
        if (!selectedProducto) return showToast('Seleccione un producto.', 'warning');
        if (!lote) return showToast('El código de Lote Médico es obligatorio (FEFO).', 'warning');
        if (!cantidad || cantidad <= 0) return showToast('Ingrese una cantidad válida mayor a 0.', 'warning');

        // Validación especial CANJE: requiere dos lotes del mismo producto
        if (tipoMovimiento === 'CANJE' && !loteReemplazo) {
            return showToast('Para un Canje debe seleccionar el lote defectuoso Y el lote de reemplazo.', 'warning');
        }
        if (tipoMovimiento === 'CANJE' && lote === loteReemplazo) {
            return showToast('El lote defectuoso y el lote de reemplazo deben ser distintos.', 'warning');
        }

        setGuardando(true);
        // Mapear tipo de movimiento al endpoint correcto
        let endpoint;
        switch (tipoMovimiento) {
            case 'ENTRADA':    endpoint = '/kardex/entrada';    break;
            case 'SALIDA':     endpoint = '/kardex/salida';     break;
            case 'REPOSICION': endpoint = '/kardex/reposicion'; break;
            case 'CANJE':      endpoint = '/kardex/canje';      break;
            default:           endpoint = '/kardex/entrada';
        }
        
        // Payload base
        const payload = { 
            producto_id: selectedProducto.id, 
            cantidad: Number(cantidad),
            codigo_lote: lote,
            registro_sanitario: registroSanitario,
            fecha_vencimiento: fechaVencimiento || null,
            motivo,
            doc_guia_remision: guia,
            doc_factura: factura,
            doc_orden_compra: ordenCompra,
            codigo_siaf: siaf
        };

        // Para CANJE agregamos el segundo lote (reemplazo = CANJE_SALIDA)
        if (tipoMovimiento === 'CANJE') {
            payload.codigo_lote_defectuoso = lote;        // CANJE_ENTRADA  (regresa el defectuoso)
            payload.codigo_lote_reemplazo  = loteReemplazo; // CANJE_SALIDA (sale el bueno)
        }

        try {
            const { data } = await api.post(endpoint, payload);
            if (data.alerta_generada) {
                showToast(`ADVERTENCIA: El stock (nuevo: ${data.stock_nuevo}) llegó a nivel crítico. Operación guardada.`, 'warning');
            } else if (tipoMovimiento === 'CANJE') {
                showToast('Canje registrado: CANJE_ENTRADA y CANJE_SALIDA generados correctamente.', 'success');
            } else {
                showToast('Movimiento registrado. Stock Global actualizado.', 'success');
            }

            // Reset Limpieza
            setSelectedProducto(null);
            setSearchTerm('');
            setCantidad('');
            setMotivo('');
            setLote('');
            setLoteReemplazo('');
            setRegistroSanitario('');
            setFechaVencimiento('');
            setSiaf('');
            setGuia('');
            setFactura('');
            setOrdenCompra('');
            
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error de concurrencia Stock / Transacción.';
            showToast(errorMsg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const handleExport = async (formato) => {
        try {
            const res = await api.get(`/reportes/kardex/${formato}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kardex_export.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch(err) {
            showToast(`Error exportando ${formato.toUpperCase()}`, 'error');
        }
    };

    const getBadgeColor = (tipo_id) => {
        switch(Number(tipo_id)) {
            case 1: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">ENTRADA</span>;
            case 2: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">SALIDA</span>;
            case 3: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">AJUSTE</span>;
            case 4: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">REPOSICIÓN</span>;
            case 5: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">CANJE ENT.</span>;
            case 6: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">CANJE SAL.</span>;
            default: return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">OTRO</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans relative">
            <div className="max-w-7xl mx-auto space-y-6 relative">
                
                {/* Toaster */}
                {toast && (
                    <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 w-96 transform transition-all animate-in slide-in-from-right-8 border ${toast.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : toast.tipo === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        {toast.tipo === 'success' ? <CheckCircle size={24} className="text-emerald-500" /> : <AlertCircle size={24} className={toast.tipo === 'warning' ? 'text-orange-500' : 'text-rose-500'} />}
                        <p className="text-sm font-medium leading-tight">{toast.mensaje}</p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kardex de Stock Global</h1>
                        <p className="text-sm text-slate-500 mt-1">Garantía trazable de existencias y reportes SIAF.</p>
                    </div>
                    <div className="flex gap-2 bg-slate-200/50 p-1 rounded-xl">
                        <button onClick={() => setActiveTab(1)} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 1 ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Operar Kardex</button>
                        <button onClick={() => setActiveTab(2)} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 2 ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Historial</button>
                    </div>
                </div>

                {/* TAB 1: OPERAR */}
                {activeTab === 1 && (
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                        {canOperate ? (
                            <form onSubmit={handleRegistrar} className="space-y-8">
                                
                                {/* 1. SELECCION DE TIPO */}
                                <div className="mb-6">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-900">1. Tipo de Movimiento Operativo</label>
                                        <div className="flex flex-wrap gap-3">
                                            <label className={`flex-1 min-w-[140px] cursor-pointer flex items-center justify-center p-3 border rounded-xl transition-all ${tipoMovimiento === 'ENTRADA' ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-emerald-800 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input type="radio" value="ENTRADA" checked={tipoMovimiento === 'ENTRADA'} onChange={(e) => setTipoMovimiento(e.target.value)} className="sr-only" />
                                                <ArrowUpCircle className="mr-2" size={20} /> Entrada
                                            </label>
                                            <label className={`flex-1 min-w-[140px] cursor-pointer flex items-center justify-center p-3 border rounded-xl transition-all ${tipoMovimiento === 'SALIDA' ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500 text-rose-800 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input type="radio" value="SALIDA" checked={tipoMovimiento === 'SALIDA'} onChange={(e) => setTipoMovimiento(e.target.value)} className="sr-only" />
                                                <ArrowDownCircle className="mr-2" size={20} /> Salida
                                            </label>
                                            <label className={`flex-1 min-w-[140px] cursor-pointer flex items-center justify-center p-3 border rounded-xl transition-all ${tipoMovimiento === 'REPOSICION' ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500 text-sky-800 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input type="radio" value="REPOSICION" checked={tipoMovimiento === 'REPOSICION'} onChange={(e) => setTipoMovimiento(e.target.value)} className="sr-only" />
                                                <ArrowUpCircle className="mr-2" size={20} /> Reposición
                                            </label>
                                            <label className={`flex-1 min-w-[140px] cursor-pointer flex items-center justify-center p-3 border rounded-xl transition-all ${tipoMovimiento === 'CANJE' ? 'border-violet-500 bg-violet-50/50 ring-1 ring-violet-500 text-violet-800 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input type="radio" value="CANJE" checked={tipoMovimiento === 'CANJE'} onChange={(e) => setTipoMovimiento(e.target.value)} className="sr-only" />
                                                <Settings className="mr-2" size={20} /> Canje
                                            </label>
                                        </div>
                                        {tipoMovimiento === 'REPOSICION' && (
                                            <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                                                📦 <strong>Reposición:</strong> corrección de faltantes detectados en entrega. Genera guía de reposición independiente.
                                            </p>
                                        )}
                                        {tipoMovimiento === 'CANJE' && (
                                            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                                                🔄 <strong>Canje:</strong> producto defectuoso devuelto por el cliente y reemplazado por otro lote del mismo producto.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 2. PRODUCTO Y METADATA LOTE */}
                                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-5">
                                    <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Box size={18} /> 2. Producto y Lote Médico (FEFO)</h3>
                                    
                                    {/* Buscador de producto */}
                                    <div className="relative" ref={comboRef}>
                                        <div className="relative flex items-center">
                                            <Search className="absolute left-3.5 text-slate-400" size={18} />
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                                placeholder="Buscar medicamento exacto..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onFocus={() => { if(suggestedProductos.length > 0) setIsDropdownOpen(true); }}
                                            />
                                        </div>
                                        {isDropdownOpen && (
                                            <ul className="absolute z-10 mx-1 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                                                {suggestedProductos.map(p => (
                                                    <li key={p.id} onClick={() => {
                                                        setSelectedProducto(p);
                                                        setSearchTerm(`${p.codigo} - ${p.nombre}`);
                                                        setIsDropdownOpen(false);
                                                        setLote('');
                                                        setLoteReemplazo('');
                                                    }} className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{p.nombre}</p>
                                                            <p className="text-xs text-slate-500">{p.codigo}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-sm font-bold text-slate-700">{p.stock_actual}</span>
                                                            <span className="block text-[10px] text-slate-400">Stock Global</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                     {/* ── UI normal (ENTRADA / SALIDA / REPOSICION) ─── */}
                                    {tipoMovimiento !== 'CANJE' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">N° de Lote (FEFO) *</label>
                                                {tipoMovimiento === 'ENTRADA' ? (
                                                    <input required value={lote} onChange={e => handleLoteSelect(e.target.value)} placeholder="Ej. L-9942B" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1" />
                                                ) : (
                                                    <select required value={lote} onChange={e => handleLoteSelect(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 cursor-pointer">
                                                        <option value="">Seleccione Lote...</option>
                                                        {lotesDisponibles.filter(l => Number(l.stock_actual) > 0).map(lt => {
                                                            const nLote = lt.numero_lote || lt.codigo_lote;
                                                            return (
                                                                <option key={lt.id} value={nLote}>Lote: {nLote} | Stock: {Number(lt.stock_actual || 0).toLocaleString('es-PE')}</option>
                                                            );
                                                        })}
                                                    </select>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimiento {tipoMovimiento !== 'ENTRADA' && '(Auto)'}</label>
                                                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} disabled={tipoMovimiento !== 'ENTRADA'} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 text-slate-600 disabled:opacity-70 disabled:bg-slate-50" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Reg. Sanitario {tipoMovimiento !== 'ENTRADA' && '(Auto)'}</label>
                                                <input value={registroSanitario} onChange={e => setRegistroSanitario(e.target.value)} disabled={tipoMovimiento !== 'ENTRADA'} placeholder={tipoMovimiento !== 'ENTRADA' ? "Automático" : "Reg. Digemid"} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 disabled:opacity-70 disabled:bg-slate-50" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── UI especial CANJE: dos lotes ─────────────── */}
                                    {tipoMovimiento === 'CANJE' && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Lote defectuoso (CANJE_ENTRADA) */}
                                                <div className="p-4 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/40 space-y-2">
                                                    <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <ArrowUpCircle size={13} /> Lote Defectuoso Recibido
                                                        <span className="font-normal text-rose-400 normal-case tracking-normal">· CANJE_ENTRADA</span>
                                                    </p>
                                                    <p className="text-[11px] text-rose-500">Producto que el cliente devuelve por defecto de fabricación.</p>
                                                    <input
                                                        required
                                                        list="lista-lotes-defecto"
                                                        value={lote}
                                                        onChange={e => setLote(e.target.value)}
                                                        placeholder="N° de lote defectuoso"
                                                        className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-100"
                                                    />
                                                    <datalist id="lista-lotes-defecto">
                                                        {lotesDisponibles.map(lt => (
                                                            <option key={lt.id} value={lt.numero_lote || lt.codigo_lote}>Stock: {Number(lt.stock_actual || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</option>
                                                        ))}
                                                    </datalist>
                                                </div>

                                                {/* Lote de reemplazo (CANJE_SALIDA) */}
                                                <div className="p-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 space-y-2">
                                                    <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <ArrowDownCircle size={13} /> Lote de Reemplazo Enviado
                                                        <span className="font-normal text-violet-400 normal-case tracking-normal">· CANJE_SALIDA</span>
                                                    </p>
                                                    <p className="text-[11px] text-violet-500">Lote en buen estado que se envía al cliente como reemplazo.</p>
                                                    <input
                                                        required
                                                        list="lista-lotes-reemplazo"
                                                        value={loteReemplazo}
                                                        onChange={e => setLoteReemplazo(e.target.value)}
                                                        placeholder="N° de lote de reemplazo"
                                                        className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                                                    />
                                                    <datalist id="lista-lotes-reemplazo">
                                                        {lotesDisponibles.filter(lt => Number(lt.stock_actual) > 0).map(lt => (
                                                            <option key={lt.id} value={lt.numero_lote || lt.codigo_lote}>Stock: {Number(lt.stock_actual || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</option>
                                                        ))}
                                                    </datalist>
                                                </div>
                                            </div>

                                            {/* Info box regla de negocio */}
                                            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                                <Settings size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                <div className="text-xs text-amber-700 leading-relaxed">
                                                    <strong>Regla de Negocio R5-B:</strong> El canje genera automáticamente
                                                    <strong> dos movimientos Kardex</strong>: una entrada del lote defectuoso
                                                    y una salida del lote de reemplazo. Ambos deben ser del mismo producto.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── CANTIDAD A MOVER ── */}
                                    <div className="pt-4 border-t border-indigo-100">
                                        <div className="md:w-1/3">
                                            <label className="block text-sm font-bold text-indigo-700 mb-1">Cantidad *</label>
                                            <input 
                                                required type="number" step="any" min="0"
                                                value={cantidad} onChange={e => setCantidad(e.target.value)}
                                                className="w-full border-2 border-indigo-200 bg-white text-slate-900 text-xl font-bold rounded-xl py-2 px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. MOTIVO Y DESTINO */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-800">3. Motivo/Destino *</label>
                                    <textarea 
                                        required rows="2"
                                        value={motivo} onChange={e => setMotivo(e.target.value)}
                                        className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl py-3 px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                                        placeholder="Ej. Salida al área de hospitalización / Compra a proveedor distribuidor..."
                                    />
                                </div>

                                {/* 4. REFERENCIAS OPCIONALES (ACORDEÓN) */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <button 
                                        type="button" 
                                        onClick={() => setMostrarReferencias(!mostrarReferencias)} 
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Fingerprint size={16} /> 
                                            Referencias Opcionales de Auditoría (Factura, Guía, O.C., SIAF)
                                        </span>
                                        {mostrarReferencias ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {mostrarReferencias && (
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Cód. SIAF</label>
                                                <input value={siaf} onChange={e => setSiaf(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500" placeholder="Opcional" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">O.C.</label>
                                                <input value={ordenCompra} onChange={e => setOrdenCompra(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500" placeholder="Opcional" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Factura</label>
                                                <select value={factura} onChange={e => setFactura(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500">
                                                    <option value="">— Sin factura —</option>
                                                    {facturasRef.map(f => {
                                                        const label = `${f.tipo_documento || 'FACTURA'} ${f.numero_factura || `#${f.id}`}${f.Cliente?.razon_social ? ' · ' + f.Cliente.razon_social : ''}`;
                                                        const val = f.numero_factura || `#${f.id}`;
                                                        return <option key={f.id} value={val}>{label}</option>;
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Guía Remisión</label>
                                                <select value={guia} onChange={e => setGuia(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500">
                                                    <option value="">— Sin guía —</option>
                                                    {guiasRef.map(g => {
                                                        const val = g.numero_guia || `GR-${String(g.id).padStart(5, '0')}`;
                                                        return <option key={g.id} value={val}>{`${g.tipo_guia || 'DESPACHO'} ${val}`}</option>;
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ACTION */}
                                <div className="pt-6 border-t border-slate-100 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={guardando || !selectedProducto}
                                        className="w-full sm:w-auto rounded-xl py-3 px-8 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {guardando ? 'Firmando y Grabando en BD...' : 'Grabar Transacción Kardex'}
                                    </button>
                                </div>

                            </form>
                        ) : (
                            <div className="py-20 text-center text-slate-500">Acceso denegado a las transacciones del Kardex.</div>
                        )}
                    </div>
                )}

                {/* TAB 2: HISTORIAL KARDEX */}
                {activeTab === 2 && (
                    <div className="animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 mb-6">
                            
                            <div className="min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Operación</label>
                                <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1">
                                    <option value="">(Todas)</option>
                                    <option value="1">1 - Entradas</option>
                                    <option value="2">2 - Salidas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Rango Fecha</label>
                                <div className="flex gap-2">
                                    <input type="date" value={fFechaInicio} onChange={e => setFFechaInicio(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                    <input type="date" value={fFechaFin} onChange={e => setFFechaFin(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            
                            <div className="flex pl-4 items-end gap-2 border-l border-slate-100 ml-auto">
                                <button 
                                    onClick={fetchHistorial} 
                                    disabled={loadingHistorial}
                                    title="Actualizar historial"
                                    className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCcw size={18} className={loadingHistorial ? 'animate-spin' : ''} />
                                </button>
                                <button onClick={() => handleExport('excel')} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"><FileSpreadsheet size={16} /> Excel</button>
                                <button onClick={() => handleExport('pdf')} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg transition-colors"><FileText size={16} /> PDF</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                                        <tr>
                                            <th className="px-4 py-4 font-semibold">Fecha (Local)</th>
                                            <th className="px-4 py-4 font-semibold">Prod / Lote</th>
                                            <th className="px-4 py-4 font-semibold text-center">Tipo</th>
                                            <th className="px-4 py-4 font-semibold text-right">Monto</th>
                                            <th className="px-4 py-4 font-semibold text-right text-indigo-500">Stock Lote</th>
                                            <th className="px-4 py-4 font-semibold">Auditoría Doc / SIAF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingHistorial ? (
                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Analizando registros cruzados...</td></tr>
                                        ) : historial.length === 0 ? (
                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Kardex Limpio en este rango.</td></tr>
                                        ) : historial.map(h => {
                                            const isSalida = h.tipo_movimiento_id === 2;
                                            const fmtNum = (n) => Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                                            return (
                                                <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-4 text-slate-600 text-xs">{new Date(h.fecha_movimiento).toLocaleString()}</td>
                                                    <td className="px-4 py-4">
                                                        <span className="font-semibold text-slate-800 text-xs">{h.Producto?.codigo}</span>
                                                        <span className="block text-xs text-indigo-600 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">LT: {h.LoteProduccion?.numero_lote || h.lote_id}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">{getBadgeColor(h.tipo_movimiento_id)}</td>
                                                    <td className={`px-4 py-4 text-right font-bold ${isSalida ? 'text-rose-600' : 'text-slate-700'}`}>
                                                        {isSalida ? '-' : '+'}{fmtNum(h.cantidad)}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-indigo-600 bg-indigo-50/30">
                                                        {fmtNum(h.stock_nuevo)}
                                                    </td>
                                                    <td className="px-4 py-4 text-xs">
                                                        {h.doc_factura && <span className="block">FAC: {h.doc_factura}</span>}
                                                        {h.doc_guia_remision && <span className="block">GUIA: {h.doc_guia_remision}</span>}
                                                        {h.codigo_siaf && <span className="block font-semibold text-orange-600">SIAF: {h.codigo_siaf}</span>}
                                                        {!h.doc_factura && !h.doc_guia_remision && !h.codigo_siaf && <span className="text-slate-400">Sin Doc</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 text-sm">
                                <span className="text-slate-500">Pág. {page} de {totalPages}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 border bg-white rounded-lg"><ChevronLeft size={16} /></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="p-2 border bg-white rounded-lg"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
