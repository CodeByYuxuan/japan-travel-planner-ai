import "./App.css";

import { useState } from "react";

import type { Itinerary } from "../../../packages/shared/src/schemas/itinerary.js";
import { ItineraryView } from "./features/itinerary/ItineraryView.js";
import { TripIntakeForm } from "./features/trip-intake/index.js";
import { mockItinerary } from "./mocks/index.js";

const navigationItems = ["Planner", "Trips", "Account"];

const mockSubmitDelayMs = 500;

export function App() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workspacePanels = [
    {
      title: "Trip setup",
      status: isSubmitting ? "Submitting" : "Ready",
      detail: "Dates, cities, pace, budget, and interests"
    },
    {
      title: "Itinerary board",
      status: itinerary ? "Preview ready" : "Waiting",
      detail: "Daily activities, timing, locations, cost levels, and notes"
    },
    {
      title: "Travel context",
      status: "Mock context",
      detail: "Map links, weather, and local context"
    }
  ];

  function handleMockSubmit() {
    setIsSubmitting(true);
    setItinerary(null);

    setTimeout(() => {
      setItinerary(mockItinerary);
      setIsSubmitting(false);
    }, mockSubmitDelayMs);
  }

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
            <h1 id="workspace-title">Japan trip planner</h1>
            <p className="workspace-state">
              Build a request from dates, cities, interests, pace, budget, and
              constraints before previewing a structured mock itinerary.
            </p>
          </div>

          <dl className="shell-status" aria-label="Shell status">
            <div>
              <dt>Trip</dt>
              <dd>{itinerary?.title ?? "Not generated"}</dd>
            </div>
            <div>
              <dt>Days</dt>
              <dd>{itinerary?.days.length ?? 0}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>
                {isSubmitting ? "Loading" : itinerary ? "Preview" : "Input"}
              </dd>
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

        <section className="planner-workspace" aria-label="Trip planner">
          <TripIntakeForm
            isSubmitting={isSubmitting}
            onMockSubmit={handleMockSubmit}
          />
          <ItineraryView itinerary={itinerary} isLoading={isSubmitting} />
        </section>
      </main>
    </div>
  );
}
