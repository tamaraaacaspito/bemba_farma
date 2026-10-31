import React, { useState, useEffect } from 'react';
import { FileDown, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Reportes() {
    const [activeTab, setActiveTab] = useState(1);

    // ==========================================
    // TAB 1: EXPORTAR KARDEX
    // ==========================================
    const [productosList, setProductosList] = useState([]);
    const [productoId, setProductoId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // ==========================================
    // TAB 2: STOCK VALORIZADO
    // ==========================================
    const [inventario, setInventario] = useState([]);
    const [valorTotal, setValorTotal] = useState(0);
    const [loadingInventario, setLoadingInventario] = useState(false);

    // ==========================================
    // TAB 3: CADUCIDAD
    // ==========================================
    const [lotes, setLotes] = useState([]);
    const [loadingLotes, setLoadingLotes] = useState(false);

    useEffect(() => {
        // Cargar lista de productos para el select del Tab 1
        const fetchProductos = async () => {
            try {
                // Fetch limitando a bastantes para el select
                const { data } = await api.get('/productos', { params: { limit: 1000 } });
                setProductosList(data.data || []);
            } catch (error) {
                console.error("Error al cargar productos para select:", error);
            }
        };
        fetchProductos();
    }, []);

    useEffect(() => {
        if (activeTab === 2 && inventario.length === 0) {
            fetchInventario();
        } else if (activeTab === 3 && lotes.length === 0) {
            fetchLotesCaducidad();
        }
    }, [activeTab]);

    // -- Funciones Tab 1
    const handleDownloadKardex = async () => {
        try {
            setIsDownloading(true);
            const params = {};
            if (productoId) params.producto_id = productoId;
            if (fechaDesde) params.fecha_inicio = fechaDesde;
            if (fechaHasta) params.fecha_fin = fechaHasta;

            // El endpoint en el backend es /reportes/kardex/excel
            const response = await api.get('/reportes/kardex/excel', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kardex_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            toast.success("Excel descargado correctamente");
        } catch (error) {
            console.error("Error descargando Kardex:", error);
            toast.error("Error al descargar el reporte de Kardex");
        } finally {
            setIsDownloading(false);
        }
    };

    // -- Funciones Tab 2
    const fetchInventario = async () => {
        try {
            setLoadingInventario(true);
            const { data } = await api.get('/reportes/inventario');
            
            // Ordenar por valor total descendente
            const sorted = (data.data || []).sort((a, b) => (b.valor_stock || 0) - (a.valor_stock || 0));
            setInventario(sorted);
            setValorTotal(data.valor_total_inventario || 0);
        } catch (error) {
            console.error("Error al cargar inventario valorizado:", error);
            toast.error("Error cargando Stock Valorizado");
        } finally {
            setLoadingInventario(false);
        }
    };

    // -- Funciones Tab 3
    const fetchLotesCaducidad = async () => {
        try {
            setLoadingLotes(true);
            const { data } = await api.get('/lotes', { params: { limit: 1000, estado: '1' } });
            
            const hoy = new Date();
            
            // Mapear y calcular dias restantes
            const procesados = (data.data || []).map(lt => {
                let dias_restantes = null;
                let nivel = 'NORMAL';
                
                if (lt.fecha_vencimiento) {
                    const diffTime = new Date(lt.fecha_vencimiento) - hoy;
                    dias_restantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (dias_restantes <= 30) nivel = 'CRITICO';
                    else if (dias_restantes <= 90) nivel = 'ADVERTENCIA';
                }
                
                return {
                    ...lt,
                    dias_restantes,
                    nivel
                };
            }).filter(lt => lt.dias_restantes !== null); // Ignorar lotes sin fecha de vencimiento

            // Ordenar por dias_restantes ASC
            procesados.sort((a, b) => a.dias_restantes - b.dias_restantes);
            setLotes(procesados);
        } catch (error) {
            console.error("Error al cargar caducidad:", error);
            toast.error("Error cargando reporte de Caducidad");
        } finally {
            setLoadingLotes(false);
        }
    };

    // -- Helpers
    const formatSoles = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(val));
    const fmtNum = (val) => Number(val || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reportes</h1>
                        <p className="text-sm text-slate-500 mt-1">Generación de informes y análisis de inventario.</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button 
                            onClick={() => setActiveTab(1)} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 1 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileDown size={18} /> Exportar Kardex
                        </button>
                        <button 
                            onClick={() => setActiveTab(2)} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 2 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <TrendingUp size={18} /> Stock Valorizado
                        </button>
                        <button 
                            onClick={() => setActiveTab(3)} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 3 ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <AlertTriangle size={18} /> Caducidad
                        </button>
                    </div>
                </div>

                {/* TAB 1: EXPORTAR KARDEX */}
                {activeTab === 1 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-2xl mx-auto animate-in fade-in duration-300">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <FileDown className="text-indigo-600" /> Exportar Kardex a Excel
                        </h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Producto (Opcional)</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    value={productoId}
                                    onChange={(e) => setProductoId(e.target.value)}
                                >
                                    <option value="">Todos los productos</option>
                                    {productosList.map(p => (
                                        <option key={p.id} value={p.id}>[{p.codigo}] {p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Desde</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Hasta</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    onClick={handleDownloadKardex}
                                    disabled={isDownloading}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isDownloading ? (
                                        <>
                                            <span className="animate-spin text-xl leading-none">↻</span> Generando Excel...
                                        </>
                                    ) : (
                                        <>
                                            <FileDown size={20} /> Descargar Excel
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: STOCK VALORIZADO */}
                {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* KPI Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Valor Total del Inventario</p>
                                <h3 className="text-3xl font-bold text-emerald-600">{formatSoles(valorTotal)}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingUp size={24} />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Producto</th>
                                            <th className="px-6 py-4 font-semibold">Stock</th>
                                            <th className="px-6 py-4 font-semibold">Precio Prom.</th>
                                            <th className="px-6 py-4 font-semibold">Valor Total</th>
                                            <th className="px-6 py-4 font-semibold text-center">Alerta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingInventario ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Cargando inventario...</td>
                                            </tr>
                                        ) : inventario.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No hay datos de inventario.</td>
                                            </tr>
                                        ) : (
                                            inventario.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-slate-900">{item.codigo}</span>
                                                        <span className="block text-xs text-slate-500 truncate max-w-[300px]">{item.nombre}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-800 font-semibold">{fmtNum(item.stock_actual)}</td>
                                                    <td className="px-6 py-4 text-slate-600">{formatSoles(item.precio_unitario)}</td>
                                                    <td className="px-6 py-4 text-indigo-700 font-bold">{formatSoles(item.valor_stock)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {item.estado_stock === 'CRITICO' && <AlertTriangle size={18} className="text-orange-500 mx-auto" title="Stock Crítico" />}
                                                        {item.estado_stock === 'AGOTADO' && <AlertTriangle size={18} className="text-red-500 mx-auto" title="Stock Agotado" />}
                                                        {item.estado_stock === 'OK' && <span className="text-emerald-500 mx-auto text-xl leading-none" title="Stock OK">•</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: CADUCIDAD */}
                {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Producto</th>
                                            <th className="px-6 py-4 font-semibold">N° Lote</th>
                                            <th className="px-6 py-4 font-semibold">Fecha Venc.</th>
                                            <th className="px-6 py-4 font-semibold">Días Restantes</th>
                                            <th className="px-6 py-4 font-semibold">Stock Exacto</th>
                                            <th className="px-6 py-4 font-semibold text-center">Nivel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingLotes ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Cargando lotes...</td>
                                            </tr>
                                        ) : lotes.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No hay lotes con fecha de vencimiento próxima.</td>
                                            </tr>
                                        ) : (
                                            lotes.map(lt => (
                                                <tr key={lt.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-slate-900">{lt.Producto?.codigo}</span>
                                                        <span className="block text-xs text-slate-500 truncate max-w-[250px]">{lt.Producto?.nombre}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{lt.numero_lote || '-'}</td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {new Date(lt.fecha_vencimiento).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-bold ${lt.dias_restantes < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                            {lt.dias_restantes < 0 ? `Vencido hace ${Math.abs(lt.dias_restantes)} días` : `${lt.dias_restantes} días`}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-800 font-bold">{fmtNum(lt.stock_actual || lt.cantidad_producida)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {lt.nivel === 'CRITICO' && <span className="px-3 py-1 text-[10px] font-black rounded-lg bg-rose-100 text-rose-700 uppercase tracking-widest border border-rose-200">CRÍTICO</span>}
                                                        {lt.nivel === 'ADVERTENCIA' && <span className="px-3 py-1 text-[10px] font-black rounded-lg bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200">ADVERTENCIA</span>}
                                                        {lt.nivel === 'NORMAL' && <span className="px-3 py-1 text-[10px] font-black rounded-lg bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200">NORMAL</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
