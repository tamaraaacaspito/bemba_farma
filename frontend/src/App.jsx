/**
 * src/App.jsx
 * Punto de entrada de rutas con React Router v6.
 * Incluye ProtectedRoute para bloquear acceso sin token.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import Login      from './pages/Login';
import Layout     from './components/Layout';
import Dashboard  from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Kardex     from './pages/Kardex';
import OrdenesCompra from './pages/OrdenesCompra';
import Documentos from './pages/Documentos';
import Ajustes    from './pages/Ajustes';
import ClientesWeb from './pages/ClientesWeb';
import Reportes   from './pages/Reportes';
import AsistenteIA from './pages/AsistenteIA';
import Usuarios   from './pages/Usuarios';

// Páginas placeholder (se implementan en sprints posteriores)
const Placeholder = ({ titulo }) => (
    <div className="flex flex-col items-center justify-center h-80 text-gray-400">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-semibold text-gray-600">{titulo}</h2>
        <p className="mt-2 text-sm">Esta sección se implementará en el siguiente sprint.</p>
    </div>
);

// ── ProtectedRoute: redirige a /login si no hay sesión activa ────────────────
function ProtectedRoute({ children }) {
    const { autenticado, cargando } = useAuth();

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-eka-700">
                <div className="text-white text-center">
                    <div className="animate-spin text-4xl mb-4">⚕️</div>
                    <p className="text-lg font-medium">Cargando Droguería EKA...</p>
                </div>
            </div>
        );
    }

    return autenticado ? children : <Navigate to="/login" replace />;
}

// ── Rutas principales ────────────────────────────────────────────────────────
function AppRoutes() {
    return (
        <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas — dentro del Layout (sidebar + navbar) */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"   element={<Dashboard />} />
                <Route path="inventario"  element={<Inventario />} />
                <Route path="kardex"      element={<Kardex />} />
                <Route path="ordenes"     element={<OrdenesCompra />} />
                <Route path="documentos"  element={<Documentos />} />
                <Route path="reportes"    element={<Reportes />} />
                <Route path="ia"          element={<AsistenteIA />} />
                <Route path="usuarios"    element={<Usuarios />} />
                <Route path="ajustes"     element={<Ajustes />} />
                <Route path="clientes-web" element={<ClientesWeb />} />
            </Route>

            {/* Cualquier ruta desconocida → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

// ── App raíz ─────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
                        success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                        error  : { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                    }}
                />
            </BrowserRouter>
        </AuthProvider>
    );
}
