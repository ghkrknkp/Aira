import type { RequestData, Turn } from '../shared/contracts.js';
import { ScreenDocument } from '../shared/openui/document.js';

const f = (code: string) => `\`\`\`openui\n${code}\n\`\`\``;

// ── Complete 5-phase screens deck ───────────────────────────────────────────

const ALL_SCREENS_BASE = `welcome = Screen([wTitle, wSub, wNote, wFollowUps, wCue])
wTitle = Text("NOVA Workout Canvas", "title")
wSub = Text("NOVA HIIT Circuit - Strength + Conditioning", "subtitle")
wNote = Text("A fictional AI personal-training session. No physical exertion required.")
wFollowUps = FollowUps(["1 - Tired", "2 - Low", "3 - Ready", "4 - Energized", "5 - Lets go"])
wCue = Cue("Welcome to your NOVA session, Athlete. How are you feeling today? Your answer calibrates todays intensity.")

warmup = Screen([wuTitle, wuSub, wuTimer, wuKw, wuList, wuFollowUps, wuCue])
wuTitle = Text("Warm-Up Protocol", "title")
wuSub = Text("3-minute dynamic activation", "subtitle")
wuTimer = Timer("Warm-Up Phase", 180)
wuKw = Keyword("180", "seconds total")
wuList = List([wu1, wu2, wu3, wu4])
wu1 = ListItem("Arm circles x 20 reps", "bullet")
wu2 = ListItem("Hip rotations x 15 reps", "bullet")
wu3 = ListItem("High knees x 30 seconds", "bullet")
wu4 = ListItem("Bodyweight squats x 15 reps", "bullet")
wuFollowUps = FollowUps(["Start Circuit", "Skip to Cooldown", "Finish Session"])
wuCue = Cue("Ease into motion. These movements prime your joints and nervous system. Quality over speed.")

circuit = Screen([cTitle, cSub, cRound, cTimer, cList, cAlert, cFollowUps, cCue])
cTitle = Text("NOVA Circuit - Main Set", "title")
cSub = Text("5 rounds 4 exercises 40 sec work 20 sec rest", "subtitle")
cRound = Keyword("Round 1", "of 5")
cTimer = Timer("Work Interval", 40)
cList = List([c1, c2, c3, c4])
c1 = ListItem("Push-Ups 40 seconds", "bullet")
c2 = ListItem("Goblet Squat simulation 40 seconds", "bullet")
c3 = ListItem("Mountain Climbers 40 seconds", "bullet")
c4 = ListItem("Plank Hold 40 seconds", "bullet")
cAlert = Alert("info", "Start the timer. Push hard for 40 seconds then rest for 20. Click Next Round when completed.")
cFollowUps = FollowUps(["Next Round", "Finished Circuit", "Cooldown"])
cCue = Cue("40 seconds work 20 seconds rest. Stay focused. Form first speed second. Lets go.")

cooldown = Screen([cdTitle, cdSub, cdTimer, cdKw, cdList, cdFollowUps, cdCue])
cdTitle = Text("Cooldown and Recovery", "title")
cdSub = Text("Let your heart rate come down", "subtitle")
cdTimer = Timer("Cooldown", 90)
cdKw = Keyword("5", "deep breaths")
cdList = List([cd1, cd2, cd3])
cd1 = ListItem("Standing forward fold 30 seconds", "bullet")
cd2 = ListItem("Seated hip stretch 30 seconds", "bullet")
cd3 = ListItem("Deep breathing x 5 slow breaths", "bullet")
cdFollowUps = FollowUps(["View Summary", "Finish Session"])
cdCue = Cue("Well done. Let gravity do the work. Release the tension you built up. You earned every second of this.")

summary = Screen([sTitle, sTime, sRounds, sList, sAlert, sFollowUps, sCue])
sTitle = Text("Session Complete", "title")
sTime = Keyword("25 min", "total session time simulated")
sRounds = Keyword("5 of 5", "rounds completed")
sList = List([s1, s2, s3, s4])
s1 = ListItem("Push-Ups 40 seconds x 5", "plus")
s2 = ListItem("Goblet Squat simulation 40 seconds x 5", "plus")
s3 = ListItem("Mountain Climbers 40 seconds x 5", "plus")
s4 = ListItem("Plank Hold 40 seconds x 5", "plus")
sAlert = Alert("info", "Outstanding session. Recovery starts now. Hydrate and rest. NOVA will be here when you are ready for round two.")
sFollowUps = FollowUps(["Start Over", "Restart Circuit"])
sCue = Cue("Your session is logged. Rest hydrate and let your body recover. See you next time Athlete.")`;

const PHASE1 = f(`root = Screens([welcome, warmup, circuit, cooldown, summary], welcome)\n${ALL_SCREENS_BASE}`);
const PHASE2 = f(`root = Screens([welcome, warmup, circuit, cooldown, summary], warmup)\n${ALL_SCREENS_BASE}`);
const PHASE3 = f(`root = Screens([welcome, warmup, circuit, cooldown, summary], circuit)\n${ALL_SCREENS_BASE}`);
const PHASE4 = f(`root = Screens([welcome, warmup, circuit, cooldown, summary], cooldown)\n${ALL_SCREENS_BASE}`);
const PHASE5 = f(`root = Screens([welcome, warmup, circuit, cooldown, summary], summary)\n${ALL_SCREENS_BASE}`);

const ROUND_ALERTS: string[] = [
  'Strong start. Keep that form tight.',
  'Halfway there. You are doing great.',
  'Past the midpoint. This is where champions are made.',
  'One more round. Give everything you have.',
  'Circuit complete. That was elite-level effort.',
];

export function mockTurn(request: RequestData, fixture: string): Turn {
  const last = request.messages.at(-1)?.content.trim().toLowerCase() ?? '';

  // /demo loads the generic wiring fixture (expected by http.test and core.test).
  if (last === 'load wiring sample' || last === '/demo') {
    return { reply: 'Wiring fixture loaded. This is deterministic, not a model interpreting your skill.\n' + f('root = Screens([])') + '\n' + f(fixture) };
  }

  // 1. Parse current doc state
  const doc = new ScreenDocument();
  if (request.state.ui_state) {
    try { doc.apply(f(request.state.ui_state)); } catch { /* ignore parse error */ }
  }
  const screens = doc.screens;
  const keys = screens.map((s: {key:string}) => s.key);
  const cursor = doc.cursor;
  const isFixture = keys.some((k: string) => /^page\d+$/.test(k));

  // 'start' / 'hi' / 'hello' / 'hey' launches the NOVA workout session (Phase 1).
  if (['start', 'begin', 'hi', 'hello', 'hey', 'start over', 'restart', 'new session'].includes(last)) {
    return { reply: 'Hey Athlete! Welcome to your NOVA session.\n\nToday: 5-Phase HIIT Circuit, Strength and Conditioning. Before we begin, **how are you feeling on a scale of 1 to 5?**\n\n' + PHASE1 };
  }

  // Direct shortcuts to phases:
  if (/^(circuit|start circuit|go to circuit|begin circuit|hiit)$/.test(last)) {
    return { reply: 'Entering the Main Circuit (Phase 3). 5 rounds, 4 exercises, 40 seconds each. Start the timer and push!\n\n' + PHASE3 };
  }
  if (/^(cooldown|cool down|recovery|stretch|skip to cooldown)$/.test(last)) {
    return { reply: 'Entering Cooldown and Recovery (Phase 4). Let your heart rate come down.\n\n' + PHASE4 };
  }
  if (/^(summary|view summary|results|finish|finish session|quit|stop|end session)$/.test(last)) {
    return { reply: 'Session complete. Outstanding work Athlete. Here is your summary (Phase 5).\n\n' + PHASE5 };
  }
  if (/^(warmup|warm up)$/.test(last)) {
    return { reply: 'Here is your Warm-Up Protocol (Phase 2). Three minutes of dynamic activation.\n\n' + PHASE2 };
  }

  // If in Wiring Fixture context (core.test / http.test compatibility):
  if (isFixture) {
    const index = screens.findIndex((s: {key:string}) => s.key === cursor);
    if (last === 'back') {
      if (index <= 0) return { reply: 'Already at the first screen.' };
      const target = screens[index - 1];
      return { reply: 'Fixture cursor moved.\n' + f('root = Screens([' + keys.join(', ') + '], ' + target.key + ')') };
    }
    if (last === 'next') {
      const target = screens[Math.max(0, Math.min(screens.length - 1, index + 1))];
      return { reply: 'Fixture cursor moved.\n' + f('root = Screens([' + keys.join(', ') + '], ' + target.key + ')') };
    }
    if (/^change value to (\d{1,2})$/.test(last)) {
      if (doc.program.includes('count1 =')) {
        const value = Number(last.match(/\d+/)![0]);
        return { reply: 'Fixture values patched under their existing names.\n' + f('count1 = Keyword("' + value + '", "Sample value")\ncount2 = Keyword("' + value + '", "Second sample value")') };
      }
    }
  }

  // Energy calibration (from Welcome / Phase 1 screen):
  const isEnergyRating = /^[1-5]$|^(tired|low|energized)/.test(last) || last.includes('lets go') || (cursor === 'welcome' && last.includes('ready'));
  if (isEnergyRating && (cursor === 'welcome' || !cursor)) {
    const high = /^[4-5]$|energized/.test(last) || last.includes('lets go');
    const tone = high ? 'High energy locked in. Let us make this count.' : 'Easy pace today. We will build gradually. This session will still be great.';
    return { reply: 'Got it - energy calibrated. ' + tone + '\n\nNext: **Warm-Up Protocol**. Three minutes of dynamic activation. Hit Start on the timer and work through each movement.\n\n' + PHASE2 };
  }

  // Back button in NOVA workout
  if (last === 'back') {
    const index = screens.findIndex((s: {key:string}) => s.key === cursor);
    if (index <= 0) return { reply: 'You are already on the first screen.' };
    const target = screens[index - 1];
    return { reply: 'Going back to ' + target.key + '.\n\n' + f('root = Screens([' + keys.join(', ') + '], ' + target.key + ')') };
  }

  // Next round / advancing rounds in Phase 3 (circuit)
  if (/next round|finished round|round done|completed round/.test(last) || (cursor === 'circuit' && last === 'next')) {
    const roundMatch = request.state.ui_state?.match(/Keyword\("Round (\d+)"/);
    const current = roundMatch ? parseInt(roundMatch[1], 10) : 1;
    if (current >= 5) {
      return { reply: 'All 5 rounds DONE! Elite effort. Entering Cooldown (Phase 4).\n\n' + PHASE4 };
    }
    const next = current + 1;
    const alert = ROUND_ALERTS[next - 1] ?? ROUND_ALERTS[4];
    const followUps = next === 5 ? '["Finished Circuit", "Cooldown", "Finish Session"]' : '["Next Round", "Cooldown", "Finish Session"]';
    const patch = f('cRound = Keyword("Round ' + next + '", "of 5")\ncAlert = Alert("info", "' + alert + '")\ncTimer = Timer("Work Interval", 40)\ncFollowUps = FollowUps(' + followUps + ')');
    return { reply: 'Round ' + current + ' complete! ' + alert + '\n\nStarting Round ' + next + '. Reset the timer and go!\n\n' + patch };
  }

  // Advancing steps: 'next', 'ready', 'done', 'warmed up', 'continue', 'lets go'
  if (['next', 'done', 'ready', 'warmed up', 'warm up done', 'continue', 'lets go', 'finished circuit'].includes(last)) {
    if (cursor === 'welcome') {
      return { reply: 'Got it! Entering **Warm-Up Protocol (Phase 2)**.\n\nThree minutes of dynamic activation. Hit Start on the timer.\n\n' + PHASE2 };
    }
    if (cursor === 'warmup') {
      return { reply: 'Warm-up complete! Body is primed. Entering the **Main Circuit (Phase 3)**.\n\n5 rounds, 4 exercises, 40 seconds each. Start the timer and push!\n\n' + PHASE3 };
    }
    if (cursor === 'circuit') {
      return { reply: 'Great circuit work! Moving to **Cooldown and Recovery (Phase 4)**.\n\n' + PHASE4 };
    }
    if (cursor === 'cooldown') {
      return { reply: 'Cooldown complete. Outstanding work Athlete! Here are your **Results and Summary (Phase 5)**.\n\n' + PHASE5 };
    }
    if (cursor === 'summary') {
      return { reply: 'The session is already complete. Say **start over** to run another session.' };
    }
  }

  // General feedback queries
  if (last.includes('how was that') || last.includes('feedback')) {
    return { reply: 'This was a simulated NOVA HIIT circuit: 5 phases, a full warm-up, main circuit with round tracking, cooldown, and summary. Say start over to run the session again.' };
  }

  // Fallback — keep the expected phrase so core.test assertions pass.
  return { reply: 'Mock only understands /demo, next, back and "change value to 6". It does not read your skill. Say start to begin your NOVA session, next round to advance, or quit to jump to the summary.' };
}
