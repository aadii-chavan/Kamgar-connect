import { BrickWall, Flame, Grid2x2, Hammer, HandHelping, PaintRoller, Wrench, Zap, type LucideIcon } from "lucide-react";

interface SkillStyle { icon: LucideIcon; bg: string; shadow: string }

const STYLES: Record<string, SkillStyle> = {
  Mason: { icon: BrickWall, bg: "#F2845C", shadow: "rgba(242,132,92,0.55)" },
  Painter: { icon: PaintRoller, bg: "#5AA9F0", shadow: "rgba(90,169,240,0.55)" },
  Electrician: { icon: Zap, bg: "#F2B33D", shadow: "rgba(242,179,61,0.55)" },
  Helper: { icon: HandHelping, bg: "#3BBA8C", shadow: "rgba(59,186,140,0.55)" },
  Plumber: { icon: Wrench, bg: "#33B5C8", shadow: "rgba(51,181,200,0.55)" },
  "Tile Fitter": { icon: Grid2x2, bg: "#8B7CF6", shadow: "rgba(139,124,246,0.55)" },
  Carpenter: { icon: Hammer, bg: "#B08968", shadow: "rgba(176,137,104,0.55)" },
  Welder: { icon: Flame, bg: "#EF6A78", shadow: "rgba(239,106,120,0.55)" },
};

export const skillStyle = (skill: string): SkillStyle =>
  STYLES[skill] ?? { icon: Hammer, bg: "#93A0A8", shadow: "rgba(147,160,168,0.5)" };
