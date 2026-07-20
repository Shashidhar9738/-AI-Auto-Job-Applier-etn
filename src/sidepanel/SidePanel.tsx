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
    <div className="flex h-screen flex-col">
      <nav className="flex shrink-0 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 px-2 py-3 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
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
