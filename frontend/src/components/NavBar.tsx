import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/",        end: true,  icon: "🍽",  label: "Recipes"           },
  { to: "/search",  end: false, icon: "🔍",  label: "Search"            },
  { to: "/add",     end: false, icon: "+",   label: "Add",   fab: true  },
  { to: "/upload",  end: false, icon: "📷",  label: "Upload"            },
  { to: "/planner", end: false, icon: "📅",  label: "Planner"           },
] as const;

export default function NavBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex bg-spruce border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={"end" in tab ? tab.end : false}
          className={({ isActive }) =>
            [
              "flex-1 flex flex-col items-center justify-end pb-2 pt-1",
              "text-[0.6rem] leading-tight select-none transition-colors duration-150",
              "min-h-14",
              isActive ? "text-olive" : "text-muted",
            ].join(" ")
          }
        >
          {"fab" in tab && tab.fab ? (
            <span className="flex items-center justify-center rounded-full bg-olive text-spruce-dark w-10 h-10 font-bold text-2xl leading-none -mt-4 shadow-lg mb-0.5">
              {tab.icon}
            </span>
          ) : (
            <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
          )}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
