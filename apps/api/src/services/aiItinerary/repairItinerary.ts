import type { ItineraryPrompt } from "./prompt.js";
import type { AiItineraryOutputParseError } from "./schema.js";

export type ItineraryRepairPrompt = {
  instructions: string;
  input: string;
};

const maxInvalidOutputLength = 6000;

export function buildItineraryRepairPrompt(options: {
  originalPrompt: ItineraryPrompt;
  invalidOutput: string;
  parseError: AiItineraryOutputParseError;
}): ItineraryRepairPrompt {
  return {
    instructions: [
      "You are repairing a Japan Travel Planner AI itinerary JSON response.",
      "Return corrected structured JSON only. Do not include Markdown, commentary, citations, or prose outside the JSON object.",
      "Preserve the traveler request and planning rules from the original prompt.",
      "Fix only the structural/schema issues described in the validation errors."
    ].join("\n"),
    input: [
      "The previous model output could not be parsed into the required itinerary schema.",
      "",
      "Validation errors:",
      formatParseErrors(options.parseError),
      "",
      "Original prompt instructions:",
      options.originalPrompt.instructions,
      "",
      "Original trip request and output contract:",
      options.originalPrompt.input,
      "",
      "Invalid model output to repair:",
      truncateInvalidOutput(options.invalidOutput),
      "",
      "Return exactly one corrected JSON object that satisfies the original output contract."
    ].join("\n")
  };
}

function formatParseErrors(error: AiItineraryOutputParseError) {
  return error.fieldErrors
    .map((fieldError) => `- ${fieldError.path}: ${fieldError.message}`)
    .join("\n");
}

function truncateInvalidOutput(output: string) {
  if (output.length <= maxInvalidOutputLength) {
    return output;
  }

  return `${output.slice(0, maxInvalidOutputLength)}\n[truncated]`;
}
