/**
 * Questions play in ascending point order (standard Jeopardy board), so
 * `position` is kept as a direct reflection of `points` rather than
 * insertion order -- otherwise a question added later with a lower point
 * value would sort after higher-value questions on the board. Ties keep
 * their existing relative order. Returns only the rows whose position
 * actually needs to change.
 */

export interface PositionedQuestion {
  id: string;
  points: number;
  position: number;
}

export function computeQuestionPositions(questions: PositionedQuestion[]): { id: string; position: number }[] {
  const sorted = questions.slice().sort((a, b) => a.points - b.points || a.position - b.position);
  return sorted
    .map((q, index) => ({ id: q.id, position: index }))
    .filter((next) => questions.find((q) => q.id === next.id)?.position !== next.position);
}
