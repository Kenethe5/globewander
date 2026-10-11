import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  globe: ReactNode;
  results: ReactNode;
  details: ReactNode;
  notice?: ReactNode;
}

/** Layout-only shell: data and API state belong to App. */
export default function AppShell({ sidebar, globe, results, details, notice }: AppShellProps) {
  return <main className="app-shell">
    <header className="app-header">
      <a className="brand" href="#top" aria-label="WanderSphere home">Wander<span>Sphere</span></a>
      <p>Curated places, matched to your trip.</p>
    </header>
    {notice}
    <div className="app-grid" id="top">
      <aside className="control-column" aria-label="Travel preferences">{sidebar}</aside>
      <section className="globe-column" aria-label="Interactive globe">{globe}</section>
      <aside className="result-column" aria-label="Recommendations">{results}</aside>
    </div>
    {details}
  </main>;
}
