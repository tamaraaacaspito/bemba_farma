import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Lock, ToggleLeft, ToggleRight, Shield, X, AlertCircle } from 'lucide-react';
import { getUsuarios, crearUsuarioAdmin, actualizarUsuario, actualizarPasswordUsuario, toggleActivoUsuario } from '../services/api';
import toast from 'react-hot-toast';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filtros
    const [filtros, setFiltros] = useState({ rol: '', activo: '' });

    // Modales
    const [modal, setModal] = useState({ open: false, modo: 'crear', usuarioActual: null });
    const [passwordModal, setPasswordModal] = useState({ open: false, usuarioActual: null });

    // Cargar usuarios
    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filtros.rol) params.rol = filtros.rol;
            if (filtros.activo !== '') params.activo = filtros.activo;

            const response = await getUsuarios(params);
            setUsuarios(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            setError('Error al cargar la lista de usuarios. Verifica tus permisos de administrador.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
        // eslint-disable-next-line
    }, [filtros]);

    // Helpers
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const handleToggleActivo = async (user) => {
        const accion = user.activo ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Estás seguro de que deseas ${accion} al usuario ${user.nombre}?`)) {
            return;
        }

        try {
            await toggleActivoUsuario(user.id);
            toast.success(`Usuario ${accion}do exitosamente.`);
            fetchUsuarios();
        } catch (err) {
            toast.error(`Error al ${accion} el usuario.`);
        }
    };

    const openModalCrear = () => {
        setModal({ open: true, modo: 'crear', usuarioActual: null });
    };

    const openModalEditar = (user) => {
        setModal({ open: true, modo: 'editar', usuarioActual: user });
    };

    const openModalPassword = (user) => {
        setPasswordModal({ open: true, usuarioActual: user });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="text-indigo-600" size={32} />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-1.5">
                        <Shield size={16} className="text-emerald-600" />
                        Solo visible para Administradores • {usuarios.length} usuarios registrados
                    </p>
                </div>
                
                <button 
                    onClick={openModalCrear}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
                >
                    <UserPlus size={20} />
                    Nuevo Usuario
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar por Rol</label>
                    <select 
                        value={filtros.rol} 
                        onChange={e => setFiltros(prev => ({...prev, rol: e.target.value}))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-40"
                    >
                        <option value="">Todos</option>
                        <option value="ADMIN">Admin</option>
                        <option value="ALMACEN">Almacén</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar por Estado</label>
                    <select 
                        value={filtros.activo} 
                        onChange={e => setFiltros(prev => ({...prev, activo: e.target.value}))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-40"
                    >
                        <option value="">Todos</option>
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                    </select>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Usuario</th>
                                <th className="px-6 py-4 font-semibold">Rol</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Cargando usuarios...</td></tr>
                            ) : usuarios.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No se encontraron usuarios.</td></tr>
                            ) : (
                                usuarios.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                                                    {getInitials(user.nombre)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{user.nombre}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${user.rol === 'ADMIN' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {user.rol || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-1.5 w-fit ${user.activo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.activo ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {user.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => openModalEditar(user)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editar usuario"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => openModalPassword(user)}
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Cambiar contraseña"
                                                >
                                                    <Lock size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleActivo(user)}
                                                    className={`p-2 rounded-lg transition-colors ${user.activo ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                                >
                                                    {user.activo ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
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

            {/* MODAL CREAR / EDITAR */}
            {modal.open && (
                <ModalFormUsuario 
                    modo={modal.modo} 
                    usuarioActual={modal.usuarioActual}
                    onClose={() => setModal({ open: false, modo: 'crear', usuarioActual: null })}
                    onSuccess={fetchUsuarios}
                />
            )}

            {/* MODAL PASSWORD */}
            {passwordModal.open && (
                <ModalCambiarPassword 
                    usuarioActual={passwordModal.usuarioActual}
                    onClose={() => setPasswordModal({ open: false, usuarioActual: null })}
                />
            )}

        </div>
    );
}

// -----------------------------------------------------------------------------
// COMPONENTES MODALES
// -----------------------------------------------------------------------------

function ModalFormUsuario({ modo, usuarioActual, onClose, onSuccess }) {
    const isEdit = modo === 'editar';
    
    const [formData, setFormData] = useState({
        nombre: usuarioActual?.nombre || '',
        email: usuarioActual?.email || '',
        rol: usuarioActual?.rol || 'ALMACEN',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!formData.nombre || !formData.email) {
            return setErrorMsg('Nombre y Email son requeridos.');
        }

        if (!isEdit && (!formData.password || formData.password.length < 8)) {
            return setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
        }

        try {
            setLoading(true);
            if (isEdit) {
                await actualizarUsuario(usuarioActual.id, { 
                    nombre: formData.nombre, 
                    email: formData.email, 
                    rol: formData.rol 
                });
                toast.success('Usuario actualizado correctamente');
            } else {
                await crearUsuarioAdmin({
                    nombre: formData.nombre,
                    email: formData.email,
                    rol: formData.rol,
                    password: formData.password
                });
                toast.success('Usuario creado correctamente');
            }
            onSuccess();
            onClose();
        } catch (error) {
            if (error.response?.status === 409) {
                setErrorMsg('El email ya está en uso');
            } else {
                setErrorMsg(error.response?.data?.error || 'Error al guardar el usuario');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-indigo-600" size={20} />
                        {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors shadow-sm bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                            <input 
                                type="text" 
                                required
                                value={formData.nombre}
                                onChange={e => setFormData({...formData, nombre: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                            <input 
                                type="email" 
                                required
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="usuario@drogueriaeka.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Rol del Sistema</label>
                            <select 
                                value={formData.rol}
                                onChange={e => setFormData({...formData, rol: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            >
                                <option value="ALMACEN">ALMACEN (Operativo)</option>
                                <option value="ADMIN">ADMIN (Acceso Total)</option>
                            </select>
                        </div>

                        {!isEdit && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña Inicial</label>
                                <input 
                                    type="password" 
                                    required
                                    minLength={8}
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2">
                                {loading ? 'Guardando...' : 'Guardar Usuario'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function ModalCambiarPassword({ usuarioActual, onClose }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (password.length < 8) {
            return setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
        }

        try {
            setLoading(true);
            await actualizarPasswordUsuario(usuarioActual.id, { nueva_password: password });
            toast.success('Contraseña actualizada correctamente');
            onClose();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Error al cambiar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-amber-100 bg-amber-50">
                    <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                        <Lock size={20} className="text-amber-600" />
                        Cambiar Contraseña
                    </h2>
                    <button onClick={onClose} className="p-2 text-amber-600 hover:bg-white rounded-xl transition-colors shadow-sm bg-amber-100/50">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Actualizando credenciales para: <span className="font-semibold text-slate-800">{usuarioActual.nombre}</span>
                    </p>

                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nueva Contraseña</label>
                            <input 
                                type="password" 
                                required
                                minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                placeholder="Escribe la nueva contraseña"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-70">
                                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
