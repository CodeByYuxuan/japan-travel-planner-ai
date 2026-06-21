import "./App.css";

import { ItineraryView } from "./features/itinerary/ItineraryView.js";
import { mockItinerary } from "./mocks/index.js";

const navigationItems = ["Planner", "Trips", "Account"];

const workspacePanels = [
  {
    title: "Trip setup",
    status: "Next ticket",
    detail: "Dates, cities, pace, budget, and interests"
  },
  {
    title: "Itinerary board",
    status: "Preview ready",
    detail: "Daily activities, timing, locations, cost levels, and notes"
  },
  {
    title: "Travel context",
    status: "Mock context",
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
            <p className="section-kicker">Web MVP Preview</p>
            <h1 id="workspace-title">Japan trip itinerary</h1>
            <p className="workspace-state">
              A balanced Tokyo and Kyoto spring route with temples, markets,
              viewpoints, and easy walking windows.
            </p>
          </div>

          <dl className="shell-status" aria-label="Shell status">
            <div>
              <dt>Trip</dt>
              <dd>{mockItinerary.title}</dd>
            </div>
            <div>
              <dt>Days</dt>
              <dd>{mockItinerary.days.length}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Preview</dd>
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

        <ItineraryView itinerary={mockItinerary} />
      </main>
    </div>
  );
}
