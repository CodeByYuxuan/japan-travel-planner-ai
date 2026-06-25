import "./App.css";

import { useMemo, useState } from "react";

import type { TripRequest } from "../../../packages/shared/src/schemas/tripRequest.js";
import {
  downloadPdfFile,
  ExportControls
} from "./features/export/ExportControls.js";
import { ItineraryView } from "./features/itinerary/ItineraryView.js";
import {
  cloneItinerary,
  useItineraryEditor
} from "./features/itinerary/editing/useItineraryEditor.js";
import { useGeneratedItinerary } from "./features/itinerary/useGeneratedItinerary.js";
import { ShareControls } from "./features/sharing/ShareControls.js";
import { TripIntakeForm } from "./features/trip-intake/index.js";
import {
  getDefaultTripDataMode,
  getTripErrorMessage,
  useTrips,
  type TripDataMode
} from "./features/trips/useTrips.js";
import { createTripApiClient } from "./lib/api/client.js";
import { mockItinerary } from "./mocks/index.js";
import { SharedTripPage } from "./routes/SharedTripPage.js";

const navigationItems = ["Planner", "Trips", "Account"];

const mockSubmitDelayMs = 500;

function isApiBusy(status: ReturnType<typeof useTrips>["status"]) {
  return (
    status === "creating" ||
    status === "loading" ||
    status === "reopening" ||
    status === "saving" ||
    status === "sharing"
  );
}

export function getShareTokenFromPathname(pathname: string) {
  if (!pathname.startsWith("/share/")) {
    return null;
  }

  const token = pathname.slice("/share/".length).split("/")[0] ?? "";

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

function getCurrentPathname() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function App() {
  const shareToken = getShareTokenFromPathname(getCurrentPathname());
  const [activeRequest, setActiveRequest] = useState<TripRequest | null>(null);
  const [dataMode, setDataMode] = useState<TripDataMode>(
    getDefaultTripDataMode
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMockSubmitting, setIsMockSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );
  const tripApiClient = useMemo(() => createTripApiClient(), []);
  const generatedItinerary = useGeneratedItinerary();
  const itineraryEditor = useItineraryEditor(null);
  const itinerary = itineraryEditor.itinerary;
  const trips = useTrips();
  const apiBusy = isApiBusy(trips.status);
  const isGenerating = generatedItinerary.status === "generating";
  const isSubmitting =
    isMockSubmitting ||
    isGenerating ||
    trips.status === "creating" ||
    trips.status === "saving";
  const saveButtonLabel =
    trips.status === "error" && itineraryEditor.isDirty
      ? "Retry save"
      : "Save itinerary";
  const storageMessage =
    localError ?? generatedItinerary.errorMessage ?? trips.errorMessage;
  const selectedShareLink = trips.selectedTripId
    ? trips.shareLinksByTripId[trips.selectedTripId]
    : undefined;
  const shareDisabledReason =
    dataMode === "mock"
      ? "Switch to API mode and save the trip before sharing."
      : !trips.selectedTripId
        ? "Save this itinerary before creating a public share link."
        : itineraryEditor.isDirty
          ? "Save local edits before sharing the itinerary."
          : undefined;
  const exportDisabledReason =
    dataMode === "mock"
      ? "Switch to API mode and save the trip before exporting."
      : apiBusy
        ? "Wait for the current trip operation to finish before exporting."
        : !trips.selectedTripId
          ? "Save this itinerary before exporting a PDF."
          : itineraryEditor.isDirty
            ? "Save local edits before exporting the itinerary."
            : undefined;

  if (shareToken !== null) {
    return <SharedTripPage shareToken={shareToken} />;
  }

  const workspacePanels = [
    {
      title: "Trip setup",
      status: isGenerating
        ? "Generating"
        : isSubmitting
          ? "Submitting"
          : "Ready",
      detail: "Dates, cities, pace, budget, and interests"
    },
    {
      title: "Itinerary board",
      status: itineraryEditor.isDirty
        ? "Local edits"
        : itinerary
          ? "Preview ready"
          : "Waiting",
      detail: "Daily activities, timing, locations, cost levels, and notes"
    },
    {
      title: "Trip storage",
      status:
        dataMode === "mock"
          ? "Mock mode"
          : trips.status === "error" && itineraryEditor.isDirty
            ? "Retry needed"
          : trips.status === "saved"
            ? "Saved"
            : "API ready",
      detail: "Anonymous session cookies, saved trips, and reopen controls"
    }
  ];

  function resetToItinerary(nextItinerary: typeof itinerary) {
    itineraryEditor.resetItinerary(
      nextItinerary ? cloneItinerary(nextItinerary) : null
    );
  }

  function handleMockSubmit(request: TripRequest) {
    setActiveRequest(request);
    setLocalError(null);
    setExportErrorMessage(null);
    trips.clearError();
    generatedItinerary.clearError();
    setIsMockSubmitting(true);
    itineraryEditor.resetItinerary(null);
    trips.selectTrip(null);

    setTimeout(() => {
      resetToItinerary(mockItinerary);
      setIsMockSubmitting(false);
    }, mockSubmitDelayMs);
  }

  async function handleTripSubmit(request: TripRequest) {
    if (dataMode === "mock") {
      handleMockSubmit(request);
      return;
    }

    setActiveRequest(request);
    setLocalError(null);
    setExportErrorMessage(null);
    trips.clearError();
    generatedItinerary.clearError();
    resetToItinerary(null);
    trips.selectTrip(null);

    const result = await generatedItinerary.generateItinerary(request);

    if (result) {
      setActiveRequest(request);
      resetToItinerary(result.itinerary);
    }
  }

  async function handleSaveItinerary() {
    if (!itinerary) {
      setLocalError("Create or reopen an itinerary before saving.");
      return;
    }

    if (!activeRequest) {
      setLocalError("Trip request details are required before saving.");
      return;
    }

    setLocalError(null);
    setExportErrorMessage(null);
    generatedItinerary.clearError();

    const result = await trips.saveTrip(
      trips.selectedTripId,
      activeRequest,
      itinerary
    );

    if (result) {
      setActiveRequest(result.request);
      resetToItinerary(result.itinerary);
    }
  }

  function handleRevertItinerary() {
    itineraryEditor.revertItinerary();
    setLocalError(null);
    setExportErrorMessage(null);
    trips.clearError();
    generatedItinerary.clearError();
  }

  async function handleReopenTrip() {
    if (!trips.selectedTripId) {
      setLocalError("Select a saved trip to reopen.");
      return;
    }

    setLocalError(null);
    setExportErrorMessage(null);
    generatedItinerary.clearError();

    const result = await trips.reopenTrip(trips.selectedTripId);

    if (result) {
      setActiveRequest(result.request);
      resetToItinerary(result.itinerary);
    }
  }

  async function handleLoadSavedTrips() {
    setLocalError(null);
    setExportErrorMessage(null);
    generatedItinerary.clearError();
    await trips.loadSavedTrips();
  }

  async function handleExportPdf() {
    if (!trips.selectedTripId) {
      setExportErrorMessage("Save this itinerary before exporting a PDF.");
      return;
    }

    setExportErrorMessage(null);
    setIsExportingPdf(true);

    try {
      const pdf = await tripApiClient.exportTripPdf(trips.selectedTripId);

      downloadPdfFile(pdf);
    } catch (error) {
      setExportErrorMessage(getTripErrorMessage(error));
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleCreateShareLink() {
    if (!trips.selectedTripId) {
      setLocalError("Save this itinerary before creating a public share link.");
      return;
    }

    setLocalError(null);
    setExportErrorMessage(null);
    generatedItinerary.clearError();
    await trips.createShareLink(trips.selectedTripId);
  }

  function handleModeChange(nextMode: TripDataMode) {
    setDataMode(nextMode);
    setLocalError(null);
    setExportErrorMessage(null);
    trips.clearError();
    generatedItinerary.clearError();
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
              constraints before saving or previewing a structured itinerary.
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
              <dd>{dataMode === "api" ? "API" : "Mock"}</dd>
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
          <div className="planner-sidebar-panel">
            <TripIntakeForm
              isSubmitting={isSubmitting}
              onSubmitTrip={handleTripSubmit}
              submitLabel={
                dataMode === "api"
                  ? "Generate AI itinerary"
                  : "Generate mock itinerary"
              }
              {...(dataMode === "api"
                ? {
                    mockSubmitLabel: "Use mock preview",
                    onMockSubmit: handleMockSubmit
                  }
                : {})}
            />

            <section
              aria-labelledby="trip-storage-title"
              className="trip-storage-panel"
            >
              <header>
                <p className="section-kicker">Trip storage</p>
                <h2 id="trip-storage-title">Save and reopen</h2>
              </header>

              <div className="mode-toggle" aria-label="Trip data mode">
                <button
                  aria-pressed={dataMode === "api"}
                  onClick={() => handleModeChange("api")}
                  type="button"
                >
                  API
                </button>
                <button
                  aria-pressed={dataMode === "mock"}
                  onClick={() => handleModeChange("mock")}
                  type="button"
                >
                  Mock
                </button>
              </div>

              <p className="storage-status" role="status">
                {isGenerating
                  ? "Generating itinerary"
                  : generatedItinerary.status === "error"
                    ? "Generation needs retry"
                    : apiBusy
                      ? "Working"
                      : trips.status === "error" && itineraryEditor.isDirty
                        ? "Retry or revert local edits"
                      : trips.status === "saved"
                        ? "Saved"
                        : itineraryEditor.isDirty
                          ? "Local edits pending"
                          : dataMode === "mock"
                            ? "Mock mode"
                            : "Ready"}
              </p>

              {storageMessage ? (
                <p className="storage-error" role="alert">
                  {storageMessage}
                </p>
              ) : null}

              <div className="storage-actions">
                <button
                  disabled={dataMode === "mock" || apiBusy || !itinerary}
                  onClick={handleSaveItinerary}
                  type="button"
                >
                  {saveButtonLabel}
                </button>
                <button
                  disabled={apiBusy || !itinerary || !itineraryEditor.isDirty}
                  onClick={handleRevertItinerary}
                  type="button"
                >
                  Revert local edits
                </button>
                <button
                  disabled={dataMode === "mock" || apiBusy}
                  onClick={handleLoadSavedTrips}
                  type="button"
                >
                  Refresh saved trips
                </button>
              </div>

              <label className="saved-trip-select">
                Saved trips
                <select
                  disabled={dataMode === "mock" || apiBusy}
                  onChange={(event) =>
                    trips.selectTrip(event.currentTarget.value || null)
                  }
                  value={trips.selectedTripId ?? ""}
                >
                  <option value="">Select a saved trip</option>
                  {trips.savedTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="trip-reopen-button"
                disabled={
                  dataMode === "mock" || apiBusy || !trips.selectedTripId
                }
                onClick={handleReopenTrip}
                type="button"
              >
                Reopen trip
              </button>

              <ExportControls
                disabledReason={exportDisabledReason}
                errorMessage={exportErrorMessage}
                isExporting={isExportingPdf}
                onExportPdf={handleExportPdf}
              />

              <ShareControls
                disabledReason={shareDisabledReason}
                isSharing={trips.status === "sharing"}
                onCreateShareLink={handleCreateShareLink}
                shareLink={selectedShareLink}
                tripId={trips.selectedTripId}
              />
            </section>
          </div>

          <ItineraryView
            editing={{
              isDirty: itineraryEditor.isDirty,
              onAddActivity: itineraryEditor.addActivity,
              onDeleteActivity: itineraryEditor.deleteActivity,
              onMoveActivity: itineraryEditor.moveActivity,
              onUpdateActivity: itineraryEditor.updateActivity
            }}
            itinerary={itinerary}
            isLoading={isSubmitting}
          />
        </section>
      </main>
    </div>
  );
}
