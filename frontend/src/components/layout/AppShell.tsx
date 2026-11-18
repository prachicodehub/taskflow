import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/queries';
import { Avatar } from '../ui/Avatar';

export function Logo({ onInk = false }: { onInk?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight ${onInk ? 'text-white' : 'text-ink-900'}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${onInk ? 'bg-signal-500' : 'bg-ink-900'}`}>
        <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 10.5l3.2 3.2L15 7" stroke={onInk ? '#14213d' : '#f5c518'} />
        </svg>
      </span>
      TaskFlow
    </span>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const projects = useProjects();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto">
      <div>
        <NavLink
          to="/projects"
          end
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="2" y="3" width="4.5" height="14" rx="1.5" />
            <rect x="7.75" y="3" width="4.5" height="10" rx="1.5" />
            <rect x="13.5" y="3" width="4.5" height="6" rx="1.5" />
          </svg>
          All projects
        </NavLink>
      </div>

      {projects.data && projects.data.length > 0 && (
        <div>
          <p className="px-3 pb-2 text-xs font-medium text-ink-400">Your boards</p>
          <ul className="space-y-0.5">
            {projects.data.map((p) => (
              <li key={p.id}>
                <NavLink
                  to={`/projects/${p.id}`}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-white/10 font-medium text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-[3px] ${isActive ? 'bg-signal-500' : 'bg-ink-600 group-hover:bg-ink-400'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{p.name}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );

  const userBlock = user && (
    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
      <Avatar id={user.id} name={user.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-ink-400">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/10 hover:text-white"
      >
        Log out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="on-ink sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 bg-ink-900 px-4 py-6 lg:flex">
        <Link to="/projects" aria-label="TaskFlow home" className="px-2">
          <Logo onInk />
        </Link>
        {nav}
        {userBlock}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="on-ink sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-900 px-4 lg:hidden">
          <Link to="/projects" aria-label="TaskFlow home">
            <Logo onInk />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="rounded-lg p-2 text-ink-200 hover:bg-white/10"
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </header>
        {menuOpen && (
          <div id="mobile-menu" key={location.pathname} className="on-ink flex flex-col gap-6 bg-ink-900 px-4 pb-5 lg:hidden">
            {nav}
            {userBlock}
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
