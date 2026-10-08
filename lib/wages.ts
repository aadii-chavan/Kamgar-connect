/** Suggested daily pay by trade, used to nudge contractors toward fair offers. Adjust these as local rates change. */
export const WAGE_RANGE: Record<string, [number, number]> = {
  Mason: [750, 950], Painter: [650, 850], Electrician: [900, 1200], Helper: [450, 600],
  Plumber: [800, 1000], "Tile Fitter": [800, 1000], Carpenter: [800, 1000], Welder: [850, 1100],
};

export type WageVerdict = "low" | "fair" | "high";
export function wageVerdict(skill: string, perDay: number): { verdict: WageVerdict; range: [number, number] } | null {
  const range = WAGE_RANGE[skill];
  if (!range || !perDay) return null;
  return { verdict: perDay < range[0] ? "low" : perDay > range[1] ? "high" : "fair", range };
}
