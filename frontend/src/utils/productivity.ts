
export interface ProductivityScoreInput {
  tasksProgress: number;
  routinesProgress: number;
  goalsProgress: number;
  isPro?: boolean;
}

export const calculateProductivityScore = ({
  tasksProgress,
  routinesProgress,
  goalsProgress,
}: ProductivityScoreInput): number => {
  // Routines 50%, Goals 30%, Tasks 20%
  const weightedScore = (routinesProgress * 0.5) + (goalsProgress * 0.3) + (tasksProgress * 0.2);
  return Math.round(weightedScore);
};

// ─── Score label data ──────────────────────────────────────────────────────────

const ZERO_SCORE_VARIANTS = [
  { label: 'GHOST MODE',     verdict: "You're completely invisible. Did you forget you have goals, or are you just hiding?",        icon: 'visibility_off' },
  { label: 'FLATLINE',       verdict: "Zero activity detected. Are you even real? Blink twice if you need help.",                   icon: 'monitor_heart' },
  { label: 'PRE-LAUNCH',     verdict: "You look like a rocket before ignition. Cool to look at. Going absolutely nowhere.",         icon: 'rocket_launch' },
  { label: 'STILL SLEEPING', verdict: "Your goals are awake and waiting. Unfortunately, so is your couch.",                        icon: 'bed' },
  { label: 'BUFFERING',      verdict: "Still loading? The loading screen isn't the game. Get started.",                            icon: 'loop' },
  { label: 'WHO ARE YOU',    verdict: "A mysterious user with zero progress. Very enigmatic. Extremely unproductive.",              icon: 'help' },
  { label: 'OFFLINE',        verdict: "You're present but not really HERE. Log off Netflix and log on to your goals.",             icon: 'wifi_off' },
  { label: 'HIBERNATING',    verdict: "Zero effort detected. The bears called. They want their whole thing back.",                  icon: 'dark_mode' },
  { label: 'DAY ZERO',       verdict: "Every legend starts somewhere. This is your somewhere. Now move.",                          icon: 'flag' },
  { label: 'NOT STARTED',    verdict: "Zero. Zilch. Nada. The app is basically just decoration for you right now.",                icon: 'hourglass_empty' },
];

const PERFECT_SCORE_VARIANTS = [
  { label: 'THE GOAT',            verdict: "You absolute unit. This is what peak performance looks like.",                                  icon: 'stars' },
  { label: 'UNTOUCHABLE',         verdict: "CLEAN SWEEP. Incredibly disciplined or incredibly bored — either way, respect.",                icon: 'auto_awesome' },
  { label: 'CERTIFIED BEAST',     verdict: "Flawless execution. We literally ran out of roasts for this.",                                  icon: 'bolt' },
  { label: 'LEGENDARY',           verdict: "You did everything. Every. Single. Thing. We are not worthy.",                                  icon: 'emoji_events' },
  { label: 'NO EXCUSES',          verdict: "Not one task skipped. Not one habit missed. That's disrespectful to the rest of us.",           icon: 'check_circle' },
  { label: 'FULL SEND',           verdict: "Absolutely sent it today. Every single thing. We salute you, soldier.",                         icon: 'military_tech' },
  { label: 'PRODUCTIVITY GOD',    verdict: "You are the question, the answer, and the whole exam. Remarkable.",                             icon: 'whatshot' },
  { label: 'IMMACULATE',          verdict: "Not a single slip. Not a single excuse. You are the standard now.",                             icon: 'workspace_premium' },
  { label: 'ALGORITHM BREAKER',   verdict: "You broke the scale. We ran out of labels. Congratulations.",                                   icon: 'analytics' },
  { label: 'PERFECT GAME',        verdict: "Baseball calls it a perfect game. You call it a regular Tuesday apparently.",                   icon: 'sports_score' },
];

const SCORE_LABELS: Record<number, { label: string; verdict: string; icon: string }> = {
  1:  { label: 'BARELY ALIVE',         verdict: "You technically started. The bar was on the floor and you grazed it.",                   icon: 'battery_1_bar' },
  2:  { label: 'PULSE DETECTED',       verdict: "Faint signs of life detected. Very faint. But we'll take it.",                           icon: 'monitor_heart' },
  3:  { label: 'STILL LOADING',        verdict: "This is going to take a while. We'll wait. Probably.",                                    icon: 'hourglass_top' },
  4:  { label: 'WARMING UP',           verdict: "Okay, you exist and you're doing something. Now do more of that.",                        icon: 'local_fire_department' },
  5:  { label: 'COLD START',           verdict: "You started the engine. The destination still requires you to actually drive.",            icon: 'directions_car' },
  6:  { label: 'BABY STEPS',           verdict: "Small steps still count. Embarrassingly small, but they count.",                          icon: 'child_care' },
  7:  { label: 'BETTER THAN ZERO',     verdict: "Not great. Not good. But definitively better than zero. Proud of you.",                  icon: 'thumb_up' },
  8:  { label: 'TECHNICALLY TRYING',   verdict: "You are technically doing something. Technically.",                                       icon: 'psychology' },
  9:  { label: 'SINGLE DIGIT CLUB',    verdict: "The most exclusive club nobody wants to be in. Time to resign your membership.",         icon: 'looks_one' },
  10: { label: 'ROOKIE NUMBERS',       verdict: "We need to pump these numbers up. These are rookie numbers in this club.",                icon: 'trending_up' },
  11: { label: 'LIGHT DRIZZLE',        verdict: "Not a storm. Not even rain. A light drizzle of productivity. Pick it up.",               icon: 'water_drop' },
  12: { label: 'ALMOST REAL',          verdict: "Starting to resemble a productive person. Only starting, but still.",                     icon: 'person' },
  13: { label: 'UNLUCKY THIRTEEN',     verdict: "Is it bad luck or bad habits? Either way — change your luck.",                           icon: 'casino' },
  14: { label: 'QUARTER OF HALFWAY',   verdict: "You're a quarter of the way to halfway. Let that sink in slowly.",                       icon: 'pie_chart' },
  15: { label: 'THE FLOOR',            verdict: "This is the floor. You seem comfortable here. You shouldn't be.",                        icon: 'foundation' },
  16: { label: 'PARTICIPATION MODE',   verdict: "Here's your participation trophy. Now do something to actually earn it.",                icon: 'emoji_events' },
  17: { label: 'BACKGROUND NOISE',     verdict: "You're the background noise of productivity. Turn up the volume.",                       icon: 'volume_mute' },
  18: { label: 'JUST VIBES',           verdict: "You have the vibes. The results are missing. Focus on results.",                         icon: 'music_note' },
  19: { label: 'PREHEATING',           verdict: "Still in preheat mode. Ovens take 10 minutes. What's your excuse?",                      icon: 'whatshot' },
  20: { label: 'ONE-FIFTH IN',         verdict: "One-fifth done. The other four-fifths are just sitting there staring at you.",           icon: 'filter_1' },
  21: { label: 'SLOW BURN',            verdict: "Slow burn energy. Hope it actually catches fire eventually.",                             icon: 'local_fire_department' },
  22: { label: 'CASUAL MODE',          verdict: "You're in it. Just not fully in it. Commit a little harder.",                            icon: 'pool' },
  23: { label: 'SHOWING UP',           verdict: "You showed up. That's step one. Step two is actually doing the work.",                   icon: 'login' },
  24: { label: 'QUARTER-ISH',          verdict: "Almost a quarter done. Close enough to see it, not enough to brag about.",               icon: 'pie_chart' },
  25: { label: 'QUARTER DONE',         verdict: "One quarter down, three to go. You've got this... probably.",                            icon: 'looks_one' },
  26: { label: 'ABOVE FLOOR LEVEL',    verdict: "You're above the floor. Not by much. But above it.",                                     icon: 'compare_arrows' },
  27: { label: 'THINGS ARE MOVING',    verdict: "Things are happening. Very slowly. But they are happening.",                             icon: 'pending' },
  28: { label: 'WORKING ON IT',        verdict: "That's what you keep saying right? Working on it? Let's actually see it.",               icon: 'construction' },
  29: { label: 'ONE FROM THIRTY',      verdict: "One percent away from a milestone. Don't you dare stop here.",                           icon: 'timer' },
  30: { label: 'DECENT ATTEMPT',       verdict: "Solid C-grade energy. Decent attempt. Now shoot for a B.",                               icon: 'school' },
  31: { label: 'BEYOND BASIC',         verdict: "You cleared that wall. Now go clear the next one with the same attitude.",               icon: 'fitness_center' },
  32: { label: 'EARLY MOMENTUM',       verdict: "Momentum is forming. Don't waste it by checking your phone.",                            icon: 'speed' },
  33: { label: 'ONE-THIRD DONE',       verdict: "A full third of everything, done. Now do the other two-thirds.",                        icon: 'pie_chart' },
  34: { label: 'MAKING MOVES',         verdict: "Moves are being made. Small moves. But still moves.",                                    icon: 'directions_walk' },
  35: { label: 'MID-LOW GRIND',        verdict: "The bar is low but you're clearing it. Raise the bar.",                                 icon: 'bar_chart' },
  36: { label: 'PICKING UP SPEED',     verdict: "Speed is increasing... slowly... but it is increasing.",                                 icon: 'fast_forward' },
  37: { label: 'NOT BAD',              verdict: "Not bad. Not good. Solidly, dependably not bad.",                                       icon: 'thumbs_up_down' },
  38: { label: 'BECOMING SOMETHING',   verdict: "You're almost becoming something here. Keep showing up.",                                icon: 'auto_awesome' },
  39: { label: 'ON THE EDGE',          verdict: "One percent from a milestone. Stop hovering and commit already.",                        icon: 'balance' },
  40: { label: 'DECENT GRIND',         verdict: "Grinding. It's a slow grind but it's still a grind.",                                   icon: 'fitness_center' },
  41: { label: 'OVER FORTY',           verdict: "You broke the wall. You're officially in the 'actually trying' category.",              icon: 'trending_up' },
  42: { label: 'THE ANSWER',           verdict: "The answer to life, the universe, and your still-improving productivity.",               icon: 'psychology' },
  43: { label: 'ALMOST HALFWAY',       verdict: "You can almost smell the halfway point from here. Push harder.",                         icon: 'explore' },
  44: { label: 'CLOSING IN',           verdict: "Closing in on that halfway mark. Keep that energy alive.",                               icon: 'flag' },
  45: { label: 'NINE-TENTHS OF HALF',  verdict: "Nearly halfway. The real test is what you do when you get there.",                      icon: 'pending' },
  46: { label: 'CLOSE CALL',           verdict: "So close to half. Do not stop here. Not here.",                                         icon: 'sports_score' },
  47: { label: 'PRE-HALFWAY',          verdict: "The halfway line is RIGHT THERE. Go touch it.",                                         icon: 'sports_soccer' },
  48: { label: 'NEARLY HALF',          verdict: "Two from halfway. You are testing our collective patience.",                             icon: 'timer' },
  49: { label: 'ONE AWAY FROM HALF',   verdict: "Physically painful to see this. Do one more thing. Just one.",                          icon: 'sentiment_very_dissatisfied' },
  50: { label: 'HALFWAY HERO',         verdict: "Dead center. The glass is exactly half full. Now fill the other half.",                 icon: 'water' },
  51: { label: 'MAJORITY ACHIEVED',    verdict: "You officially did more than you didn't. Majority rules.",                              icon: 'how_to_vote' },
  52: { label: 'PAST THE MIDPOINT',    verdict: "Past the midpoint and climbing. The second half is where legends are made.",            icon: 'trending_up' },
  53: { label: 'MOMENTUM BUILDING',    verdict: "Momentum acquired. Protect it like your last one percent battery.",                     icon: 'battery_charging_full' },
  54: { label: 'SOLID SHOWING',        verdict: "Solid. Respectable. Still plenty of room to surprise everyone including yourself.",     icon: 'thumbs_up_down' },
  55: { label: 'MORE THAN HALF',       verdict: "More than half done and still moving. This is the move.",                               icon: 'moving' },
  56: { label: 'GETTING REAL',         verdict: "It's getting real. You're starting to look like someone with their life together.",    icon: 'face' },
  57: { label: 'ABOVE AVERAGE',        verdict: "Statistically above average. Don't let it go to your head though.",                    icon: 'leaderboard' },
  58: { label: 'CLIMBING',             verdict: "Climbing steadily. Don't look down. Don't look at your phone either.",                 icon: 'north' },
  59: { label: 'ONE FROM SIXTY',       verdict: "One percent from a milestone. Go get it — it's right there.",                          icon: 'sports_score' },
  60: { label: 'RESPECTABLE',          verdict: "Now we're talking. This is a genuinely respectable score. Build on it.",               icon: 'workspace_premium' },
  61: { label: 'ABOVE THE FOLD',       verdict: "You're above average and rising. Aim higher than 'above average' though.",             icon: 'expand_less' },
  62: { label: 'STRONG SHOWING',       verdict: "Strong showing. You're not slacking, you're stacking wins.",                           icon: 'stacked_bar_chart' },
  63: { label: 'IN THE ZONE',          verdict: "You're in a zone. Not the peak zone, but a legitimate zone.",                          icon: 'gps_fixed' },
  64: { label: 'BUILDING STEAM',       verdict: "Steam is building. You're almost at the point where people start noticing.",           icon: 'local_fire_department' },
  65: { label: 'TWO-THIRDS ZONE',      verdict: "Almost two-thirds complete. The last third is where champions are forged.",            icon: 'whatshot' },
  66: { label: 'RUNNING HOT',          verdict: "Running hot right now. This is not the time to cool off.",                             icon: 'thermostat' },
  67: { label: 'TWO-THIRDS DONE',      verdict: "Two-thirds done. One more push puts you in the home stretch.",                        icon: 'directions_run' },
  68: { label: 'STEADY GRINDER',       verdict: "Steady and consistent. The tortoise would be proud. So are we.",                      icon: 'speed' },
  69: { label: 'ALMOST SEVENTY',       verdict: "Nice. Also — one more percent hits a clean milestone. Focus on that.",                 icon: 'mood' },
  70: { label: 'SERIOUS CONTENDER',    verdict: "You're a serious contender now. Don't waste the position you've earned.",             icon: 'emoji_events' },
  71: { label: 'ABOVE SEVENTY',        verdict: "Past the mark and still climbing. You're in rare territory.",                         icon: 'air' },
  72: { label: 'FIRING',               verdict: "Firing on multiple cylinders. Whatever you're doing — keep doing it.",               icon: 'bolt' },
  73: { label: 'STRONG ARM',           verdict: "Strong output. Your future self is genuinely impressed right now.",                   icon: 'fitness_center' },
  74: { label: 'ALMOST THREE-FOURTHS', verdict: "One percent from three-quarters. That's not a coincidence, that's opportunity.",     icon: 'pie_chart' },
  75: { label: 'THREE-QUARTER BEAST',  verdict: "Three quarters done. Most people quit here. You're not most people.",               icon: 'sports_score' },
  76: { label: 'LOCKED IN',            verdict: "Locked in. Eyes on the prize. We see what you're building.",                        icon: 'gps_fixed' },
  77: { label: 'ELITE TERRITORY',      verdict: "You're entering elite territory. Wipe your feet at the door.",                      icon: 'workspace_premium' },
  78: { label: 'PUTTING IN WORK',      verdict: "Real work going in. The kind that compounds and shows up later.",                   icon: 'construction' },
  79: { label: 'ONE FROM EIGHTY',      verdict: "One percent from a clean milestone. You don't settle. You're better than that.",   icon: 'timer' },
  80: { label: 'CERTIFIED GRINDER',    verdict: "Certified grinder. Four out of five things done is a very real W.",                icon: 'military_tech' },
  81: { label: 'TOP TIER',             verdict: "Top tier energy. You're making the leaderboard look good.",                        icon: 'leaderboard' },
  82: { label: 'EXCELLENCE',           verdict: "Excellence isn't an accident — it's what you've been quietly building.",          icon: 'auto_awesome' },
  83: { label: 'UNSTOPPABLE',          verdict: "At this point you're basically unstoppable. Almost. Finish it.",                   icon: 'flash_on' },
  84: { label: 'CLOSE TO THE TOP',     verdict: "So close to the top tier it's almost painful to see the remaining gap.",          icon: 'expand_less' },
  85: { label: 'HIGH PERFORMER',       verdict: "High performer status: unlocked. Use this energy responsibly.",                   icon: 'workspace_premium' },
  86: { label: 'SERIOUSLY IMPRESSIVE', verdict: "We're officially taking you seriously now. Good seriously.",                      icon: 'thumb_up' },
  87: { label: 'RARE AIR',             verdict: "Not many people breathe this air. You earned the altitude.",                      icon: 'air' },
  88: { label: 'PHENOMENAL',           verdict: "Phenomenal output. The grind is paying off in visible, real ways.",               icon: 'star' },
  89: { label: 'EDGE OF GLORY',        verdict: "Right on the edge of glory. One final push gets you over.",                      icon: 'flag' },
  90: { label: 'ALMOST FLAWLESS',      verdict: "Almost flawless. The remaining gap is your only proof you're still human.",      icon: 'verified' },
  91: { label: 'ELITE',                verdict: "Elite. You're in the conversation now. Stay in it.",                             icon: 'emoji_events' },
  92: { label: 'NEAR PERFECT',         verdict: "Near perfect. The margin is razor thin — push through it.",                     icon: 'straighten' },
  93: { label: 'ASCENDING',            verdict: "Final climb to the peak. You've come too far to coast now.",                    icon: 'moving' },
  94: { label: 'EXCEPTIONAL',          verdict: "Exceptional doesn't even cover it. This is a whole lifestyle.",                 icon: 'auto_awesome' },
  95: { label: 'RELENTLESS',           verdict: "Relentless. You don't stop. You won't stop. We love every second of it.",      icon: 'flash_on' },
  96: { label: 'DOMINANT',             verdict: "Dominant. Only a sliver standing between you and perfection. Dismantle it.",   icon: 'shield' },
  97: { label: 'SO CLOSE',             verdict: "Almost there. Finish what you started — it deserves a proper ending.",         icon: 'timer' },
  98: { label: 'RAZOR THIN',           verdict: "That gap is literally almost nothing. GO.",                                     icon: 'sports_score' },
  99: { label: 'ONE PERCENT AWAY',     verdict: "ONE PERCENT. This is not the time to stop. FINISH. IT.",                      icon: 'flag' },
};

// ─── Main label function ───────────────────────────────────────────────────────

export const getScoreLabels = (score: number, totalItems: number) => {
  if (score === 0 && totalItems === 0) {
    return { label: 'IDLE', verdict: "No tasks found. Start your journey by adding some goals.", icon: 'hotel' };
  }
  if (score === 0) {
    return ZERO_SCORE_VARIANTS[Math.floor(Math.random() * ZERO_SCORE_VARIANTS.length)];
  }
  if (score === 100) {
    return PERFECT_SCORE_VARIANTS[Math.floor(Math.random() * PERFECT_SCORE_VARIANTS.length)];
  }
  return SCORE_LABELS[score] ?? { label: 'PUSHING', verdict: "Climbing. Keep going.", icon: 'trending_up' };
};
