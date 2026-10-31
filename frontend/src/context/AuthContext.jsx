/**
 * src/context/AuthContext.jsx
 * Contexto global de autenticación. Provee:
 *   - usuario, token, cargando
 *   - login(), logout()
 *   - helpers: isAdmin(), isAlmacen(), isLectura()
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario,  setUsuario]  = useState(null);
    const [token,    setToken]    = useState(null);
    const [cargando, setCargando] = useState(true);

    // ── Al montar: restaurar sesión desde localStorage ─────────────────────
    useEffect(() => {
        try {
            const tokenGuardado   = localStorage.getItem('eka_token');
            const usuarioGuardado = localStorage.getItem('eka_usuario');

            if (tokenGuardado && usuarioGuardado) {
                setToken(tokenGuardado);
                setUsuario(JSON.parse(usuarioGuardado));
            }
        } catch {
            // Si el JSON está corrupto, limpiar
            localStorage.removeItem('eka_token');
            localStorage.removeItem('eka_usuario');
        } finally {
            setCargando(false);
        }
    }, []);

    // ── login: llama al backend, guarda en localStorage y contexto ─────────
    const login = useCallback(async (email, password) => {
        const { data } = await loginUser(email, password);

        localStorage.setItem('eka_token',   data.token);
        localStorage.setItem('eka_usuario', JSON.stringify(data.usuario));

        setToken(data.token);
        setUsuario(data.usuario);

        return data;
    }, []);

    // ── logout: limpia everything ──────────────────────────────────────────
    const logout = useCallback(() => {
        localStorage.removeItem('eka_token');
        localStorage.removeItem('eka_usuario');
        setToken(null);
        setUsuario(null);
    }, []);

    // ── Helpers de rol ─────────────────────────────────────────────────────
    const isAdmin   = () => usuario?.rol === 'ADMIN';
    const isAlmacen = () => usuario?.rol === 'ALMACEN' || usuario?.rol === 'ADMIN';
    const isLectura = () => !!usuario;   // cualquier rol autenticado

    const value = {
        usuario,
        token,
        cargando,
        login,
        logout,
        isAdmin,
        isAlmacen,
        isLectura,
        autenticado: !!token,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook personalizado para consumir el contexto
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
}

export default AuthContext;
