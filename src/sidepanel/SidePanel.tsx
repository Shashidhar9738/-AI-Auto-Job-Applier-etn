import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Queue } from './pages/Queue';
import { ProfileEditor } from './pages/ProfileEditor';
import { SettingsPage } from './pages/SettingsPage';

type Tab = 'dashboard' | 'queue' | 'profile' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Tracker', icon: '📊' },
  { id: 'queue', label: 'Queue', icon: '📥' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="app-bg flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <div className="logo-mark h-8 w-8 text-sm font-bold">A</div>
        <div className="text-sm font-bold">AI Auto Job Applier</div>
      </header>
      <nav className="flex shrink-0 gap-1 border-b border-slate-200/70 px-2 py-2 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto p-4">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'queue' && <Queue />}
        {tab === 'profile' && <ProfileEditor />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
