import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Tags,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  ClipboardList,
  Users,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ReceiptText,
  ChartColumnBig,
  PackageSearch,
  CircleDollarSign,
  ShieldAlert,
  ListChecks,
  Truck,
  Contact,
  FileText,
  CreditCard,
  FileCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/api";

type Section = "principal" | "catalogo" | "movimientos" | "analisis" | "admin";
type SidebarGroupId =
  | "catalogo-terceros"
  | "catalogo-config"
  | "movimientos-inventario"
  | "admin-organizacion";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  section: Section;
  sidebarGroup?: SidebarGroupId;
  analysisGroup?: AnalysisGroupId;
  hideInSidebar?: boolean;
}

type CollapsibleSection = Exclude<Section, "principal">;
type AnalysisGroupId =
  | "tributario-sri"
  | "ventas"
  | "compras"
  | "inventario"
  | "finanzas"
  | "control";

interface AnalysisGroup {
  id: AnalysisGroupId;
  label: string;
  icon: React.ElementType;
}

interface SidebarGroupMeta {
  label: string;
  icon: React.ElementType;
}

type SectionLayoutEntry =
  | { type: "item"; to: string }
  | { type: "group"; id: SidebarGroupId };

const COLLAPSIBLE_SECTIONS: CollapsibleSection[] = [
  "catalogo",
  "movimientos",
  "analisis",
  "admin",
];
const ANALYSIS_GROUPS: AnalysisGroup[] = [
  { id: "tributario-sri", label: "Tributario y SRI", icon: ReceiptText },
  { id: "ventas", label: "Análisis de ventas", icon: ChartColumnBig },
  { id: "compras", label: "Análisis de compras", icon: ChartColumnBig },
  { id: "inventario", label: "Análisis de inventario", icon: PackageSearch },
  { id: "finanzas", label: "Análisis financiero", icon: CircleDollarSign },
  { id: "control", label: "Control y auditoría", icon: ShieldAlert },
];
const SECTION_GROUPS: Partial<
  Record<Section, Partial<Record<SidebarGroupId, SidebarGroupMeta>>>
> = {
  catalogo: {
    "catalogo-terceros": { label: "Terceros", icon: Contact },
    "catalogo-config": { label: "Configuración de catálogo", icon: ListChecks },
  },
  movimientos: {
    "movimientos-inventario": { label: "Inventario", icon: Package },
  },
  admin: {
    "admin-organizacion": { label: "Organización", icon: Building2 },
  },
};
const SECTION_LAYOUTS: Partial<Record<Section, SectionLayoutEntry[]>> = {
  catalogo: [
    { type: "item", to: "/productos" },
    { type: "item", to: "/categorias" },
    { type: "item", to: "/atributos" },
    { type: "item", to: "/catalogs" },
    { type: "item", to: "/bodegas" },
    { type: "group", id: "catalogo-terceros" },
    { type: "group", id: "catalogo-config" },
  ],
  movimientos: [
    { type: "item", to: "/ventas" },
    { type: "item", to: "/compras" },
    { type: "item", to: "/retenciones" },
    { type: "group", id: "movimientos-inventario" },
    { type: "item", to: "/cuentas-por-pagar" },
  ],
  admin: [
    { type: "group", id: "admin-organizacion" },
    { type: "item", to: "/admin/users" },
    { type: "item", to: "/admin/params" },
  ],
};
const GROUP_CHILD_ORDER: Record<SidebarGroupId, string[]> = {
  "catalogo-terceros": ["/customers", "/suppliers", "/personas"],
  "catalogo-config": ["/categorias-atributos", "/impuestos"],
  "movimientos-inventario": [
    "/inventory/ingresos",
    "/inventory/egresos",
    "/inventory/conteos",
  ],
  "admin-organizacion": [
    "/empresa",
    "/admin/company",
    "/configuracion-operativa",
  ],
};

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operator", "supervisor"],
    section: "principal",
  },
  {
    to: "/productos",
    label: "Productos",
    icon: Package,
    roles: ["admin", "operator", "supervisor"],
    section: "catalogo",
  },
  {
    to: "/categorias",
    label: "Categorías",
    icon: Tags,
    roles: ["admin", "supervisor"],
    section: "catalogo",
  },
  {
    to: "/catalogs",
    label: "Catálogos",
    icon: ListChecks,
    roles: ["admin", "supervisor"],
    section: "catalogo",
  },
  {
    to: "/atributos",
    label: "Atributos",
    icon: ListChecks,
    roles: ["admin", "supervisor"],
    section: "catalogo",
  },
  {
    to: "/impuestos",
    label: "Impuestos SRI",
    icon: ListChecks,
    roles: ["admin", "supervisor"],
    section: "catalogo",
    sidebarGroup: "catalogo-config",
  },
  {
    to: "/categorias-atributos",
    label: "Atributos por categoría",
    icon: ListChecks,
    roles: ["admin", "supervisor"],
    section: "catalogo",
    sidebarGroup: "catalogo-config",
  },
  {
    to: "/personas",
    label: "Personas",
    icon: Contact,
    roles: ["admin", "operator", "supervisor"],
    section: "catalogo",
    sidebarGroup: "catalogo-terceros",
  },
  {
    to: "/bodegas",
    label: "Bodegas",
    icon: Package,
    roles: ["admin", "supervisor"],
    section: "catalogo",
  },
  {
    to: "/configuracion-operativa",
    label: "Sucursales y emisión",
    icon: Building2,
    roles: ["admin", "supervisor"],
    section: "admin",
    sidebarGroup: "admin-organizacion",
  },
  {
    to: "/empresa",
    label: "Datos de empresa",
    icon: Building2,
    roles: ["admin", "supervisor"],
    section: "admin",
    sidebarGroup: "admin-organizacion",
  },
  {
    to: "/suppliers",
    label: "Proveedores",
    icon: Truck,
    roles: ["admin", "operator", "supervisor"],
    section: "catalogo",
    sidebarGroup: "catalogo-terceros",
  },
  {
    to: "/customers",
    label: "Clientes",
    icon: Contact,
    roles: ["admin", "operator", "supervisor"],
    section: "catalogo",
    sidebarGroup: "catalogo-terceros",
  },
  {
    to: "/ventas",
    label: "Ventas",
    icon: FileText,
    roles: ["admin", "operator", "supervisor"],
    section: "movimientos",
  },
  {
    to: "/compras",
    label: "Compras",
    icon: ArrowDownToLine,
    roles: ["admin", "supervisor"],
    section: "movimientos",
  },
  {
    to: "/retenciones",
    label: "Retenciones",
    icon: FileCheck,
    roles: ["admin", "supervisor"],
    section: "movimientos",
  },
  {
    to: "/retenciones/historial",
    label: "Historial de retenciones",
    icon: FileCheck,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "tributario-sri",
  },
  {
    to: "/documentos-sri",
    label: "Documentos SRI",
    icon: FileCheck,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "tributario-sri",
  },
  {
    to: "/reportes/compras",
    label: "Reporte de compras",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "compras",
  },
  {
    to: "/reportes/cartera-pagar",
    label: "Cartera por pagar",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "finanzas",
  },
  {
    to: "/reportes/cartera-cobrar",
    label: "Cartera por cobrar",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "finanzas",
  },
  {
    to: "/reportes/sri",
    label: "Reporte SRI",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "tributario-sri",
  },
  {
    to: "/reportes/tributario",
    label: "Reporte tributario",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "tributario-sri",
  },
  {
    to: "/reportes/ventas",
    label: "Reporte de ventas",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/reportes/inventario/valoracion",
    label: "Valoración de inventario",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "inventario",
  },
  {
    to: "/reportes/inventario/kardex",
    label: "Kárdex",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "inventario",
  },
  {
    to: "/reportes/caja",
    label: "Cierre de caja",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "finanzas",
  },
  {
    to: "/reportes/rentabilidad",
    label: "Rentabilidad",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/reportes/rentabilidad/transacciones",
    label: "Rentabilidad por venta",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/reportes/productos",
    label: "Top productos vendidos",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/reportes/ventas/tendencias",
    label: "Tendencias de ventas",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/reportes/ventas/vendedores",
    label: "Ventas por vendedor",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "ventas",
  },
  {
    to: "/cuentas-por-pagar",
    label: "Cuentas por pagar",
    icon: CreditCard,
    roles: ["admin", "supervisor"],
    section: "movimientos",
  },
  {
    to: "/inventory/ingresos",
    label: "Ingresos",
    icon: ArrowDownToLine,
    roles: ["admin", "supervisor"],
    section: "movimientos",
    sidebarGroup: "movimientos-inventario",
  },
  {
    to: "/inventory/egresos",
    label: "Egresos",
    icon: ArrowUpFromLine,
    roles: ["admin", "operator", "supervisor"],
    section: "movimientos",
    sidebarGroup: "movimientos-inventario",
  },
  {
    to: "/inventory/conteos",
    label: "Conteo",
    icon: ClipboardCheck,
    roles: ["admin", "operator", "supervisor"],
    section: "movimientos",
    sidebarGroup: "movimientos-inventario",
  },
  {
    to: "/kardex",
    label: "Kárdex operativo",
    icon: BookOpen,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "inventario",
    hideInSidebar: true,
  },
  {
    to: "/reports",
    label: "Reportes personalizados",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "control",
  },
  {
    to: "/audit",
    label: "Auditoría",
    icon: ClipboardList,
    roles: ["admin", "supervisor"],
    section: "analisis",
    analysisGroup: "control",
  },
  {
    to: "/admin/users",
    label: "Usuarios",
    icon: Users,
    roles: ["admin", "supervisor"],
    section: "admin",
  },
  {
    to: "/admin/params",
    label: "Parámetros",
    icon: Settings,
    roles: ["admin"],
    section: "admin",
  },
  {
    to: "/admin/company",
    label: "Configuración de empresa",
    icon: Building2,
    roles: ["admin", "supervisor"],
    section: "admin",
    sidebarGroup: "admin-organizacion",
  },
];

const SECTION_LABELS: Record<Section, string> = {
  principal: "Principal",
  catalogo: "Catálogo",
  movimientos: "Movimientos",
  analisis: "Análisis",
  admin: "Administración",
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  style?: React.CSSProperties;
}

interface NavAccordionGroupProps {
  label: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function NavAccordionGroup({
  label,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: NavAccordionGroupProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-cyan-100/85 hover:bg-cyan-800/45 hover:text-white"
      >
        <span className="flex items-center gap-2.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-200/80" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-cyan-200/80 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && <div className="space-y-1 pl-3">{children}</div>}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  mobile = false,
  mobileOpen = false,
  onNavigate,
  style,
}: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role),
  );
  const visibleMenuItems = visibleItems.filter((item) => !item.hideInSidebar);
  const sections: Section[] = [
    "principal",
    "catalogo",
    "movimientos",
    "analisis",
    "admin",
  ];
  const pathname = location.pathname;
  const matchingItems = visibleItems
    .filter((item) => {
      if (item.to === "/") return pathname === "/";
      return pathname === item.to || pathname.startsWith(`${item.to}/`);
    })
    .sort((a, b) => b.to.length - a.to.length);
  const activeSection = matchingItems[0]?.section ?? null;

  const defaultExpandedSection: CollapsibleSection | null =
    activeSection && activeSection !== "principal"
      ? activeSection
      : (COLLAPSIBLE_SECTIONS.find((section) =>
          visibleItems.some((item) => item.section === section),
        ) ?? null);

  const [manualExpandedSection, setManualExpandedSection] = useState<
    CollapsibleSection | "none" | null
  >(null);
  const preferredExpandedSection: CollapsibleSection | null =
    manualExpandedSection === null
      ? defaultExpandedSection
      : manualExpandedSection === "none"
        ? null
        : manualExpandedSection;
  const expandedSection: CollapsibleSection | null =
    activeSection && activeSection !== "principal"
      ? activeSection
      : preferredExpandedSection;

  return (
    <aside
      style={style}
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-cyan-900/30 bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] shadow-token-md transition-all duration-200",
        mobile
          ? "fixed inset-y-0 left-0 z-drawer w-64"
          : collapsed
            ? "w-16"
            : "w-64",
        mobile && (mobileOpen ? "translate-x-0" : "-translate-x-full"),
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-cyan-700/35 px-3">
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--sidebar-muted))]">
              OSIRIS
            </p>
            <p className="truncate text-sm font-semibold text-white">
              Facturación
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto rounded-md p-1 text-[hsl(var(--sidebar-muted))] hover:bg-cyan-800/60 hover:text-white"
          aria-label={
            mobile
              ? "Cerrar menú"
              : collapsed
                ? "Expandir sidebar"
                : "Colapsar sidebar"
          }
        >
          {mobile ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {sections.map((section) => {
          const sectionItems = visibleMenuItems.filter(
            (item) => item.section === section,
          );
          if (sectionItems.length === 0) return null;

          const isPrincipal = section === "principal";
          const isExpanded = isPrincipal || expandedSection === section;

          return (
            <div key={section} className="mb-4">
              {!collapsed &&
                (isPrincipal ? (
                  <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-muted))]">
                    {SECTION_LABELS[section]}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-muted))] hover:bg-cyan-800/45 hover:text-white"
                    onClick={() => {
                      const targetSection = section as CollapsibleSection;
                      if (expandedSection === targetSection) {
                        setManualExpandedSection((current) => {
                          if (current === targetSection) return "none";
                          if (
                            current === null &&
                            defaultExpandedSection === targetSection
                          ) {
                            return "none";
                          }
                          return null;
                        });
                        return;
                      }
                      setManualExpandedSection(targetSection);
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-section-${section}`}
                  >
                    <span>{SECTION_LABELS[section]}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                ))}

              {(collapsed || isExpanded) && (
                <div id={`sidebar-section-${section}`} className="space-y-1">
                  {section === "analisis" && !collapsed ? (
                    <AnalysisGroupedItems
                      items={sectionItems}
                      visibleItems={visibleItems}
                      locationPath={location.pathname}
                      onNavigate={onNavigate}
                    />
                  ) : section !== "analisis" &&
                    !collapsed &&
                    SECTION_GROUPS[section] ? (
                    <GroupedSectionItems
                      section={section}
                      items={sectionItems}
                      visibleItems={visibleItems}
                      locationPath={location.pathname}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    sectionItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            "relative mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                            isActive
                              ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-fg))] shadow-token-sm before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-cyan-200"
                              : "text-[hsl(var(--sidebar-fg))] hover:bg-cyan-800/45 hover:text-white",
                            !mobile && collapsed && "justify-center px-2.5",
                          )
                        }
                        title={!mobile && collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {(mobile || !collapsed) && (
                          <span className="truncate font-medium">
                            {item.label}
                          </span>
                        )}
                      </NavLink>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

interface AnalysisGroupedItemsProps {
  items: NavItem[];
  visibleItems: NavItem[];
  locationPath: string;
  onNavigate?: () => void;
}

interface GroupedSectionItemsProps {
  section: Section;
  items: NavItem[];
  visibleItems: NavItem[];
  locationPath: string;
  onNavigate?: () => void;
}

function GroupedSectionItems({
  section,
  items,
  visibleItems,
  locationPath,
  onNavigate,
}: GroupedSectionItemsProps) {
  const [manualExpanded, setManualExpanded] = useState<
    SidebarGroupId | "none" | null
  >(null);
  const groupMeta = SECTION_GROUPS[section];
  const layout = SECTION_LAYOUTS[section];
  if (!groupMeta || !layout) {
    return null;
  }

  const itemByRoute = new Map(items.map((item) => [item.to, item]));
  const groupedChildren = new Map<SidebarGroupId, NavItem[]>();
  items.forEach((item) => {
    if (!item.sidebarGroup) return;
    if (!groupMeta[item.sidebarGroup]) return;
    const current = groupedChildren.get(item.sidebarGroup) ?? [];
    current.push(item);
    groupedChildren.set(item.sidebarGroup, current);
  });

  const activeGroup: SidebarGroupId | null =
    visibleItems
      .filter((item) => {
        if (item.section !== section || !item.sidebarGroup) return false;
        return (
          locationPath === item.to || locationPath.startsWith(`${item.to}/`)
        );
      })
      .sort((a, b) => b.to.length - a.to.length)[0]?.sidebarGroup ?? null;

  let firstVisibleGroup: SidebarGroupId | null = null;
  for (const entry of layout) {
    if (entry.type !== "group") continue;
    if ((groupedChildren.get(entry.id) ?? []).length > 0) {
      firstVisibleGroup = entry.id;
      break;
    }
  }

  const defaultExpandedGroup = activeGroup ?? firstVisibleGroup;
  const preferredExpandedGroup: SidebarGroupId | null =
    manualExpanded === null
      ? defaultExpandedGroup
      : manualExpanded === "none"
        ? null
        : manualExpanded;
  const expandedGroup: SidebarGroupId | null =
    activeGroup ?? preferredExpandedGroup;

  return (
    <div className="space-y-1">
      {layout.map((entry) => {
        if (entry.type === "item") {
          const item = itemByRoute.get(entry.to);
          if (!item) return null;

          return (
            <NavLink
              key={entry.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "relative mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-fg))] shadow-token-sm before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-cyan-200"
                    : "text-[hsl(var(--sidebar-fg))] hover:bg-cyan-800/45 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{item.label}</span>
            </NavLink>
          );
        }

        const groupId = entry.id;
        const children = groupedChildren.get(groupId) ?? [];
        if (children.length === 0) {
          return null;
        }

        const routeOrder = GROUP_CHILD_ORDER[groupId] ?? [];
        const orderedChildren = [...children].sort((a, b) => {
          const ai = routeOrder.indexOf(a.to);
          const bi = routeOrder.indexOf(b.to);
          const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
          const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
          if (aRank !== bRank) return aRank - bRank;
          return a.label.localeCompare(b.label);
        });

        const meta = groupMeta[groupId];
        if (!meta) return null;
        const isExpanded = expandedGroup === groupId;

        return (
          <NavAccordionGroup
            key={groupId}
            label={meta.label}
            icon={meta.icon}
            expanded={isExpanded}
            onToggle={() =>
              setManualExpanded((current) => {
                if (current === groupId) return "none";
                if (current === null && defaultExpandedGroup === groupId) {
                  return "none";
                }
                return groupId;
              })
            }
          >
            {orderedChildren.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative mx-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-fg))] shadow-token-sm before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-cyan-200"
                      : "text-[hsl(var(--sidebar-fg))] hover:bg-cyan-800/45 hover:text-white",
                  )
                }
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                <span className="truncate font-medium">{child.label}</span>
              </NavLink>
            ))}
          </NavAccordionGroup>
        );
      })}
    </div>
  );
}

function AnalysisGroupedItems({
  items,
  visibleItems,
  locationPath,
  onNavigate,
}: AnalysisGroupedItemsProps) {
  const activeAnalysisGroup: AnalysisGroupId | null =
    visibleItems
      .filter((item) => {
        if (item.section !== "analisis" || !item.analysisGroup) return false;
        return (
          locationPath === item.to || locationPath.startsWith(`${item.to}/`)
        );
      })
      .sort((a, b) => b.to.length - a.to.length)[0]?.analysisGroup ?? null;

  let firstVisibleGroup: AnalysisGroupId | null = null;
  for (const group of ANALYSIS_GROUPS) {
    if (items.some((item) => item.analysisGroup === group.id)) {
      firstVisibleGroup = group.id;
      break;
    }
  }

  const defaultExpanded = activeAnalysisGroup ?? firstVisibleGroup;
  const [manualExpanded, setManualExpanded] = useState<
    AnalysisGroupId | "none" | null
  >(null);
  const preferredExpandedGroup: AnalysisGroupId | null =
    manualExpanded === null
      ? defaultExpanded
      : manualExpanded === "none"
        ? null
        : manualExpanded;
  const expandedGroup: AnalysisGroupId | null =
    activeAnalysisGroup ?? preferredExpandedGroup;

  return (
    <div className="space-y-2">
      {ANALYSIS_GROUPS.map((group) => {
        const groupItems = items.filter(
          (item) => item.analysisGroup === group.id,
        );
        if (groupItems.length === 0) return null;
        const isExpanded = expandedGroup === group.id;

        return (
          <NavAccordionGroup
            key={group.id}
            label={group.label}
            icon={group.icon}
            expanded={isExpanded}
            onToggle={() =>
              setManualExpanded((current) => {
                if (current === group.id) return "none";
                if (current === null && defaultExpanded === group.id)
                  return "none";
                return group.id;
              })
            }
          >
            {groupItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative mx-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-fg))] shadow-token-sm before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-cyan-200"
                      : "text-[hsl(var(--sidebar-fg))] hover:bg-cyan-800/45 hover:text-white",
                  )
                }
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                <span className="truncate font-medium">{item.label}</span>
              </NavLink>
            ))}
          </NavAccordionGroup>
        );
      })}
    </div>
  );
}
