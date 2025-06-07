# UX Notes – Japan Travel Planner AI

This document summarizes key user experience design decisions, wireframes, and rationale for the app interface on web and mobile.

---

## Design Overview

The app focuses on three main screens that shape the user journey:

1. **Trip Input Form** – Collects user preferences like destination, dates, days, and interests.
2. **Itinerary Results View** – Displays a structured, day-by-day plan.
3. **Navigation Menu** – Lets users switch between Home, Saved Trips, and Settings.

Mockups are designed using **Figma** and exported as `.png` to `/docs/wireframes`.

---

## Web vs. Mobile Design

### Web

- **Form Layout**: A single-page form with grouped and collapsible sections for efficient input.
- **Design System**: Tailwind CSS for consistency and flexibility.
- **Navigation**: Top navigation bar or sidebar for direct access to main features.

### Mobile

- **Form Layout**: Multi-step wizard using a React Navigation stack, designed for thumb-friendly input.
- **Design System**: React Native Paper, following Material Design guidelines for clarity and familiarity.
- **Navigation**: Bottom tab navigation for easy access on small screens.

---

## User-Centric Features

### Editing & Overrides

- Users can:
  - Edit any day or activity directly in the itinerary view.
  - Regenerate plans for specific days as needed.
  - Add or remove items from their itinerary for complete control.

### Trip Summary

- The itinerary screen always displays a summary at the top, showing:
  - Start Date
  - Duration
  - Destination
  - Interests

---

## UI Components

| Section         | Component Type                         |
| --------------- | -------------------------------------- |
| Trip Form       | Input fields, dropdowns, tags          |
| Day-by-Day View | Cards or Accordions per day            |
| Activity List   | Timeline or FlatList                   |
| Edits/Overrides | Buttons for edit/add/delete/regenerate |
| Trip Metadata   | Summary card or header                 |

---

## Wireframes

Exported mockups:

- `/docs/wireframes/trip_form_mockup.png`
- `/docs/wireframes/itinerary_results_mockup.png`
- `/docs/wireframes/navigation_mockup.png`

Designed in Figma, available in PNG format for dev reference.
