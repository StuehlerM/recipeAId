import { NavLink } from "react-router-dom";
import { BookOpen, Search, Plus, CalendarDays, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { to: string; end: boolean; Icon: LucideIcon; label: string; fab?: true }[] = [
  { to: "/",          end: true,  Icon: BookOpen,     label: "Recipes"  },
  { to: "/search",    end: false, Icon: Search,       label: "Search"   },
  { to: "/add",       end: false, Icon: Plus,         label: "Add",     fab: true },
  { to: "/planner",   end: false, Icon: CalendarDays, label: "Planner"  },
  { to: "/settings",  end: false, Icon: Settings,     label: "Settings" },
];

export default function NavBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex bg-card border-t border-edge"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            [
              "flex-1 flex flex-col items-center justify-end pb-2 pt-1",
              "text-[0.6rem] leading-tight select-none transition-colors duration-150",
              "min-h-14",
              isActive ? "text-sage" : "text-ghost",
            ].join(" ")
          }
        >
          {tab.fab ? (
            <span className="flex items-center justify-center rounded-full bg-sage text-card w-10 h-10 -mt-4 shadow-lg mb-0.5">
              <tab.Icon size={22} strokeWidth={2.5} />
            </span>
          ) : (
            <tab.Icon size={22} strokeWidth={1.75} className="mb-0.5" />
          )}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
