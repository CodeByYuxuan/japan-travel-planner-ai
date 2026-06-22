import type { ReorderDirection } from "./useItineraryEditor.js";

export type ReorderControlsProps = {
  activityTitle: string;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMove: (direction: ReorderDirection) => void;
};

export function ReorderControls({
  activityTitle,
  canMoveDown,
  canMoveUp,
  onMove
}: ReorderControlsProps) {
  return (
    <div className="reorder-controls" aria-label={`${activityTitle} order`}>
      <button
        aria-label={`Move ${activityTitle} up`}
        disabled={!canMoveUp}
        onClick={() => onMove("up")}
        type="button"
      >
        Up
      </button>
      <button
        aria-label={`Move ${activityTitle} down`}
        disabled={!canMoveDown}
        onClick={() => onMove("down")}
        type="button"
      >
        Down
      </button>
    </div>
  );
}
