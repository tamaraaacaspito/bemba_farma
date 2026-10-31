/**
 * src/components/Layout.jsx
 * Layout principal — sidebar oscuro + navbar blanca.
 * Inspirado en diseño profesional de sistemas de inventario.
 * Usa iconos lucide-react (sin emojis).
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Package, ArrowLeftRight,
    ShoppingCart, FileText, BarChart2,
    Sparkles, Users, LogOut, Menu, X,
    Bell, ChevronRight, Settings, AlertTriangle, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const NAV_LINKS = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Inicio'              },
    { to: '/inventario', icon: Package,          label: 'Inventario'          },
    { to: '/kardex',     icon: ArrowLeftRight,   label: 'Kardex'              },
    { to: '/ordenes',    icon: ShoppingCart,      label: 'Órdenes de Compra'  },
    { to: '/documentos', icon: FileText,          label: 'Documentos'         },
    { to: '/reportes',   icon: BarChart2,         label: 'Reportes'           },
    { to: '/ia',         icon: Sparkles,          label: 'Asistente IA'       },
];

const ADMIN_LINKS = [
    { to: '/usuarios',     icon: Users,  label: 'Usuarios' },
    { to: '/clientes-web', icon: Users,  label: 'Clientes B2B' },
];

export default function Layout() {
    const { usuario, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    // --- Lógica de Notificaciones ---
    const [alertas, setAlertas] = useState([]);
    const [showBell, setShowBell] = useState(false);

    const fetchAlertas = async () => {
        try {
            const { data } = await api.get('/ia/anomalias');
            setAlertas(data || []);
        } catch (error) {
            console.error("Error fetching notifications", error);
        }
    };

    useEffect(() => {
        fetchAlertas();
        const interval = setInterval(fetchAlertas, 60000); // Cada minuto
        return () => clearInterval(interval);
    }, []);

    const marcarLeida = async (id) => {
        try {
            await api.patch(`/ia/anomalias/${id}/leer`);
            setAlertas(prev => prev.filter(a => a.id !== id));
            toast.success('Notificación marcada como leída');
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };
    // --------------------------------

    const handleLogout = () => {
        logout();
        toast.success('Sesión cerrada');
        navigate('/login', { replace: true });
    };

    const ini = usuario?.nombre?.[0]?.toUpperCase() || '?';

    return (
        <div className="flex h-screen overflow-hidden bg-slate-100">

            {/* ── SIDEBAR ───────────────────────────────────────── */}
            <aside style={{ backgroundColor: '#1C1C2E', width: collapsed ? '72px' : '240px' }}
                className="flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out shadow-xl">

                {/* Logo */}
                <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
                    {/* Cuadrado teal con inicial */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                        style={{ backgroundColor: '#2ABAB4' }}>
                        EKA
                    </div>
                    {!collapsed && (
                        <div className="leading-tight overflow-hidden">
                            <p className="text-white font-semibold text-sm truncate">Droguería EKA</p>
                            <p className="text-xs" style={{ color: '#2ABAB4' }}>S.A.C.</p>
                        </div>
                    )}
                </div>

                {/* Nav principal */}
                <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
                    {!collapsed && (
                        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
                            style={{ color: '#6B7280' }}>
                            Menú
                        </p>
                    )}
                    {NAV_LINKS.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                transition-all duration-150 group cursor-pointer
                                ${isActive
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                            style={({ isActive }) => isActive ? { backgroundColor: '#2ABAB4' } : {}}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={18} className="flex-shrink-0"
                                        style={{ color: isActive ? '#fff' : undefined }} />
                                    {!collapsed && <span className="truncate">{label}</span>}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Admin */}
                    {isAdmin() && (
                        <>
                            {!collapsed && (
                                <p className="text-xs font-semibold uppercase tracking-widest px-3 mt-5 mb-3"
                                    style={{ color: '#6B7280' }}>
                                    Admin
                                </p>
                            )}
                            {ADMIN_LINKS.map(({ to, icon: Icon, label }) => (
                                <NavLink key={to} to={to}
                                    title={collapsed ? label : undefined}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                        transition-all duration-150
                                        ${isActive
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                    style={({ isActive }) => isActive ? { backgroundColor: '#2ABAB4' } : {}}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon size={18} className="flex-shrink-0" />
                                            {!collapsed && <span>{label}</span>}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                {/* Usuario abajo */}
                {!collapsed && (
                    <div className="border-t border-white/10 px-3 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center
                                text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: '#2ABAB4' }}>
                                {ini}
                            </div>
                            <div className="overflow-hidden flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate">{usuario?.nombre}</p>
                                <p className="text-xs truncate" style={{ color: '#6B7280' }}>{usuario?.rol}</p>
                            </div>
                            <button onClick={handleLogout}
                                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
                                title="Cerrar sesión">
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── ZONA PRINCIPAL ────────────────────────────────── */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* NAVBAR */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center
                    justify-between px-6 flex-shrink-0 shadow-sm">

                    <div className="flex items-center gap-4">
                        {/* Toggle sidebar */}
                        <button onClick={() => setCollapsed(!collapsed)}
                            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                            {collapsed ? <Menu size={20} /> : <X size={20} />}
                        </button>

                        {/* Breadcrumb / título */}
                        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                            <span className="font-medium text-slate-700">Droguería EKA S.A.C.</span>
                            <ChevronRight size={14} />
                            <span>Sistema de Inventarios</span>
                        </div>
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-3 relative">
                        {/* Notificaciones */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowBell(!showBell)}
                                className="relative text-slate-500 hover:text-slate-800 p-2
                                rounded-lg hover:bg-slate-100 transition-colors">
                                <Bell size={18} />
                                {alertas.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                                        {alertas.length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown de Notificaciones */}
                            {showBell && (
                                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Centro de Alertas IA</h3>
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{alertas.length} NUEVAS</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                        {alertas.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Bell size={20} className="text-slate-300" />
                                                </div>
                                                <p className="text-sm text-slate-400">No hay alertas nuevas</p>
                                            </div>
                                        ) : (
                                            alertas.map(alerta => (
                                                <div key={alerta.id} className="p-4 hover:bg-slate-50 transition-colors group relative">
                                                    <div className="flex gap-3">
                                                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alerta.tipo_id === 4 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            {alerta.tipo_id === 4 ? <AlertTriangle size={16} /> : <Info size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-slate-800 leading-tight mb-1">{alerta.TipoAlerta?.nombre || 'Alerta de Inventario'}</p>
                                                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{alerta.mensaje}</p>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                                                    {new Date(alerta.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <button 
                                                                    onClick={() => marcarLeida(alerta.id)}
                                                                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                                                                >
                                                                    Marcar como leída
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {alertas.length > 0 && (
                                        <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                                            <button 
                                                onClick={() => {
                                                    setShowBell(false);
                                                    navigate('/dashboard');
                                                }}
                                                className="text-[10px] text-slate-500 font-bold hover:text-indigo-600"
                                            >
                                                Ver todas las anomalías
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Configuración */}
                        <button 
                            onClick={() => navigate('/ajustes')}
                            className="text-slate-500 hover:text-slate-800 p-2
                            rounded-lg hover:bg-slate-100 transition-colors">
                            <Settings size={18} />
                        </button>

                        {/* Chip usuario */}
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center
                                text-white text-xs font-bold"
                                style={{ backgroundColor: '#2ABAB4' }}>
                                {ini}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-semibold text-slate-700 leading-none">{usuario?.nombre}</p>
                                <p className="text-xs text-slate-400 leading-none mt-0.5">{usuario?.rol}</p>
                            </div>
                        </div>

                        {/* Logout */}
                        <button onClick={handleLogout}
                            title="Cerrar sesión"
                            className="text-slate-500 hover:text-red-500 p-2 rounded-lg
                            hover:bg-red-50 transition-colors">
                            <LogOut size={17} />
                        </button>
                    </div>
                </header>

                {/* CONTENIDO */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
