import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Truck, DollarSign, Package, RefreshCw, Clock, Calendar, ChevronDown, Filter } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
    AreaChart, Area, ComposedChart, Line, PieChart, Pie
} from 'recharts';

export default function Dashboard() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    
    // Estados de datos
    const [stats, setStats] = useState({
        costoTotal: 0,
        stockTotal: 0,
        stockMinimoTotal: 0,
        entradasTotales: 0,
        salidasTotales: 0,
        porReponer: 0,
        lotesVencidos: 0
    });
    const [chartDataCat, setChartDataCat] = useState([]);
    const [chartDataMovs, setChartDataMovs] = useState([]);
    
    // Estados de UI/Filtros
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [filterType, setFilterType] = useState('month'); // 'all', 'month', 'week', 'custom'
    const [customRange, setCustomRange] = useState({ 
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    // Helper para obtener params de fecha
    const getDateParams = useCallback(() => {
        if (filterType === 'all') return {};
        
        let start = new Date();
        const end = new Date().toISOString().split('T')[0];

        if (filterType === 'month') {
            start.setMonth(start.getMonth() - 1);
        } else if (filterType === 'week') {
            start.setDate(start.getDate() - 7);
        } else if (filterType === 'custom') {
            return { fecha_inicio: customRange.start, fecha_fin: customRange.end };
        }

        return { 
            fecha_inicio: start.toISOString().split('T')[0], 
            fecha_fin: end 
        };
    }, [filterType, customRange]);

    const loadStats = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            else setIsRefreshing(true);

            const dateParams = getDateParams();
            
            const [movResponse, prodResponse, caducidadResponse] = await Promise.all([
                api.get('/kardex', { params: { limit: 500, ...dateParams } }).catch(() => ({ data: { data: [] } })),
                api.get('/productos', { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
                api.get('/reportes/caducidad').catch(() => ({ data: { data: [] } }))
            ]);
            
            const productos = prodResponse.data?.data || [];
            const movimientos = movResponse.data?.data || [];
            const lotesCaducidad = caducidadResponse.data?.data || [];

            let costoTotal = 0;
            let stockTotal = 0;
            let stockMinimoTotal = 0;
            let porReponer = 0;
            let lotesVencidos = 0;
            
            // Contar lotes vencidos o por vencer (< 30 días)
            lotesCaducidad.forEach(lote => {
                if (lote.nivel === 'CRITICO') lotesVencidos++;
            });

            const catMap = {};
            productos.forEach(p => {
                const sAct = Number(p.stock_actual) || 0;
                const sMin = Number(p.stock_minimo) || 0;
                const cost = sAct * Number(p.precio_unitario || 0);
                
                costoTotal += cost;
                stockTotal += sAct;
                stockMinimoTotal += sMin;
                if (sAct <= sMin) porReponer++;
                
                const cName = p.Categoria?.nombre || 'General';
                if (!catMap[cName]) catMap[cName] = { name: cName, stock: 0, costo: 0, stockMinimo: 0 };
                catMap[cName].stock += sAct;
                catMap[cName].costo += cost;
                catMap[cName].stockMinimo += sMin;
            });
            const catArr = Object.values(catMap).sort((a,b) => b.stock - a.stock);

            const movsGrouped = movimientos.reduce((acc, m) => {
                const d = new Date(m.fecha_movimiento).toLocaleDateString('es-PE', { day:'numeric', month: 'short' });
                if (!acc[d]) acc[d] = { name: d, Entradas: 0, Salidas: 0 };
                if (m.tipo_movimiento_id === 1) acc[d].Entradas += Number(m.cantidad) || 0;
                else if (m.tipo_movimiento_id === 2) acc[d].Salidas += Number(m.cantidad) || 0;
                return acc;
            }, {});
            const movsArr = Object.values(movsGrouped).reverse();

            let entradasTotales = movimientos.filter(m => m.tipo_movimiento_id===1).reduce((s,m) => s + (Number(m.cantidad)||0), 0);
            let salidasTotales = movimientos.filter(m => m.tipo_movimiento_id===2).reduce((s,m) => s + (Number(m.cantidad)||0), 0);

            setStats({
                costoTotal,
                stockTotal,
                stockMinimoTotal,
                entradasTotales,
                salidasTotales,
                porReponer,
                lotesVencidos
            });
            
            setChartDataCat(catArr);
            setChartDataMovs(movsArr);
            setLastUpdate(new Date());

        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [getDateParams]);

    useEffect(() => {
        loadStats();
    }, [filterType, customRange, loadStats]);

    useEffect(() => {
        const interval = setInterval(() => {
            loadStats(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val);
    const kFormatter = (num) => Number(num).toLocaleString('es-PE');

    const HalfDonutChart = ({ value, color, text }) => (
        <div className="flex flex-col items-center justify-center w-full h-full relative group">
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tighter group-hover:text-slate-600 transition-colors">{text}</p>
            <div style={{ width: '110px', height: '55px' }} className="relative mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={[{value: value || 0.001}]} 
                            cx="50%" cy="100%" 
                            startAngle={180} endAngle={0} 
                            innerRadius={35} outerRadius={50} 
                            dataKey="value" stroke="none"
                        >
                            <Cell fill={color} className="drop-shadow-sm" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-0 text-center flex items-end justify-center pb-1">
                    <span className="text-sm font-extrabold text-slate-800">{kFormatter(value)}</span>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center p-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-eka-100 border-t-eka-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Truck size={20} className="text-eka-500 animate-pulse" />
                    </div>
                </div>
                <p className="text-slate-600 font-bold text-lg tracking-tight">Sincronizando Almacenes...</p>
                <p className="text-slate-400 text-sm max-w-xs">Estamos recopilando la última información del inventario para ti.</p>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-[1400px] mx-auto font-sans bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-eka-600 via-eka-500 to-eka-600 text-white rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-eka-500/30 border border-white/10 relative overflow-hidden gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-eka-900/10 rounded-full -ml-20 -mb-20 blur-2xl"></div>
                
                <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/10 shadow-inner">
                        <Truck className="w-9 h-9" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 italic">
                            EKA <span className="font-light not-italic opacity-70">Dashboard</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1.5 text-[10px] bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-400/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Monitoring
                            </span>
                            <span className="text-[10px] text-white/50 font-bold flex items-center gap-1.5 ml-1">
                                <Clock size={12} className="opacity-70" />
                                {lastUpdate.toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filtros de Fecha */}
                <div className="flex flex-wrap items-center gap-2 relative z-10 bg-black/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/5">
                    {[
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mes' },
                        { id: 'all', label: 'Todo' },
                        { id: 'custom', label: 'Elegir' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilterType(f.id)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                filterType === f.id 
                                ? 'bg-white text-eka-600 shadow-lg shadow-white/10 scale-105' 
                                : 'hover:bg-white/5 text-white/70'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    
                    {filterType === 'custom' && (
                        <div className="flex items-center gap-2 ml-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <input 
                                type="date" 
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))}
                                className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-white/40"
                            />
                            <span className="text-white/40 font-bold">→</span>
                            <input 
                                type="date" 
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))}
                                className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-white/40"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <button 
                        onClick={() => loadStats(true)}
                        disabled={isRefreshing}
                        className={`p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 shadow-lg ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                        title="Refrescar datos"
                    >
                        <RefreshCw size={22} />
                    </button>
                    <div className="text-right text-sm border-l border-white/20 pl-4">
                        <p className="font-bold text-white text-base leading-none">{usuario?.nombre || 'Admin EKA'}</p>
                        <p className="text-[10px] font-black text-white/50 uppercase mt-1 tracking-widest">Control Center</p>
                    </div>
                </div>
            </div>

            {/* Fila 1 KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-8">
                
                <div className="md:col-span-12 lg:col-span-5 flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className="absolute -top-6 -right-6 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-all group-hover:scale-110">
                            <DollarSign size={140} />
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="bg-eka-50 rounded-2xl p-3 text-eka-600 shadow-inner border border-eka-100/50"><DollarSign size={26}/></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
                                <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>{formatCurrency(stats.costoTotal)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className="absolute -top-6 -right-6 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-all group-hover:scale-110">
                            <Package size={140} />
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="bg-sky-50 rounded-2xl p-3 text-sky-600 shadow-inner border border-sky-100/50"><Package size={26}/></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Artículos</p>
                                <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>{stats.stockTotal.toLocaleString('es-PE')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-12 lg:col-span-7 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-around items-center min-h-[160px] relative">
                    <div className="w-1/3 border-r border-slate-100/60 px-2">
                        <HalfDonutChart text="Entradas" value={stats.entradasTotales} color="#fbbf24" />
                    </div>
                    <div className="w-1/3 border-r border-slate-100/60 px-2">
                        <HalfDonutChart text="Salidas" value={stats.salidasTotales} color="#3b82f6" />
                    </div>
                    <div className="w-1/3 px-2">
                        <HalfDonutChart text="Flujo Total" value={stats.entradasTotales + stats.salidasTotales} color="#a855f7" />
                    </div>
                </div>

            </div>

            {/* Fila 2 Gráficos Centrales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                
                <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                    <h3 className="text-xs font-black text-slate-800 mb-8 tracking-widest uppercase flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-cyan-500 rounded-full"></span>
                            Inversión por Categoría
                        </span>
                        <Filter size={14} className="text-slate-300" />
                    </h3>
                    <div style={{ width: '100%', height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataCat} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                                <YAxis tickFormatter={kFormatter} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '12px' }}
                                    cursor={{ fill: '#f8fafc' }} 
                                    formatter={(val) => formatCurrency(val)} 
                                />
                                <Bar dataKey="costo" fill="#06b6d4" barSize={22} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all col-span-1">
                    <h3 className="text-xs font-black text-slate-800 mb-8 tracking-widest uppercase flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
                            Demanda Temporal
                        </span>
                        <Calendar size={14} className="text-slate-300" />
                    </h3>
                    <div style={{ width: '100%', height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDataMovs} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="cSalidas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={kFormatter} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                />
                                <Area type="monotone" dataKey="Salidas" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#cSalidas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                    <h3 className="text-xs font-black text-slate-800 mb-2 tracking-widest uppercase flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                        Status de Reposición
                    </h3>
                    <div className="flex gap-5 mb-6">
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.1em]">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Stock
                        </span>
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.1em]">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shadow-sm"></span> Mínimo
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartDataCat} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                                <YAxis tickFormatter={kFormatter} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                />
                                <Bar dataKey="stock" fill="#10b981" barSize={18} radius={[6, 6, 0, 0]} />
                                <Line type="monotone" dataKey="stockMinimo" stroke="#1e293b" strokeWidth={3} dot={{ r: 4, fill: '#1e293b', strokeWidth: 0 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Fila 3 Tablas Inferiores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pb-10">
                
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col hover:shadow-xl transition-all">
                    <h3 className="text-xs font-black text-slate-800 mb-8 tracking-[0.25em] uppercase text-center flex items-center justify-center gap-3">
                        <span className="w-8 h-px bg-slate-200"></span>
                        Distribución de Almacén
                        <span className="w-8 h-px bg-slate-200"></span>
                    </h3>
                    <div className="flex-1 w-full" style={{ minHeight: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={chartDataCat} margin={{ top: 5, right: 25, left: 35, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={130} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                    formatter={(v) => kFormatter(v)} 
                                />
                                <Bar dataKey="stock" barSize={14} radius={[0, 12, 12, 0]}>
                                     {chartDataCat.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#06b6d4' : '#10b981'} fillOpacity={0.9} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-50 rounded-full blur-3xl opacity-60 group-hover:bg-emerald-100 transition-colors"></div>
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-sky-50 rounded-full blur-2xl opacity-40"></div>
                    
                    <h3 className="text-sm font-black text-emerald-700 mb-10 flex items-center gap-3 uppercase tracking-[0.2em] relative z-10">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"></span> 
                        Estado Crítico de Inventario
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-8 w-full max-w-sm relative z-10">
                        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="bg-emerald-500/10 text-emerald-700 text-center text-[10px] py-2.5 font-black uppercase tracking-widest">Disponible</div>
                            <div className="text-center py-6 font-black text-3xl text-slate-800 tracking-tighter">{kFormatter(stats.stockTotal)}</div>
                        </div>
                        <div 
                            onClick={() => navigate('/inventario?estado=CRITICO')}
                            className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group/kpi"
                        >
                            <div className="bg-emerald-500/10 text-emerald-700 text-center text-[10px] py-2.5 font-black uppercase tracking-widest group-hover/kpi:bg-emerald-500 group-hover/kpi:text-white transition-colors">Stock Mínimo</div>
                            <div className="text-center py-6 font-black text-3xl text-slate-800 tracking-tighter group-hover/kpi:text-emerald-600 transition-colors">{kFormatter(stats.stockMinimoTotal)}</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="bg-slate-50 text-slate-500 text-center text-[10px] py-2.5 font-black uppercase tracking-widest">Seguridad</div>
                            <div className="text-center py-6 font-black text-3xl text-slate-800 tracking-tighter">{Math.max(0, stats.stockTotal - stats.stockMinimoTotal).toLocaleString()}</div>
                        </div>
                        <div 
                            onClick={() => navigate('/inventario')}
                            className="bg-white/60 backdrop-blur-md border border-red-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group/kpi"
                        >
                            <div className="bg-red-500/10 text-red-700 text-center text-[10px] py-2.5 font-black uppercase tracking-widest group-hover/kpi:bg-red-500 group-hover/kpi:text-white transition-colors">Vencidos / Críticos</div>
                            <div className="text-center py-6 font-black text-3xl text-red-600 tracking-tighter group-hover/kpi:text-red-700 transition-colors">{stats.lotesVencidos}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
