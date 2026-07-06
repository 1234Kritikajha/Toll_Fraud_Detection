import { motion } from "framer-motion";
import { Bell, Globe2, Lock, Moon, Save, ShieldCheck, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { api } from "../services/api";

const SETTINGS_STORAGE_KEY = "toll-fraud-settings";


interface SettingsState {

  emailAlerts: boolean;
  smsAlerts: boolean;
  autoUpdates: boolean;
  privacyMode: boolean;
}

const defaultSettings: SettingsState = {
  emailAlerts: true,
  smsAlerts: false,
  autoUpdates: true,
  privacyMode: false,
};

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  const refreshFromBackend = async () => {
    try {
      const res = await api.get<SettingsState>("/preferences");
      setSettings(res.data);
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(res.data));
      } catch {
        // ignore localStorage errors
      }
    } catch {
      // fallback to local storage
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) setSettings(JSON.parse(stored) as SettingsState);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    refreshFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    try {
      await api.put("/preferences", settings);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2000);
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // ignore localStorage errors
      }
    } catch {
      // keep UI usable even if backend fails
      setSaveStatus("idle");
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-teal-600">
            <Settings2 size={18} />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update your preferences for appearance, notifications, and account privacy.</p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Appearance</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Switch theme and adjust interface behavior.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                <Moon size={14} />
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Enable dark mode"
                description="Use the dark theme across the application."
                checked={theme === "dark"}
                onChange={toggleTheme}
              />
              <ToggleRow
                label="Automatic updates"
                description="Receive automatic application updates when available."
                checked={settings.autoUpdates}
                onChange={() => setSettings((current) => ({ ...current, autoUpdates: !current.autoUpdates }))}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose how you want to receive alerts and updates.</p>
              </div>
              <Bell size={18} className="text-teal-600" />
            </div>

            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Email alerts"
                description="Receive notifications by email for important updates."
                checked={settings.emailAlerts}
                onChange={() => setSettings((current) => ({ ...current, emailAlerts: !current.emailAlerts }))}
              />
              <ToggleRow
                label="SMS alerts"
                description="Receive notifications by text message."
                checked={settings.smsAlerts}
                onChange={() => setSettings((current) => ({ ...current, smsAlerts: !current.smsAlerts }))}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account privacy</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Protect your account and limit profile visibility.</p>
              </div>
              <ShieldCheck size={18} className="text-teal-600" />
            </div>

            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Privacy mode"
                description="Hide sensitive data and keep your account activity private."
                checked={settings.privacyMode}
                onChange={() => setSettings((current) => ({ ...current, privacyMode: !current.privacyMode }))}
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Preferred language</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">English (India) is currently selected.</p>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-teal-500/10 p-2 text-teal-600">
                <Globe2 size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick tips</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your settings are saved locally in the browser. For production, connect them to your backend API and database.</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Save changes</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Apply your configuration preferences.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">Local only</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Theme</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current mode: {theme === "dark" ? "Dark" : "Light"}</p>
              </div>
              <Button variant="primary" onClick={handleSave} className="w-full text-sm">
                <Save size={14} /> Save settings
              </Button>
              {saveStatus === "saved" && <p className="text-sm text-teal-600">Settings updated successfully.</p>}
            </div>
          </Card>
        </aside>
      </section>
    </motion.div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/60">
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" checked={checked} onChange={onChange} />
    </label>
  );
}
