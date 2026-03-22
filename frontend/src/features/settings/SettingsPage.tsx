import { Settings } from "lucide-react";
import { useTheme } from "./useTheme";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-sage" />
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
      </div>

      <div className="bg-card border border-edge rounded-xl divide-y divide-edge">
        <label className="flex items-center justify-between px-4 py-4 cursor-pointer">
          <span className="text-ink text-sm font-medium">Dark theme</span>
          <input
            type="checkbox"
            role="checkbox"
            aria-label="Dark theme"
            checked={isDark}
            onChange={toggleTheme}
            className="sr-only"
          />
          {/* Toggle track */}
          <span
            aria-hidden="true"
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
              isDark ? "bg-sage" : "bg-edge"
            }`}
          >
            {/* Toggle thumb */}
            <span
              className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ${
                isDark ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
