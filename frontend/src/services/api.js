/**
 * src/services/api.js
 * Instancia Axios configurada para el backend de Droguería EKA.
 * - Agrega el token JWT en cada petición
 * - Redirige a /login si el token expira (401)
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Instancia base ──────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor REQUEST: inyecta el token JWT ───────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('eka_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Interceptor RESPONSE: maneja 401 (token expirado / inválido) ────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Limpiar sesión y redirigir al login
            localStorage.removeItem('eka_token');
            localStorage.removeItem('eka_usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE LA API
// ═══════════════════════════════════════════════════════════════════════════

// ── Autenticación ───────────────────────────────────────────────────────────
export const loginUser    = (email, password) =>
    api.post('/auth/login', { email, password });

export const registrarUser = (datos) =>
    api.post('/auth/registro', datos);

export const getPerfil    = () =>
    api.get('/auth/perfil');

// ── Productos ───────────────────────────────────────────────────────────────
export const getProductos    = (params = {}) =>
    api.get('/productos', { params });

export const getProducto     = (id) =>
    api.get(`/productos/${id}`);

export const crearProducto   = (datos) =>
    api.post('/productos', datos);

export const actualizarProducto = (id, datos) =>
    api.put(`/productos/${id}`, datos);

export const eliminarProducto = (id) =>
    api.delete(`/productos/${id}`);

// ── Kardex ──────────────────────────────────────────────────────────────────
export const getKardex       = (params = {}) =>
    api.get('/kardex', { params });

export const getKardexProducto = (productoId, params = {}) =>
    api.get(`/kardex/producto/${productoId}`, { params });

export const postKardexEntrada = (data) =>
    api.post('/kardex/entrada', data);

export const postKardexSalida  = (data) =>
    api.post('/kardex/salida', data);

export const postKardexAjuste  = (data) =>
    api.post('/kardex/ajuste', data);

// ── Órdenes de Compra ────────────────────────────────────────────────────────
export const getOrdenes    = (params = {}) =>
    api.get('/ordenes', { params });

export const getOrden      = (id) =>
    api.get(`/ordenes/${id}`);

export const crearOrden    = (datos) =>
    api.post('/ordenes', datos);

export const actualizarOrden = (id, datos) =>
    api.put(`/ordenes/${id}`, datos);

// ── Alertas ──────────────────────────────────────────────────────────────────
export const getAlertas    = () =>
    api.get('/alertas');

export const marcarLeidaAlerta = (id) =>
    api.patch(`/alertas/${id}/leer`);

export const marcarTodasLeidas = () =>
    api.patch('/alertas/leer-todas');

// ── Reportes ─────────────────────────────────────────────────────────────────
export const getReporteStock        = () => api.get('/reportes/stock');
export const getReporteMovimientos  = (params) => api.get('/reportes/movimientos', { params });
export const descargarReporteExcel  = () =>
    api.get('/reportes/exportar/excel', { responseType: 'blob' });

// ── Documentos — Archivos subidos ────────────────────────────────────────────
export const getDocumentos = (params = {}) =>
    api.get('/documentos', { params });

export const subirDocumento = (formData) =>
    api.post('/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

// ── Facturas ─────────────────────────────────────────────────────────────────
export const getFacturas      = (params = {}) => api.get('/facturas', { params });
export const getFactura       = (id)          => api.get(`/facturas/${id}`);
export const crearFactura     = (datos)       => api.post('/facturas', datos);
export const anularFactura    = (id, motivo)  => api.patch(`/facturas/${id}/anular`, { motivo });

// ── Guías de Remisión ─────────────────────────────────────────────────────────
export const getGuias         = (params = {}) => api.get('/guias', { params });
export const getGuia          = (id)          => api.get(`/guias/${id}`);
export const crearGuia        = (datos)       => api.post('/guias', datos);
export const anularGuia       = (id, motivo)  => api.patch(`/guias/${id}/anular`, { motivo });

// ── Clientes ─────────────────────────────────────────────────────────────────
export const getClientes      = (params = {}) => api.get('/clientes', { params });
export const crearCliente     = (datos)       => api.post('/clientes', datos);

// ── Lotes ─────────────────────────────────────────────────────────────────────
export const getLotes         = (params = {}) => api.get('/lotes', { params });
export const getLotesProducto = (id)          => api.get(`/productos/${id}/lotes`);


// ── Usuarios (ADMIN) ──────────────────────────────────────────────────────────
export const getUsuarios   = (params = {}) => api.get('/usuarios', { params });
export const getUsuario    = (id) => api.get(`/usuarios/${id}`);
export const crearUsuarioAdmin = (datos) => api.post('/usuarios', datos);
export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}`, datos);
export const actualizarPasswordUsuario = (id, datos) => api.patch(`/usuarios/${id}/password`, datos);
export const toggleActivoUsuario = (id) => api.patch(`/usuarios/${id}/toggle-activo`);

// ── Dashboard / Stats ───────────────────────────────────────────────────────
export const getProductoStats = () => api.get('/productos/stats');
export const getPedidosWebStats = () => api.get('/pedidos-web/stats');

export default api;
