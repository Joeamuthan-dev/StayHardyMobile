
export interface ProductivityScoreInput {
  tasksProgress: number;
  routinesProgress: number;
  goalsProgress: number;
}

export const calculateProductivityScore = ({
  tasksProgress,
  routinesProgress,
  goalsProgress,
}: ProductivityScoreInput): number => {
  // Weights: Routines (50%), Goals (30%), Tasks (20%)
  const weightedScore = (routinesProgress * 0.5) + (goalsProgress * 0.3) + (tasksProgress * 0.2);
  return Math.round(weightedScore);
};

export const getScoreLabels = (score: number, totalItems: number) => {
  if (score === 0 && totalItems === 0) return { label: 'IDLE', verdict: "No tasks found. Start your journey by adding some goals.", icon: 'hotel' };
  if (score === 0) return { label: 'LAZY', verdict: "0% complete? That's not a score, it's a starting point. Do something.", icon: 'bed' };
  if (score < 20) return { label: 'SLACKER', verdict: `${score}%... You're just scratching the surface. Pathetic effort.`, icon: 'timer' };
  if (score < 40) return { label: 'WAKING UP', verdict: `${score}% is better than nothing, but you're still warming up.`, icon: 'coffee' };
  if (score < 60) return { label: 'AVERAGE', verdict: `${score}% performance. You're the human equivalent of unflavored oatmeal.`, icon: 'trending_up' };
  if (score < 80) return { label: 'CONSISTENT', verdict: `${score}%. You're actually being useful. Don't ruin it by taking a 3-hour break.`, icon: 'workspace_premium' };
  if (score < 95) return { label: 'BEAST', verdict: `${score}%! Look at you go. Almost impressive. Keep that ego in check though.`, icon: 'bolt' };
  if (score < 100) return { label: 'ELITE', verdict: `${score}% efficiency. You're so close to perfection it actually hurts.`, icon: 'auto_awesome' };
  return { label: 'THE GOAT', verdict: "100% CLEAN SWEEP. You're either a productivity god or you're lying to yourself. Legend.", icon: 'stars' };
};
