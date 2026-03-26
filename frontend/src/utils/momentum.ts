export const TAGLINES = [
  "GHOST MODE", "STILL SLEEPING", "BARELY ALIVE", "FLATLINE", "ARE YOU EVEN TRYING",
  "JUST WOKE UP", "PULSE DETECTED", "ALIVE. BARELY.", "SHOWING UP (KIND OF)", "BOTTOM TIER",
  "WARMING UP (VERY SLOWLY)", "SMALL STEPS", "TRYING TO TRY", "SOME EFFORT", "SLUGGISH",
  "MOVING SLOW", "CRAWLING FORWARD", "INCHING ALONG", "SLOW BURN", "WAKING UP",
  "COASTING", "MINIMAL MODE", "BELOW AVERAGE", "ROOM TO GROW", "NOT YOUR BEST",
  "QUARTER WAY", "NEEDS WORK", "ALMOST TRYING", "HALF-HEARTED", "POTENTIAL UNSEEN",
  "PICKING UP", "GETTING STARTED", "DECENT EFFORT", "MOVING", "GRINDING (SLOWLY)",
  "BUILDING BASE", "FOUNDATION MODE", "ROOTS GROWING", "STEADY ENOUGH", "ALMOST MIDWAY",
  "MIDFIELD PLAYER", "HOLDING STEADY", "AVERAGE HUSTLE", "KEEPING UP", "STAYING IN GAME",
  "ALMOST THERE", "JUST BELOW", "PUSHING THROUGH", "CLOSING THE GAP", "ONE MORE PUSH",
  "HALFWAY WARRIOR", "PAST MIDPOINT", "ABOVE AVERAGE", "GAINING GROUND", "CLIMBING",
  "MOMENTUM DETECTED", "BUILDING SPEED", "LEVELING UP", "GETTING SHARPER", "ON THE RISE",
  "MOMENTUM BUILDING", "SOLID PERFORMER", "CONSISTENT", "SHOWING UP DAILY", "RELIABLE",
  "GETTING SERIOUS", "LOCKED IN", "FOCUSED MODE", "SYSTEM RUNNING", "NEARLY ELITE",
  "HIGH PERFORMER", "TOP TIER ENERGY", "STRONG OUTPUT", "EXCELLENCE MODE", "FIRING UP",
  "THREE QUARTERS", "RELENTLESS", "UNSTOPPABLE PACE", "BEAST MODE LOADING", "ALMOST ELITE",
  "CHARGING FORWARD", "ELITE ZONE", "CRUSHING IT", "MOMENTUM PEAK", "LOCKED AND LOADED",
  "DOMINANT", "POWERHOUSE", "FORCE OF NATURE", "UNTOUCHABLE", "NEAR PERFECT",
  "LEGENDARY PACE", "ON FIRE", "HEAT CHECK", "MAXIMUM OUTPUT", "SUPERHUMAN",
  "PURE EXCELLENCE", "TRANSCENDENT", "GODMODE ACTIVE", "PEAK EXISTENCE", "ONE PERCENT",
  "STAY HARDY"
];

export const QUOTES = [
  "Your category is literally a ghost town.", "Even your alarm gave up on you.",
  "The couch called. You answered.", "Nothing. Absolutely nothing. Wow.",
  "You didn't just miss the bar. You buried it.", "One task. You couldn't. Really.",
  "Your effort is technically measurable. Barely.", "Alive. Not thriving. Just... here.",
  "Points for showing up. That's it.", "The bottom has a view. You'd know.",
  "Warming up takes time. This is taking too long.", "Small steps. Microscopic, but steps.",
  "You tried to try. Close enough?", "Something moved. Slightly.",
  "Sluggish, but the engine isn't off yet.", "Slow is fine. Stopped is not you. Right?",
  "Crawling counts. Technically.", "Every inch forward beats every excuse backward.",
  "The slow burn is real. Light it up.", "Eyes open. Brain loading. Let's go.",
  "Coasting is just falling with style.", "Minimal effort, minimal results. Funny how that works.",
  "You're better than this. We both know it.", "The gap between you and great is closable.",
  "Yesterday's you would be disappointed. Fix it.", "A quarter done. Three quarters of excuses left.",
  "It needs work. You have the tools.", "You're almost trying. Finish the thought.",
  "Half-hearted gets half the outcome. Always.", "Potential is just a plan that hasn't moved yet.",
  "The wheels are turning. Shift up.", "You started. That's the hardest part. Now go.",
  "Decent. Decent won't make you legendary.", "Moving is not optional. You're moving.",
  "The grind is slow. The grind is real.", "Every rep builds the base. Keep building.",
  "Foundations take time. Yours is forming.", "Roots first. Then the tree. Keep going.",
  "Steady isn't glamorous. It's powerful.", "Almost at the half. Don't blink now.",
  "Midfield is safe. Safe doesn't win.", "Holding steady is step one. Step two: accelerate.",
  "Average is a temporary home, not a destination.", "You're keeping up. Now keep pushing past.",
  "Still in the game. Stay in the game.", "Almost there isn't almost good enough. Push.",
  "One decision away from breaking through.", "You're pushing through resistance. That's growth.",
  "The gap is closing. You're closing it.", "One. More. Push. That's all it takes.",
  "Halfway is the hardest. You made it.", "Past the middle means the finish is closer.",
  "Above average is not where you stop.", "Gaining ground feels good. Don't stop here.",
  "Every climb starts where you're standing. Up.", "Momentum is real. You just created some.",
  "Speed building. Don't tap the brakes.", "You're leveling up. The results show it.",
  "Sharper every day. The edge is showing.", "The rise is happening. Stay on it.",
  "Momentum is your new best friend.", "Solid work. Solid people do solid things daily.",
  "Consistency is the cheat code. You found it.", "Showing up daily is 80% of excellence.",
  "Reliable. Underrated. Powerful. That's you.", "Getting serious means the results get real.",
  "Locked in. Distraction can't touch this.", "Focus is a superpower. You're using it.",
  "The system is running. Results incoming.", "Nearly elite. Close enough to taste it.",
  "High performance is a habit now.", "Top tier energy attracts top tier results.",
  "Strong output. Strong character. Strong future.", "Excellence isn't an event. It's a practice. Yours.",
  "You're firing up. Everything responds to that.", "Three quarters strong. Finish like you started.",
  "Relentless is a personality trait now. Own it.", "The pace is unstoppable. Don't question it.",
  "Beast mode isn't a switch. It's a lifestyle.", "Elite is one step away. One deliberate step.",
  "Charging forward. Everything else is catching up.", "Elite zone entered. The view is different here.",
  "Crushing it is an understatement right now.", "Momentum at its peak. Ride it hard.",
  "Locked. Loaded. Executing. Perfect.", "Dominant energy. The category bows to you.",
  "Powerhouse performance. This is your standard now.", "Force of nature. Can't be stopped. Won't be.",
  "Untouchable. They're watching and wondering how.", "Near perfect is the new floor for you.",
  "Legendary pace. History remembers people like this.", "On fire and aware of it. Dangerous combo.",
  "Heat check. You're not slowing down.", "Maximum output. Every resource deployed.",
  "Superhuman consistency. Science can't explain you.", "Pure excellence. No luck. Just you.",
  "You've transcended the ordinary. This is rare air.", "Godmode. They said it wasn't possible. You laughed.",
  "Peak existence. Every action intentional. Every result earned.", "The 1%. You didn't just reach it. You are it."
];

export const getAnimal = (score: number): string => {
  if (score <= 9)  return "🐌"; // Snail
  if (score <= 19) return "🦥"; // Sloth  
  if (score <= 29) return "🐢"; // Tortoise
  if (score <= 39) return "🦀"; // Crab
  if (score <= 49) return "🐕"; // Dog
  if (score <= 59) return "🦌"; // Deer
  if (score <= 69) return "🐺"; // Wolf
  if (score <= 79) return "🐆"; // Cheetah
  if (score <= 89) return "🦅"; // Eagle
  if (score <= 99) return "🐎"; // Horse
  return "🐉";                  // Dragon (100%)
};
