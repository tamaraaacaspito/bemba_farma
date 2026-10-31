/**
 * src/pages/Ajustes.jsx
 * Panel de ajustes e información del sistema.
 */
import React from 'react';
import { Server, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Ajustes() {
    const { usuario } = useAuth();

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ajustes del Sistema</h1>
                    <p className="text-sm text-slate-500 mt-1">Configuración y estado general de la plataforma</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* ESTADO DEL SISTEMA, migrado desde el Dashboard */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Server size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Estado del Sistema</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Backend API (SQL Server)</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">localhost:3000/api</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Conectado
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Módulo Kardex</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">Cálculo de transacciones</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Operacional
                            </span>
                        </div>
                    </div>
                </div>

                {/* INFO DEL USUARIO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Datos de la Cuenta</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nombre Completo</p>
                            <p className="text-slate-800 font-medium">{usuario?.nombre || 'Gestor EKA'}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Rol de Acceso</p>
                            <p className="text-slate-800 font-medium mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-slate-100">
                                {usuario?.rol || 'Administrador'}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
