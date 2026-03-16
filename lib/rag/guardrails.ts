import type { SearchResult, GuardrailDecision } from "./types";

export function checkGuardrails(
  chunks: SearchResult[],
  options: {
    minTopScore?: number;
    minRelevantChunks?: number;
  } = {}
): GuardrailDecision {
  const { minTopScore = 0.18, minRelevantChunks = 1 } = options;

  if (chunks.length === 0) {
    return { shouldAnswer: false, reason: "No chunks retrieved" };
  }

  const topScore = chunks[0]?.score ?? 0;
  if (topScore < minTopScore) {
    return {
      shouldAnswer: false,
      reason: `Top score ${topScore.toFixed(3)} below threshold ${minTopScore}`,
    };
  }

  const relevantCount = chunks.filter((c) => c.score >= minTopScore).length;
  if (relevantCount < minRelevantChunks) {
    return {
      shouldAnswer: false,
      reason: `Only ${relevantCount} relevant chunks (need ${minRelevantChunks})`,
    };
  }

  return { shouldAnswer: true, reason: "Passed guardrails" };
}
