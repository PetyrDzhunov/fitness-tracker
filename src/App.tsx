import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ensureSeed } from './db/seed';
import { useSetting } from './hooks/useLive';
import { bg } from './i18n/bg';
import { HistoryPage } from './features/history/HistoryPage';
import { ComingSoon } from './features/placeholder/ComingSoon';
import { SettingsPage } from './features/settings/SettingsPage';
import { RestTimerProvider } from './features/today/RestTimer';
import { TodayPage } from './features/today/TodayPage';

function ThemeApplier() {
  const [theme] = useSetting<string>('theme', 'system');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    else delete root.dataset.theme;
  }, [theme]);
  return null;
}

const TABS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/', label: bg.tabs.today, icon: '🏋️', end: true },
  { to: '/history', label: bg.tabs.history, icon: '📅' },
  { to: '/progress', label: bg.tabs.progress, icon: '📈' },
  { to: '/body', label: bg.tabs.body, icon: '⚖️' },
  { to: '/settings', label: bg.tabs.settings, icon: '⚙️' },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ensureSeed()
      .then(() => setReady(true))
      .catch((e) => {
        console.error(e);
        setFailed(true);
      });
    // Ask the browser not to evict our data. Failure is fine.
    navigator.storage?.persist?.()?.catch(() => undefined);
  }, []);

  if (failed) {
    return (
      <div className="page">
        <p className="error">
          Не може да се отвори локалната база данни. Провери дали браузърът позволява съхранение на данни
          (не използвай частен/инкогнито режим).
        </p>
      </div>
    );
  }
  if (!ready) return <div className="page" />;

  return (
    <HashRouter>
      <ToastProvider>
        <RestTimerProvider>
          <ThemeApplier />
          <main className="main">
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/progress" element={<ComingSoon title={bg.tabs.progress} text={bg.progressSoon} />} />
              <Route path="/body" element={<ComingSoon title={bg.tabs.body} text={bg.bodySoon} />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
          <nav className="tabbar" aria-label="Навигация">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
                <span className="tab-icon" aria-hidden="true">
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </NavLink>
            ))}
          </nav>
        </RestTimerProvider>
      </ToastProvider>
    </HashRouter>
  );
}
