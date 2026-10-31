import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, AlertTriangle, XCircle, Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

export default function Inventario() {
    const { isAdmin } = useAuth();
    const location = useLocation();
    
    // Estados principales
    const [stats, setStats] = useState({ total_activos: 0, total_criticos: 0, total_agotados: 0 });
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    // Paginación y Filtros
    const [activeTab, setActiveTab] = useState(1);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busquedaTexto, setBusquedaTexto] = useState('');
    const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('1');

    // Modales y Formularios
    const [showModal, setShowModal] = useState(false);
    const [modoModal, setModoModal] = useState('NUEVO'); // 'NUEVO' o 'EDITAR'
    const [formData, setFormData] = useState({
        id: null,
        codigo: '',
        nombre: '',
        categoria_id: '',
        unidad_medida: 'UNIDAD',
        stock_inicial: 0,
        stock_minimo: 0,
        precio_unitario: '',  // precio de referencia (R1)
    });
    const [loading, setLoading] = useState(false);

    // Confirmación de eliminación (reemplaza window.confirm)
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, nombre: '' });

    // Estados Tab 2 Lotes
    const [lotes, setLotes] = useState([]);
    const [pageLotes, setPageLotes] = useState(1);
    const [totalPagesLotes, setTotalPagesLotes] = useState(1);
    const [busquedaLotes, setBusquedaLotes] = useState('');
    const [debouncedBusquedaLotes, setDebouncedBusquedaLotes] = useState('');
    const [filtroEstadoLotes, setFiltroEstadoLotes] = useState('1'); 
    const [loadingLotes, setLoadingLotes] = useState(false);
    
    // Estados de Detalle
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Drawer Lotes
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerProduct, setDrawerProduct] = useState(null);
    const [drawerLotesData, setDrawerLotesData] = useState([]);

    // Efecto de Debounce para Búsqueda
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedBusqueda(busquedaTexto), 300);
        return () => clearTimeout(timer);
    }, [busquedaTexto]);

    useEffect(() => {
        const timer2 = setTimeout(() => setDebouncedBusquedaLotes(busquedaLotes), 300);
        return () => clearTimeout(timer2);
    }, [busquedaLotes]);

    // Cargar inicial y dependencias
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const estadoParam = params.get('estado');
        if (estadoParam) {
            setFiltroEstado(estadoParam);
        }
        fetchStats();
        fetchCategorias();
    }, [location.search]);

    useEffect(() => {
        fetchProductos();
    }, [page, debouncedBusqueda, filtroCategoria, filtroEstado]);

    useEffect(() => {
        if (activeTab === 2) fetchLotes();
    }, [activeTab, pageLotes, debouncedBusquedaLotes, filtroEstadoLotes]);

    const fetchLotes = async () => {
        try {
            setLoadingLotes(true);
            const { data } = await api.get('/lotes', {
                params: {
                    page: pageLotes,
                    limit: 15,
                    busqueda: debouncedBusquedaLotes,
                    estado: filtroEstadoLotes === 'ALL' ? undefined : filtroEstadoLotes
                }
            });
            setLotes(data.data || []);
            setTotalPagesLotes(data.totalPages || 1);
        } catch (err) {
            console.error('Error fetching lotes', err);
        } finally {
            setLoadingLotes(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/productos/stats');
            setStats(data);
        } catch (err) {
            console.error('Error al cargar stats:', err);
        }
    };

    const fetchCategorias = async () => {
        try {
            // Nota: En caso no esté mapeada la ruta en backend, Axios arrojará error silencioso.
            const { data } = await api.get('/categorias').catch(() => ({ data: [] }));
            setCategorias(data || []);
        } catch (err) {
            console.error('Error al cargar categorías:', err);
        }
    };

    const fetchProductos = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/productos', {
                params: {
                    page,
                    limit: 15,
                    categoria_id: filtroCategoria,
                    busqueda: debouncedBusqueda,
                    estado: filtroEstado
                }
            });
            setProductos(data.data);
            setTotalPages(data.totalPages);
            setLoading(false);
        } catch (err) {
            console.error('Error al cargar productos:', err);
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modoModal === 'NUEVO') {
                await api.post('/productos', {
                    ...formData,
                    stock_inicial: Number(formData.stock_inicial),
                    stock_minimo: Number(formData.stock_minimo),
                    precio_unitario: formData.precio_unitario !== '' ? Number(formData.precio_unitario) : null,
                });
                toast.success('Producto registrado correctamente');
            } else {
                await api.put(`/productos/${formData.id}`, {
                    nombre: formData.nombre,
                    categoria_id: formData.categoria_id,
                    unidad_medida: formData.unidad_medida,
                    stock_minimo: Number(formData.stock_minimo),
                    precio_unitario: formData.precio_unitario !== '' ? Number(formData.precio_unitario) : null,
                });
                toast.success('Producto actualizado correctamente');
            }
            setShowModal(false);
            fetchProductos();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al procesar la solicitud');
        }
    };

    const handleEliminar = async (id) => {
        try {
            await api.delete(`/productos/${id}`);
            toast.success('Producto desactivado correctamente');
            setConfirmDelete({ show: false, id: null, nombre: '' });
            fetchProductos();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al desactivar el producto');
            setConfirmDelete({ show: false, id: null, nombre: '' });
        }
    };

    const openModalNuevo = () => {
        setFormData({
            codigo: '', nombre: '', categoria_id: '',
            unidad_medida: 'UNIDAD', stock_inicial: 0,
            stock_minimo: 0, precio_unitario: ''
        });
        setModoModal('NUEVO');
        setShowModal(true);
    };

    const openModalEditar = (prod) => {
        setFormData({
            id: prod.id,
            codigo: prod.codigo,
            nombre: prod.nombre,
            categoria_id: prod.categoria_id,
            unidad_medida: prod.unidad_medida || 'UNIDAD',
            stock_inicial: prod.stock_actual,
            stock_minimo: prod.stock_minimo,
            precio_unitario: prod.precio_unitario ?? '',
        });
        setModoModal('EDITAR');
        setShowModal(true);
    };

    const openModalDetalle = (prod) => {
        setSelectedProduct(prod);
        setShowDetailModal(true);
    };

    const openDrawerLotes = async (loteItem) => {
        if (!loteItem.Producto) return;
        setDrawerProduct(loteItem.Producto);
        setDrawerOpen(true);
        setDrawerLotesData([]);
        try {
            const { data } = await api.get(`/productos/${loteItem.Producto.id}/lotes`);
            setDrawerLotesData(data || []);
        } catch (err) {
            console.error("Error fetching product lotes", err);
        }
    };

    // UI Helpers
    const fmtNum = (val) => Number(val || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
    const renderBadge = (stock_actual, stock_minimo, estado) => {
        if (!estado) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">Inactivo</span>;
        if (Number(stock_actual) === 0) {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-rose-600">Agotado</span>;
        }
        if (Number(stock_actual) <= Number(stock_minimo)) {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-amber-600">Crítico</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">OK</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Cabecera */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario General</h1>
                        <p className="text-sm text-slate-500 mt-1">Gestión y control de catálogo y existencias.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <button onClick={() => setActiveTab(1)} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 1 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Catálogo Principal</button>
                            <button onClick={() => setActiveTab(2)} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 2 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Control de Lotes</button>
                        </div>
                        {activeTab === 1 && isAdmin() && (
                            <button 
                                onClick={openModalNuevo}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 hover:shadow transition-all focus:ring-4 focus:ring-indigo-100"
                            >
                                <Plus size={20} />
                                Nuevo Producto
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total Activos</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.total_activos}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Package size={24} />
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Stock Crítico</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.total_criticos}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                            <AlertTriangle size={24} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Agotados</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.total_agotados}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <XCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* Controles de Filtro */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por código o nombre..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            value={busquedaTexto}
                            onChange={(e) => setBusquedaTexto(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 min-w-[180px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                    >
                        <option value="">Todas las Categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 min-w-[150px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="1">Solo Activos</option>
                        <option value="CRITICO">Stock Crítico</option>
                        <option value="AGOTADO">Agotados</option>
                    </select>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Código</th>
                                    <th className="px-6 py-4 font-semibold">Nombre</th>
                                    <th className="px-6 py-4 font-semibold">Categoría</th>
                                    <th className="px-6 py-4 font-semibold">Stock</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    {isAdmin() && <th className="px-6 py-4 font-semibold text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                            <div className="animate-pulse flex flex-col items-center">
                                                <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                                                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : productos.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            No se encontraron productos que coincidan.
                                        </td>
                                    </tr>
                                ) : (
                                    productos.map(p => (
                                        <tr 
                                            key={p.id} 
                                            onClick={() => openModalDetalle(p)}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{p.codigo}</td>
                                            <td className="px-6 py-4 text-slate-700">{p.nombre}</td>
                                            <td className="px-6 py-4 text-slate-500">{p.Categoria?.nombre || '-'}</td>
                                            <td className="px-6 py-4 text-slate-800 font-semibold">{fmtNum(p.stock_actual)} <span className="text-xs text-slate-400 font-normal">{p.unidad_medida}</span></td>
                                            <td className="px-6 py-4 text-slate-500">{fmtNum(p.stock_minimo)}</td>
                                            <td className="px-6 py-4">
                                                {renderBadge(p.stock_actual, p.stock_minimo, p.estado)}
                                            </td>
                                            {isAdmin() && (
                                                <td className="px-6 py-4 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => openModalEditar(p)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Editar">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete({ show: true, id: p.id, nombre: p.nombre })}
                                                        className="text-slate-400 hover:text-rose-600 transition-colors"
                                                        title="Desactivar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Controles de Paginación */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-sm text-slate-500">
                            Página <span className="font-semibold text-slate-800">{page}</span> de <span className="font-semibold text-slate-800">{totalPages || 1}</span>
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white bg-slate-50 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
                
                {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controles de Filtro Lotes */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por lote..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-sm"
                                    value={busquedaLotes}
                                    onChange={(e) => setBusquedaLotes(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select 
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 min-w-[200px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                    value={filtroEstadoLotes}
                                    onChange={(e) => setFiltroEstadoLotes(e.target.value)}
                                >
                                    <option value="1">Con Stock (Activo)</option>
                                    <option value="VENCIDO">Lotes Vencidos (Con Stock)</option>
                                    <option value="ALL">Histórico General (Todos)</option>
                                    <option value="0">Lotes Agotados</option>
                                </select>
                                {isAdmin() && (
                                    <button 
                                        onClick={() => window.location.href='/kardex'}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-sm hover:bg-indigo-700 hover:shadow transition-all focus:ring-4 focus:ring-indigo-100 whitespace-nowrap"
                                    >
                                        <Plus size={18} /> Registrar Lote
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Tabla de Lotes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-white border-b border-slate-100 text-slate-600">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Producto Vinculado</th>
                                            <th className="px-6 py-4 font-semibold">Código de Lote</th>
                                            <th className="px-6 py-4 font-semibold">Stock Exacto</th>
                                            <th className="px-6 py-4 font-semibold">F. Vencimiento</th>
                                            <th className="px-6 py-4 font-semibold">Estado</th>
                                            <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loadingLotes ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                    <div className="animate-pulse flex flex-col items-center">
                                                        <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                                                        <div className="h-4 w-48 bg-slate-200 rounded"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : lotes.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    No hay lotes que coincidan con la búsqueda.
                                                </td>
                                            </tr>
                                        ) : (
                                            lotes.map(lt => {
                                                const hasVencimiento = !!lt.fecha_vencimiento;
                                                const vencDate = hasVencimiento ? new Date(lt.fecha_vencimiento) : null;
                                                const today = new Date();
                                                const daysDiff = vencDate ? Math.ceil((vencDate - today) / (1000 * 60 * 60 * 24)) : null;
                                                
                                                const stockReal = lt.stock_actual != null ? lt.stock_actual : lt.cantidad_producida;
                                                let estadoBadge = null;
                                                
                                                if (Number(stockReal) === 0) {
                                                    estadoBadge = <span className="px-3 py-1 bg-red-100 text-rose-600 text-xs font-bold rounded-full flex items-center gap-1 w-fit"><XCircle size={12}/> Agotado</span>;
                                                } else if (!hasVencimiento) {
                                                    estadoBadge = <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full border border-slate-200">Sin fecha</span>;
                                                } else if (daysDiff < 0) {
                                                    estadoBadge = <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit"><AlertTriangle size={12}/> Vencido</span>;
                                                } else if (daysDiff <= 60) {
                                                    estadoBadge = <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit"><AlertTriangle size={12}/> {daysDiff}d</span>;
                                                } else {
                                                    estadoBadge = <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">Activo</span>;
                                                }

                                                return (
                                                    <tr key={lt.id} className="hover:bg-slate-50/70 transition-colors group cursor-pointer" onClick={() => openDrawerLotes(lt)}>
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-slate-900 block">{lt.Producto?.codigo || '-'}</span>
                                                            <span className="block text-xs text-slate-500 truncate max-w-[250px] mt-0.5">{lt.Producto?.nombre || '-'}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-indigo-700 font-bold">{lt.codigo_lote || lt.numero_lote || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-800 font-bold">{fmtNum(stockReal)}</td>
                                                        <td className="px-6 py-4">
                                                            {hasVencimiento ? (
                                                                <span className="text-slate-600">{vencDate.toLocaleDateString()}</span>
                                                            ) : (
                                                                <span className="text-rose-500 text-xs font-semibold flex items-center gap-1"><AlertTriangle size={12}/> Sin registrar</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {estadoBadge}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-slate-400 hover:text-indigo-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                                <span className="text-sm text-slate-500">
                                    Página <span className="font-semibold text-slate-800">{pageLotes}</span> de <span className="font-semibold text-slate-800">{totalPagesLotes || 1}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setPageLotes(p => Math.max(1, p - 1))}
                                        disabled={pageLotes === 1}
                                        className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 bg-white transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setPageLotes(p => Math.min(totalPagesLotes, p + 1))}
                                        disabled={pageLotes >= totalPagesLotes}
                                        className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 bg-white transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal CRUD */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-semibold text-slate-800">
                                {modoModal === 'NUEVO' ? 'Registrar Nuevo Producto' : 'Editar Producto'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                                    <input required disabled={modoModal === 'EDITAR'} value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60" placeholder="Ej: EKA-001" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                                    <input required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="Nombre descriptivo completo" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                    <select required value={formData.categoria_id} onChange={(e) => setFormData({...formData, categoria_id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                                        <option value="">Seleccione...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida</label>
                                    <select required value={formData.unidad_medida} onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                                        <option value="UNIDAD">Unidad</option>
                                        <option value="CAJA">Caja</option>
                                        <option value="LITRO">Litro</option>
                                        <option value="METRO">Metro</option>
                                    </select>
                                </div>

                                {modoModal === 'NUEVO' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Stock Inicial</label>
                                        <input required min="0" value={formData.stock_inicial} onChange={(e) => setFormData({...formData, stock_inicial: e.target.value})} type="number" step="0.0001" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                    </div>
                                )}

                                {modoModal === 'EDITAR' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Stock Actual (Solo Lectura)</label>
                                        <input disabled value={formData.stock_inicial} type="number" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-500 focus:outline-none" title="El stock se ajusta únicamente desde el Kardex" />
                                        <p className="text-[11px] text-slate-400 mt-1">El stock se ajusta mediante Movimientos de Kardex.</p>
                                    </div>
                                )}

                                {/* Precio de Referencia */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <span className="flex items-center gap-1.5">
                                            <DollarSign size={14} className="text-slate-400" />
                                            Precio Referencia
                                            <span className="text-[10px] text-slate-400 font-normal">(sugerido para facturas)</span>
                                        </span>
                                    </label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={formData.precio_unitario}
                                        onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">El precio real de cada venta se registra en la Factura/Guía.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo (Alerta)</label>
                                    <input required min="0" value={formData.stock_minimo} onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})} type="number" step="0.0001" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm focus:ring-4 focus:ring-indigo-100">
                                    {modoModal === 'NUEVO' ? 'Guardar Producto' : 'Actualizar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle (Ficha Técnica) */}
            {showDetailModal && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        
                        {/* Cabecera Detail */}
                        <div className="relative h-32 bg-gradient-to-r from-indigo-600 to-blue-500 p-8">
                            <button 
                                onClick={() => setShowDetailModal(false)} 
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="absolute -bottom-10 left-8 p-1 bg-white rounded-2xl shadow-lg">
                                <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
                                    <Package size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-14 px-8 pb-8">
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-200">
                                        {selectedProduct.codigo}
                                    </span>
                                    {renderBadge(selectedProduct.stock_actual, selectedProduct.stock_minimo, selectedProduct.estado)}
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase italic italic-none">
                                    {selectedProduct.nombre}
                                </h2>
                                <p className="text-slate-500 font-medium mt-1 flex items-center gap-1.5 uppercase text-xs tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    {selectedProduct.Categoria?.nombre || 'Sin Categoría'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner group hover:bg-white hover:shadow-md transition-all">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Disponible</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">
                                            {Number(selectedProduct.stock_actual).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedProduct.unidad_medida}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner group hover:bg-white hover:shadow-md transition-all">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Límite Crítico</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">
                                            {Number(selectedProduct.stock_minimo).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedProduct.unidad_medida}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                            <Search size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Seguridad</p>
                                            <p className="text-sm font-bold text-slate-700">
                                                {Number(selectedProduct.stock_actual) > Number(selectedProduct.stock_minimo) 
                                                    ? 'Operación Normal' 
                                                    : Number(selectedProduct.stock_actual) === 0 ? 'Agotado (Crítico)' : 'Bajo Stock'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${Number(selectedProduct.stock_actual) > Number(selectedProduct.stock_minimo) ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    Droguería EKA S.A.C.
                                </div>
                                <button 
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-6 py-2.5 bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all active:scale-95"
                                >
                                    Cerrar Ficha
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Confirmación Eliminar */}
            {confirmDelete.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, id: null, nombre: '' })} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                <Trash2 size={22} className="text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">¿Desactivar producto?</h3>
                                <p className="text-sm text-slate-500 mt-0.5 leading-snug">
                                    <span className="font-semibold text-slate-700">{confirmDelete.nombre}</span> quedará
                                    inactivo y no aparecerá en el catálogo.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setConfirmDelete({ show: false, id: null, nombre: '' })}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleEliminar(confirmDelete.id)}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
                            >
                                Sí, desactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Drawer lateral de Lotes Activos */}
            {drawerOpen && drawerProduct && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-indigo-600 text-white p-6 relative">
                            <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                            <p className="text-[10px] font-bold text-indigo-200 mb-2 uppercase tracking-widest">Lotes Activos</p>
                            <h2 className="text-xl font-bold leading-tight mb-2 pr-6">{drawerProduct.nombre}</h2>
                            <div className="flex items-center gap-2 text-xs text-indigo-100">
                                <span className="bg-indigo-700/50 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">{drawerProduct.codigo}</span>
                                <span>{drawerProduct.Categoria?.nombre || 'Sin categoría'}</span>
                            </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex border-b border-slate-100 bg-white">
                            <div className="flex-1 p-5 border-r border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Global</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{Number(drawerProduct.stock_actual).toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{drawerProduct.unidad_medida}</span>
                                </div>
                            </div>
                            <div className="flex-1 p-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alerta Mínima</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{Number(drawerProduct.stock_minimo).toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{drawerProduct.unidad_medida}</span>
                                </div>
                            </div>
                        </div>

                        {/* List of Lotes */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <p className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">{drawerLotesData.length} LOTE(S) ENCONTRADO(S)</p>
                            
                            <div className="space-y-3">
                                {drawerLotesData.map(lt => {
                                    const hasVenc = !!lt.fecha_vencimiento;
                                    const vencDate = hasVenc ? new Date(lt.fecha_vencimiento) : null;
                                    const today = new Date();
                                    const daysDiff = vencDate ? Math.ceil((vencDate - today) / (1000 * 60 * 60 * 24)) : null;
                                    
                                    const stockRealDrawer = lt.stock_actual != null ? lt.stock_actual : lt.cantidad_producida;
                                    let badge = null;
                                    if (Number(stockRealDrawer) === 0) badge = <span className="px-2 py-0.5 bg-red-100 text-rose-600 text-[10px] font-bold rounded flex items-center gap-1 uppercase tracking-wider"><XCircle size={10}/> Agotado</span>;
                                    else if (!hasVenc) badge = <span className="text-xs font-semibold text-slate-400">Sin fecha</span>;
                                    else if (daysDiff < 0) badge = <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded flex items-center gap-1 uppercase tracking-wider"><AlertTriangle size={10}/> Vencido</span>;
                                    else if (daysDiff <= 60) badge = <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded flex items-center gap-1"><AlertTriangle size={10}/> {daysDiff}d</span>;

                                    return (
                                        <div key={lt.id} className="bg-white border border-slate-200 hover:border-indigo-200 rounded-xl p-4 shadow-sm relative overflow-hidden transition-colors group">
                                            {/* Decorative side bar */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            <div className="flex justify-between items-start mb-4 pl-2">
                                                <h3 className="font-bold text-indigo-900 font-mono text-sm">{lt.codigo_lote || lt.numero_lote}</h3>
                                                {badge}
                                            </div>
                                            <div className="flex justify-between items-end pl-2">
                                                <div>
                                                    <span className="text-xl font-black text-slate-800 tracking-tight">{fmtNum(stockRealDrawer)}</span>
                                                    <span className="text-[10px] ml-1 text-slate-500 font-bold uppercase">{drawerProduct.unidad_medida} en este lote</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-medium text-slate-600">{hasVenc ? vencDate.toLocaleDateString() : 'Sin registrar'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {drawerLotesData.length === 0 && (
                                    <div className="text-center py-10">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                            <Package size={20} />
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">No hay lotes activos disponibles</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
                            <button 
                                onClick={() => {
                                    setDrawerOpen(false);
                                    setBusquedaLotes(drawerProduct.codigo);
                                    setActiveTab(2);
                                }}
                                className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:text-indigo-800 transition-colors"
                            >
                                Ver todos los lotes →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
