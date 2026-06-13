import "./App.css";

const navigationItems = ["Planner", "Trips", "Account"];

const workspacePanels = [
  {
    title: "Trip setup",
    status: "No trip selected",
    detail: "Dates, cities, pace, budget, and interests"
  },
  {
    title: "Itinerary board",
    status: "Empty",
    detail: "Daily activities and travel notes"
  },
  {
    title: "Travel context",
    status: "Pending trip",
    detail: "Map links, weather, and local context"
  }
];

export function App() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Workspace navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            JP
          </div>
          <div>
            <p className="brand-kicker">Japan Travel Planner</p>
            <p className="brand-name">AI Workspace</p>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationItems.map((item, index) => (
            <span
              aria-current={index === 0 ? "page" : undefined}
              className="primary-nav-item"
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </aside>

      <main className="app-main" aria-labelledby="workspace-title">
        <section className="workspace-hero">
          <div>
            <p className="section-kicker">Web MVP Shell</p>
            <h1 id="workspace-title">Japan trip workspace</h1>
            <p className="workspace-state">No trip selected</p>
          </div>

          <dl className="shell-status" aria-label="Shell status">
            <div>
              <dt>Frontend</dt>
              <dd>React + Vite</dd>
            </div>
            <div>
              <dt>Local URL</dt>
              <dd>localhost:5173</dd>
            </div>
            <div>
              <dt>Backend</dt>
              <dd>Not required</dd>
            </div>
          </dl>
        </section>

        <section className="workspace-grid" aria-label="Planner areas">
          {workspacePanels.map((panel) => (
            <article className="workspace-panel" key={panel.title}>
              <p className="panel-status">{panel.status}</p>
              <h2>{panel.title}</h2>
              <p>{panel.detail}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
