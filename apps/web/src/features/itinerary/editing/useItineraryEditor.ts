import { useReducer } from "react";

import type {
  Activity,
  Itinerary
} from "../../../../../../packages/shared/src/schemas/itinerary.js";

export type ReorderDirection = "up" | "down";

export type ItineraryEditorState = {
  itinerary: Itinerary | null;
  isDirty: boolean;
  nextActivityNumber: number;
};

export type ItineraryEditorAction =
  | {
      type: "reset";
      itinerary: Itinerary | null;
    }
  | {
      type: "addActivity";
      dayDate: string;
      activity: Activity;
    }
  | {
      type: "updateActivity";
      dayDate: string;
      activityId: string;
      activity: Activity;
    }
  | {
      type: "deleteActivity";
      dayDate: string;
      activityId: string;
    }
  | {
      type: "moveActivity";
      dayDate: string;
      activityId: string;
      direction: ReorderDirection;
    };

function cloneActivity(activity: Activity): Activity {
  return {
    ...activity,
    location: { ...activity.location },
    timing: { ...activity.timing }
  };
}

export function cloneItinerary(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map(cloneActivity)
    }))
  };
}

function withEditableActivityIds(itinerary: Itinerary) {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity, index) => ({
        ...cloneActivity(activity),
        id: activity.id ?? `${day.date}-activity-${index + 1}`
      }))
    }))
  } satisfies Itinerary;
}

export function createItineraryEditorState(
  itinerary: Itinerary | null
): ItineraryEditorState {
  const editableItinerary = itinerary
    ? withEditableActivityIds(cloneItinerary(itinerary))
    : null;
  const activityCount =
    editableItinerary?.days.reduce(
      (total, day) => total + day.activities.length,
      0
    ) ?? 0;

  return {
    itinerary: editableItinerary,
    isDirty: false,
    nextActivityNumber: activityCount + 1
  };
}

function createLocalActivityId(dayDate: string, nextActivityNumber: number) {
  return `${dayDate}-local-${nextActivityNumber}`;
}

function updateItineraryDay(
  state: ItineraryEditorState,
  dayDate: string,
  updateDay: NonNullable<ItineraryEditorState["itinerary"]>["days"][number]
) {
  if (!state.itinerary) {
    return state;
  }

  return {
    ...state,
    isDirty: true,
    itinerary: {
      ...state.itinerary,
      days: state.itinerary.days.map((day) =>
        day.date === dayDate ? updateDay : day
      )
    }
  } satisfies ItineraryEditorState;
}

export function itineraryEditorReducer(
  state: ItineraryEditorState,
  action: ItineraryEditorAction
): ItineraryEditorState {
  if (action.type === "reset") {
    return createItineraryEditorState(action.itinerary);
  }

  if (!state.itinerary) {
    return state;
  }

  const day = state.itinerary.days.find(
    (candidateDay) => candidateDay.date === action.dayDate
  );

  if (!day) {
    return state;
  }

  if (action.type === "addActivity") {
    const activity = cloneActivity(action.activity);
    const nextActivity = {
      ...activity,
      id:
        activity.id ??
        createLocalActivityId(action.dayDate, state.nextActivityNumber)
    } satisfies Activity;

    return {
      ...updateItineraryDay(state, action.dayDate, {
        ...day,
        activities: [...day.activities, nextActivity]
      }),
      nextActivityNumber: state.nextActivityNumber + 1
    };
  }

  const activityIndex = day.activities.findIndex(
    (activity) => activity.id === action.activityId
  );

  if (activityIndex === -1) {
    return state;
  }

  if (action.type === "updateActivity") {
    const nextActivities = [...day.activities];
    nextActivities[activityIndex] = {
      ...cloneActivity(action.activity),
      id: action.activityId
    };

    return updateItineraryDay(state, action.dayDate, {
      ...day,
      activities: nextActivities
    });
  }

  if (action.type === "deleteActivity") {
    if (day.activities.length <= 1) {
      return state;
    }

    return updateItineraryDay(state, action.dayDate, {
      ...day,
      activities: day.activities.filter(
        (activity) => activity.id !== action.activityId
      )
    });
  }

  const targetIndex =
    action.direction === "up" ? activityIndex - 1 : activityIndex + 1;

  if (targetIndex < 0 || targetIndex >= day.activities.length) {
    return state;
  }

  const nextActivities = [...day.activities];
  const currentActivity = nextActivities[activityIndex];
  const targetActivity = nextActivities[targetIndex];

  if (!currentActivity || !targetActivity) {
    return state;
  }

  nextActivities[activityIndex] = targetActivity;
  nextActivities[targetIndex] = currentActivity;

  return updateItineraryDay(state, action.dayDate, {
    ...day,
    activities: nextActivities
  });
}

export function useItineraryEditor(initialItinerary: Itinerary | null = null) {
  const [state, dispatch] = useReducer(
    itineraryEditorReducer,
    createItineraryEditorState(initialItinerary)
  );

  return {
    itinerary: state.itinerary,
    isDirty: state.isDirty,
    resetItinerary: (itinerary: Itinerary | null) =>
      dispatch({ type: "reset", itinerary }),
    addActivity: (dayDate: string, activity: Activity) =>
      dispatch({ type: "addActivity", dayDate, activity }),
    updateActivity: (
      dayDate: string,
      activityId: string,
      activity: Activity
    ) =>
      dispatch({
        type: "updateActivity",
        dayDate,
        activityId,
        activity
      }),
    deleteActivity: (dayDate: string, activityId: string) =>
      dispatch({ type: "deleteActivity", dayDate, activityId }),
    moveActivity: (
      dayDate: string,
      activityId: string,
      direction: ReorderDirection
    ) =>
      dispatch({
        type: "moveActivity",
        dayDate,
        activityId,
        direction
      })
  };
}
