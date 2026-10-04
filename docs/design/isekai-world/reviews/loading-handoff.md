# Loading handoff

The former global loading screen advanced to completion on a 1.5-second timer, independently of model loading. When it disappeared, the desk was still behind an opaque, unlabelled overlay. After desk readiness, that overlay also waited for stable frames (up to 600 ms) and ran a 1.2-second fade. The timer was not a measurement of actual loading progress.

The global simulated loader and the desk's black entrance overlay are removed. One visual loading indicator now covers capability detection, the dynamic scene bundle and desk asset preparation. Its progress animation is indeterminate. The scene replaces it in the same readiness update after the desk has rendered frames; there is no extra entrance timer or fade. Optional world assets retain their independent failure/loading boundaries.

Page scrolling is locked for the actual duration of the lobby and restored on entry, skip or capability bypass. Mobile and reduced-motion visitors enter the portfolio without the simulated delay. The monitor-to-portfolio dive is unchanged.

Validation: production build, TypeScript, changed-file ESLint and all nine native-GPU lobby browser scenarios. The new scenario holds the desk model response beyond the former fake timer, checks that the indicator remains visible, then releases it and checks that the ready scene has no loading cover. It also verifies scroll restoration after entry.

The screenshots in `../implementation/loading-handoff/` show the blocked-model loading state and the scene immediately after readiness. The earlier performance report measured asset readiness before this change; its former post-readiness fade no longer applies.
