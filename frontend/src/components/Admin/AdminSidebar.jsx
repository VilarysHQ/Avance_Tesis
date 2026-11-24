import { Link, NavLink } from "react-router-dom";
import {
  Home,
  Inbox,
  FileText,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  X,
} from "lucide-react";

import navbarLogo from "../../assets/navbar/navbarLogo.png";

const NAV_ITEMS = [
  { key: "home", label: "Inicio", icon: Home, to: "/" },
  { key: "requests", label: "Solicitudes", icon: Inbox, to: "/admin", end: true },
  { key: "quotes", label: "Cotizaciones", icon: FileText, soon: true },
  { key: "sales", label: "Ventas", icon: ShoppingCart, soon: true },
  { key: "services", label: "Servicios", icon: Package, soon: true },
  { key: "reports", label: "Reportes", icon: BarChart3, to: "/admin/reports" },
  { label: "Configuración", icon: Settings, soon: true },
];

export default function AdminSidebar({ open = false, onClose }) {
  return (
    <aside
      className={`
        fixed
        inset-y-0
        left-0
        z-40
        flex
        w-[252px]
        shrink-0
        flex-col
        border-r
        border-slate-200/70
        bg-white
        transition-transform
        duration-300

        lg:static
        lg:translate-x-0

        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* LOGO */}
      <div className="flex h-[70px] items-center justify-between border-b border-slate-100 px-5">
        <Link to="/" className="shrink-0" onClick={onClose}>
          <img
            src={navbarLogo}
            alt="J&P Periféricos"
            className="h-auto w-[124px]"
          />
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            text-slate-400
            transition
            hover:bg-slate-100
            hover:text-slate-600
            lg:hidden
          "
        >
          <X size={18} />
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
          Espacio de trabajo
        </p>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.soon) {
            return (
              <button
                key={item.label}
                type="button"
                disabled
                title="Próximamente"
                className="
                  group
                  flex
                  w-full
                  cursor-not-allowed
                  items-center
                  justify-between
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-[13px]
                  font-medium
                  text-slate-400/80
                "
              >
                <span className="flex items-center gap-3">
                  <Icon size={17} />
                  {item.label}
                </span>

                <span
                  className="
                    rounded-md
                    bg-slate-100
                    px-2
                    py-0.5
                    text-[9px]
                    font-semibold
                    text-slate-400
                  "
                >
                  Pronto
                </span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `
                flex
                items-center
                relative
                gap-3
                rounded-xl
                px-3.5
                py-2.5
                text-[13px]
                font-semibold
                transition

                ${
                  isActive
                    ? "bg-blue-50 text-[#173cff] shadow-[inset_0_0_0_1px_rgba(23,60,255,0.06)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#173cff]"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#173cff]" />}
                  <Icon size={17} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Panel administrativo</p>
          <p className="mt-1 text-[10px] text-slate-400">J&amp;P Periféricos S.A.C.</p>
        </div>
      </div>
    </aside>
  );
}
