import type { ReactNode } from 'react';
import { Logo } from '../components/layout/AppShell';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BoardShowcase />

      <div className="flex flex-col bg-white px-6 py-10 sm:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold text-ink-900">{title}</h1>
          <p className="mb-8 mt-2 text-ink-500">{subtitle}</p>
          {children}
          <p className="mt-8 text-sm text-ink-600">{footer}</p>
        </div>
      </div>
    </div>
  );
}

/* A miniature board: what the product is, shown rather than described. One card is mid-drag. */
function BoardShowcase() {
  const columns: { name: string; cards: { w: string; stripe: string }[] }[] = [
    { name: 'To do', cards: [{ w: 'w-4/5', stripe: 'bg-flag-500' }, { w: 'w-3/5', stripe: 'bg-calm-500' }, { w: 'w-2/3', stripe: 'bg-signal-500' }] },
    { name: 'In progress', cards: [{ w: 'w-3/4', stripe: 'bg-signal-500' }] },
    { name: 'Done', cards: [{ w: 'w-2/3', stripe: 'bg-calm-500' }, { w: 'w-1/2', stripe: 'bg-flag-500' }] },
  ];

  return (
    <div className="on-ink relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-12 lg:flex" aria-hidden="true">
      <Logo onInk />

      <div className="relative mx-auto w-full max-w-lg">
        <div className="grid grid-cols-3 gap-3">
          {columns.map((col) => (
            <div key={col.name} className="rounded-[14px] bg-white/[0.06] p-3">
              <p className="mb-3 text-xs font-medium text-ink-300">{col.name}</p>
              <div className="space-y-2">
                {col.cards.map((card, i) => (
                  <div key={i} className="relative overflow-hidden rounded-[8px] bg-white/95 py-2.5 pl-3.5 pr-2.5">
                    <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${card.stripe}`} />
                    <div className={`h-1.5 rounded-full bg-ink-200 ${card.w}`} />
                    <div className="mt-1.5 h-1.5 w-1/3 rounded-full bg-ink-100" />
                  </div>
                ))}
                {col.name === 'In progress' && <div className="h-11 rounded-[8px] border-2 border-dashed border-signal-500/60" />}
              </div>
            </div>
          ))}
        </div>

        {/* The card being dragged from "To do" into "In progress" */}
        <div className="absolute left-[30%] top-[46%] w-[31%] animate-float-card rounded-[8px] bg-white py-2.5 pl-3.5 pr-2.5 shadow-[0_18px_40px_-8px_rgba(0,0,0,0.55)] ring-2 ring-signal-500">
          <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-flag-500" />
          <div className="h-1.5 w-4/5 rounded-full bg-ink-300" />
          <div className="mt-1.5 flex items-center justify-between">
            <div className="h-1.5 w-1/3 rounded-full bg-ink-100" />
            <span className="h-3.5 w-3.5 rounded-full bg-signal-500" />
          </div>
        </div>
      </div>

      <div className="max-w-md">
        <p className="font-display text-3xl font-semibold leading-tight text-white">
          See what's next, what's moving and what's done.
        </p>
        <p className="mt-3 text-ink-300">Projects, tasks and deadlines for your team, on one board.</p>
      </div>
    </div>
  );
}
