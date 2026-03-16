export const calcPercentage = (intake: number, goal: number) =>
  Math.min(intake / goal, 1);

export const calcDisplayPercent = (intake: number, goal: number) =>
  Math.round((intake / goal) * 100);