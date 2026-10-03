export const CONTEXT_GRACE_MS = 2000;

/** How long a lost WebGL context may stay lost before the lobby is skipped. Closed bitmaps cannot be re-uploaded,
 * so a restore would render black: skip at once. Otherwise a quick restore keeps the lobby. */
export const contextLossDelay = (haveClosedBitmaps: boolean) => haveClosedBitmaps ? 0 : CONTEXT_GRACE_MS;
