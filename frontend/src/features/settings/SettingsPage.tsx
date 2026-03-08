import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-sage" />
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
      </div>
      <p className="text-ghost text-sm">No settings yet.</p>
    </div>
  );
}
