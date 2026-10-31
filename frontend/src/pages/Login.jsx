/**
 * src/pages/Login.jsx
 * Pantalla de login profesional — Droguería EKA S.A.C.
 * Diseño: split en dos paneles (izq: branding, der: formulario)
 * Colores basados en el logo EKA: teal #2ABAB4
 * Sin emojis — iconos lucide-react.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Loader2, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email,      setEmail]      = useState('');
    const [password,   setPassword]   = useState('');
    const [cargando,   setCargando]   = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            toast.error('Ingresa tu correo y contraseña');
            return;
        }
        setCargando(true);
        try {
            await login(email.trim(), password);
            toast.success('Bienvenido a Droguería EKA');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const status = err.response?.status;
            if (status === 404) toast.error('No existe una cuenta con ese correo');
            else if (status === 401) toast.error('Contraseña incorrecta');
            else if (status === 403) toast.error('Cuenta desactivada');
            else toast.error(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setCargando(false);
        }
    };

    // ── MODO DEMO: solo para desarrollo sin BD activa ─────────────────────────
    const handleModoDemo = () => {
        localStorage.setItem('eka_token', 'dev-token-sin-bd-2026');
        localStorage.setItem('eka_usuario', JSON.stringify({
            id: 1,
            nombre: 'Admin EKA (Demo)',
            email: 'admin@drogueria-eka.com',
            rol: 'ADMIN',
            estado: 1
        }));
        toast.success('Modo Demo activado — sin conexión a BD');
        navigate('/dashboard', { replace: true });
    };

    return (
        <div className="min-h-screen flex">

            {/* Panel izquierdo — branding EKA */}
            <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
                style={{ backgroundColor: '#1C1C2E' }}>

                {/* Decoración de fondo */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full opacity-10"
                        style={{ backgroundColor: '#2ABAB4' }} />
                    <div className="absolute bottom-[-15%] left-[-10%] w-80 h-80 rounded-full opacity-8"
                        style={{ backgroundColor: '#2ABAB4' }} />
                </div>

                <div className="relative z-10 text-center max-w-md">
                    {/* Logo cuadrado EKA */}
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8
                        font-bold text-white text-2xl tracking-wider shadow-2xl"
                        style={{ backgroundColor: '#2ABAB4' }}>
                        EKA
                    </div>

                    <h1 className="text-white text-3xl font-bold mb-2">
                        Droguería EKA S.A.C.
                    </h1>
                    <p className="text-slate-400 text-sm mb-10">
                        Sistema de Gestión de Inventarios
                    </p>

                    {/* Puntos destacados */}
                    <div className="space-y-4 text-left">
                        {[
                            'Control de inventario en tiempo real',
                            'Trazabilidad completa de movimientos',
                            'Reportes y exportación a Excel',
                            'Alertas automáticas de stock mínimo',
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: '#2ABAB4' }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10">
                                        <path d="M1.5 5 L4 7.5 L8.5 2.5" stroke="white" strokeWidth="1.5"
                                            fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="text-slate-300 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="absolute bottom-6 text-slate-600 text-xs">
                    © 2026 Droguería EKA S.A.C.
                </p>
            </div>

            {/* Panel derecho — formulario */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-slate-50">

                {/* Logo móvil */}
                <div className="lg:hidden mb-8 text-center">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto
                        font-bold text-white text-lg mb-3"
                        style={{ backgroundColor: '#2ABAB4' }}>
                        EKA
                    </div>
                    <h1 className="text-slate-800 text-xl font-bold">Droguería EKA S.A.C.</h1>
                </div>

                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Iniciar sesión</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Ingresa tus credenciales para acceder al sistema
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@drogueria-eka.com"
                                    disabled={cargando}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm
                                        text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200
                                        focus:border-[#2ABAB4] focus:ring-4 focus:ring-[#2ABAB4]/10 shadow-sm
                                        disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={mostrarPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={cargando}
                                    className="w-full pl-11 pr-12 py-3 bg-white border border-slate-300 rounded-xl text-sm
                                        text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200
                                        focus:border-[#2ABAB4] focus:ring-4 focus:ring-[#2ABAB4]/10 shadow-sm
                                        disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <button type="button"
                                    onClick={() => setMostrarPass(!mostrarPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {mostrarPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Botón principal */}
                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full flex items-center justify-center gap-2 py-3 px-6
                                rounded-xl text-base font-semibold text-white transition-all duration-200
                                hover:opacity-90 active:scale-[0.98]
                                disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#2ABAB4]/20"
                            style={{ backgroundColor: '#2ABAB4' }}
                        >
                            {cargando
                                ? <><Loader2 size={16} className="animate-spin" /> Verificando...</>
                                : 'Iniciar sesión'
                            }
                        </button>

                        {/* ── Separador modo demo ─────────────────────────── */}
                        <div className="relative my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-slate-50 text-slate-400 font-medium">
                                    desarrollo sin BD
                                </span>
                            </div>
                        </div>

                        {/* Botón Modo Demo — solo para desarrollo */}
                        <button
                            type="button"
                            onClick={handleModoDemo}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-6
                                rounded-xl text-sm font-semibold border-2 border-dashed border-amber-300
                                text-amber-700 bg-amber-50 hover:bg-amber-100
                                transition-all duration-200 active:scale-[0.98]"
                        >
                            <FlaskConical size={16} />
                            Entrar en Modo Demo (sin base de datos)
                        </button>

                    </form>

                    <p className="text-center text-slate-400 text-xs mt-8">
                        Droguería EKA S.A.C. — Sistema de Inventarios v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
