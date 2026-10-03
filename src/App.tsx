import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import Forbidden from "@/pages/Forbidden";
import NotFound from "@/pages/NotFound";
import {
  INVENTORY_LEGACY_REDIRECTS,
  MANAGEMENT_LEGACY_REDIRECTS,
  getSpanishRouteRedirect,
} from "@/lib/route-redirects";

// Auth pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(
  () => import("@/pages/auth/ChangePasswordPage"),
);

// App pages
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PersonasPage = lazy(() => import("@/pages/PersonasPage"));
const ProductosPage = lazy(() => import("@/pages/ProductosPage"));
const CategoriasPage = lazy(() => import("@/pages/CategoriasPage"));
const AtributosPage = lazy(() => import("@/pages/AtributosPage"));
const CategoriasAtributosPage = lazy(
  () => import("@/pages/CategoriasAtributosPage"),
);
const BodegasPage = lazy(() => import("@/pages/BodegasPage"));
const ConfiguracionOperativaPage = lazy(
  () => import("@/pages/ConfiguracionOperativaPage"),
);
const ImpuestosPage = lazy(() => import("@/pages/ImpuestosPage"));
const EmpresaCanonicaPage = lazy(() => import("@/pages/EmpresaCanonicaPage"));
const VentasPage = lazy(() => import("@/pages/VentasPage"));
const CuentasPorCobrarPage = lazy(
  () => import("@/pages/CuentasPorCobrarPage"),
);
const CuentasPorPagarPage = lazy(() => import("@/pages/CuentasPorPagarPage"));
const ComprasPage = lazy(() => import("@/pages/ComprasPage"));
const RetencionesPage = lazy(() => import("@/pages/RetencionesPage"));
const RetencionesHistorialPage = lazy(
  () => import("@/pages/RetencionesHistorialPage"),
);
const ReporteComprasPage = lazy(() => import("@/pages/ReporteComprasPage"));
const ReporteCarteraPagarPage = lazy(
  () => import("@/pages/ReporteCarteraPagarPage"),
);
const ReporteCarteraCobrarPage = lazy(
  () => import("@/pages/ReporteCarteraCobrarPage"),
);
const ReporteSRIPage = lazy(() => import("@/pages/ReporteSRIPage"));
const ReporteTributarioPage = lazy(
  () => import("@/pages/ReporteTributarioPage"),
);
const ReporteVentasCanonicoPage = lazy(
  () => import("@/pages/ReporteVentasCanonicoPage"),
);
const ReporteValoracionInventarioPage = lazy(
  () => import("@/pages/ReporteValoracionInventarioPage"),
);
const ReporteKardexPage = lazy(() => import("@/pages/ReporteKardexPage"));
const ReporteCajaPage = lazy(() => import("@/pages/ReporteCajaPage"));
const ReporteRentabilidadPage = lazy(
  () => import("@/pages/ReporteRentabilidadPage"),
);
const ReporteRentabilidadTransaccionesPage = lazy(
  () => import("@/pages/ReporteRentabilidadTransaccionesPage"),
);
const ReporteTopProductosPage = lazy(
  () => import("@/pages/ReporteTopProductosPage"),
);
const ReporteTendenciasVentasPage = lazy(
  () => import("@/pages/ReporteTendenciasVentasPage"),
);
const ReporteVendedoresPage = lazy(
  () => import("@/pages/ReporteVendedoresPage"),
);
const DocumentosSRIPage = lazy(() => import("@/pages/DocumentosSRIPage"));
const RecategorizePage = lazy(() => import("@/pages/catalog/RecategorizePage"));
const CatalogsPage = lazy(() => import("@/pages/catalog/CatalogsPage"));
const SuppliersPage = lazy(() => import("@/pages/catalog/SuppliersPage"));
const CustomersPage = lazy(() => import("@/pages/catalog/CustomersPage"));
const RemapPage = lazy(() => import("@/pages/catalog/RemapPage"));
const IngresosPage = lazy(() => import("@/pages/inventory/IngresosPage"));
const IngresoNewPage = lazy(() => import("@/pages/inventory/IngresoNewPage"));
const IngresoDetailPage = lazy(
  () => import("@/pages/inventory/IngresoDetailPage"),
);
const EgresosPage = lazy(() => import("@/pages/inventory/EgresosPage"));
const EgresoNewPage = lazy(() => import("@/pages/inventory/EgresoNewPage"));
const EgresoDetailPage = lazy(
  () => import("@/pages/inventory/EgresoDetailPage"),
);
const EgresoPrintPage = lazy(() => import("@/pages/inventory/EgresoPrintPage"));
const ConteosPage = lazy(() => import("@/pages/inventory/ConteosPage"));
const ConteoNewPage = lazy(() => import("@/pages/inventory/ConteoNewPage"));
const ConteoDetailPage = lazy(
  () => import("@/pages/inventory/ConteoDetailPage"),
);
const KardexPage = lazy(() => import("@/pages/KardexPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminParamsPage = lazy(() => import("@/pages/admin/AdminParamsPage"));
const TemporaryTaxMeasuresPage = lazy(
  () => import("@/pages/admin/TemporaryTaxMeasuresPage"),
);

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Cargando...
    </div>
  );
}

function LegacyRouteRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = getSpanishRouteRedirect(pathname);
  if (!target) return <NotFound />;
  const querySeparator = target.includes("?") ? "&" : "?";
  return (
    <Navigate
      to={`${target}${search ? `${querySeparator}${search.slice(1)}` : ""}${hash}`}
      replace
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/iniciar-sesion" element={<LoginPage />} />
              <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
              <Route path="/login" element={<Navigate to="/iniciar-sesion" replace />} />
              <Route path="/change-password" element={<Navigate to="/cambiar-contrasena" replace />} />
            </Route>

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <RoleGuard roles={["admin", "operator", "supervisor"]} />
                }
              >
                <Route
                  path="/inventario/egresos/:id/imprimir"
                  element={<EgresoPrintPage />}
                />
              </Route>
              <Route element={<AppLayout />}>
                  <Route element={<RoleGuard roles={["admin"]} />}>
                    <Route
                      path="/admin/medidas-tributarias"
                      element={<TemporaryTaxMeasuresPage />}
                    />
                  </Route>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/productos" element={<ProductosPage />} />
                <Route path="/clientes" element={<CustomersPage />} />
                <Route path="/proveedores" element={<SuppliersPage />} />
                <Route path="/prohibido" element={<Forbidden />} />
                <Route path="/ventas" element={<VentasPage />} />
                <Route
                  path="/cuentas-por-cobrar"
                  element={<CuentasPorCobrarPage />}
                />

                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route
                    path="/categorias"
                    element={<CategoriasPage />}
                  />
                  <Route path="/catalogos" element={<CatalogsPage />} />
                  <Route path="/recategorizar" element={<RecategorizePage />} />
                  <Route path="/remapeos" element={<RemapPage />} />
                  <Route path="/atributos" element={<AtributosPage />} />
                  <Route
                    path="/categorias-atributos"
                    element={<CategoriasAtributosPage />}
                  />
                  <Route path="/bodegas" element={<BodegasPage />} />
                  <Route
                    path="/configuracion-operativa"
                    element={<ConfiguracionOperativaPage />}
                  />
                  <Route path="/impuestos" element={<ImpuestosPage />} />
                  <Route path="/compras" element={<ComprasPage />} />
                  <Route path="/retenciones" element={<RetencionesPage />} />
                  <Route
                    path="/retenciones/historial"
                    element={<RetencionesHistorialPage />}
                  />
                  <Route
                    path="/cuentas-por-pagar"
                    element={<CuentasPorPagarPage />}
                  />
                  <Route
                    path="/reportes/compras"
                    element={<ReporteComprasPage />}
                  />
                  <Route
                    path="/reportes/cartera-pagar"
                    element={<ReporteCarteraPagarPage />}
                  />
                  <Route
                    path="/reportes/cartera-cobrar"
                    element={<ReporteCarteraCobrarPage />}
                  />
                  <Route path="/reportes/sri" element={<ReporteSRIPage />} />
                  <Route
                    path="/reportes/tributario"
                    element={<ReporteTributarioPage />}
                  />
                  <Route
                    path="/reportes/ventas"
                    element={<ReporteVentasCanonicoPage />}
                  />
                  <Route
                    path="/reportes/inventario/valoracion"
                    element={<ReporteValoracionInventarioPage />}
                  />
                  <Route
                    path="/reportes/inventario/kardex"
                    element={<ReporteKardexPage />}
                  />
                  <Route path="/reportes/caja" element={<ReporteCajaPage />} />
                  <Route
                    path="/reportes/rentabilidad"
                    element={<ReporteRentabilidadPage />}
                  />
                  <Route
                    path="/reportes/rentabilidad/transacciones"
                    element={<ReporteRentabilidadTransaccionesPage />}
                  />
                  <Route
                    path="/reportes/productos"
                    element={<ReporteTopProductosPage />}
                  />
                  <Route
                    path="/reportes/ventas/tendencias"
                    element={<ReporteTendenciasVentasPage />}
                  />
                  <Route
                    path="/reportes/ventas/vendedores"
                    element={<ReporteVendedoresPage />}
                  />
                  <Route
                    path="/documentos-sri"
                    element={<DocumentosSRIPage />}
                  />
                </Route>

                {/* Movimientos de ingreso no comerciales: admin + supervisor */}
                <Route
                  element={<RoleGuard roles={["admin", "supervisor"]} />}
                >
                  <Route
                    path="/inventario/ingresos"
                    element={<IngresosPage />}
                  />
                  <Route
                    path="/inventario/ingresos/nuevo"
                    element={<IngresoNewPage />}
                  />
                  <Route
                    path="/inventario/ingresos/:id"
                    element={<IngresoDetailPage />}
                  />
                  {INVENTORY_LEGACY_REDIRECTS.map(({ from, to }) => (
                    <Route
                      key={from}
                      path={from}
                      element={<Navigate to={to} replace />}
                    />
                  ))}
                </Route>

                {/* Egresos y conteos - todos los roles */}
                <Route path="/inventario/egresos" element={<EgresosPage />} />
                <Route
                  path="/inventario/egresos/nuevo"
                  element={<EgresoNewPage />}
                />
                <Route
                  path="/inventario/egresos/:id"
                  element={<EgresoDetailPage />}
                />
                <Route
                  path="/inventario/conteos/nuevo"
                  element={<ConteoNewPage />}
                />

                <Route path="/inventario/conteos" element={<ConteosPage />} />
                <Route
                  path="/inventario/conteos/:id"
                  element={<ConteoDetailPage />}
                />

                {/* Kardex - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/kardex" element={<KardexPage />} />
                  <Route path="/kardex/:productId" element={<KardexPage />} />
                </Route>

                {/* Reports + Audit - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/reportes/resumen/*" element={<ReportsPage />} />
                  <Route path="/auditoria" element={<AuditPage />} />
                </Route>

                {/* Admin */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/empresa" element={<EmpresaCanonicaPage />} />
                  {MANAGEMENT_LEGACY_REDIRECTS.map(({ from, to }) => (
                    <Route
                      key={from}
                      path={from}
                      element={<Navigate to={to} replace />}
                    />
                  ))}
                  <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                </Route>
                <Route element={<RoleGuard roles={["admin"]} />}>
                  <Route path="/admin/parametros" element={<AdminParamsPage />} />
                </Route>
                <Route path="*" element={<LegacyRouteRedirect />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
