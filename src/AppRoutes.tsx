import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import RouteFallback from './components/RouteFallback';
import { legalDocs } from './pages/legal/legalDocs';

/*
 * Code splitting por ruta (feature 22).
 *
 * `App` (la landing) y sus secciones se importan de forma estática a propósito:
 * son la ruta crítica del negocio y hacerlas perezosas añadiría un round-trip
 * justo donde más duele. Lo que sale del chunk de entrada es el panel admin
 * —con `@uiw/react-md-editor`, el módulo más pesado del proyecto— y las páginas
 * del blog, que un visitante de `/` no necesita.
 *
 * Cada `import()` lleva una ruta literal para que Rollup pueda analizarla y
 * emitir un chunk por ruta.
 */
const BlogIndex    = lazy(() => import('./pages/BlogIndex'));
const BlogArticle  = lazy(() => import('./pages/BlogArticle'));
const Login        = lazy(() => import('./admin/Login'));
const AdminGuard   = lazy(() => import('./admin/AdminGuard'));
const AdminLayout  = lazy(() => import('./admin/AdminLayout'));
const AdminHome    = lazy(() => import('./admin/AdminHome'));
const LeadsList    = lazy(() => import('./admin/leads/LeadsList'));
const ArticlesList = lazy(() => import('./admin/articles/ArticlesList'));
const ArticleEdit  = lazy(() => import('./admin/articles/ArticleEdit'));
const ImagesGrid   = lazy(() => import('./admin/images/ImagesGrid'));
const PricesList   = lazy(() => import('./admin/prices/PricesList'));
const UsersList    = lazy(() => import('./admin/users/UsersList'));

/**
 * Límite de carga para las páginas anidadas del admin. Va en el `element` de
 * cada hijo —es decir, en la posición del `<Outlet />`— para que `AdminGuard` y
 * el sidebar de `AdminLayout` no se desmonten mientras llega el chunk de la
 * página: sin este límite interno, el `<Suspense>` exterior sustituiría el
 * layout entero y la navegación del panel parpadearía.
 */
function AdminPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback minHeight={320} />}>{children}</Suspense>;
}

/**
 * Tabla de rutas de la app. Vive fuera de `main.tsx` porque ese archivo tiene
 * efectos de arranque (`createRoot`) y no puede importarse desde un test.
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/blog"        element={<BlogIndex />} />
        <Route path="/blog/:slug"  element={<BlogArticle />} />
        <Route path="/privacidad"  element={<LegalPage doc={legalDocs.privacidad} />} />
        <Route path="/terminos"    element={<LegalPage doc={legalDocs.terminos} />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              {user => <AdminLayout user={user} />}
            </AdminGuard>
          }
        >
          <Route index element={<AdminPage><AdminHome /></AdminPage>} />
          <Route path="leads"        element={<AdminPage><LeadsList /></AdminPage>} />
          <Route path="articles"     element={<AdminPage><ArticlesList /></AdminPage>} />
          <Route path="articles/new" element={<AdminPage><ArticleEdit /></AdminPage>} />
          <Route path="articles/:id" element={<AdminPage><ArticleEdit /></AdminPage>} />
          <Route path="images"       element={<AdminPage><ImagesGrid /></AdminPage>} />
          <Route path="prices"       element={<AdminPage><PricesList /></AdminPage>} />
          <Route path="users"        element={<AdminPage><UsersList /></AdminPage>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
