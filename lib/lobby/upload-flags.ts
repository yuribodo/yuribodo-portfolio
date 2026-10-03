// Switches for the texture/compile pipeline. Flip one to false to compare the previous behaviour live.

/** Loose images (TextureLoader/useTexture) are decoded off-thread to ImageBitmaps instead of uploaded from HTMLImageElements. */
export const BITMAP_TEXTURES = true;
/** Desk (priority 0) uploads run in 30 ms macrotask chunks instead of 6 ms per animation frame. */
export const FAST_PRIORITY0_UPLOADS = true;
/** The desk's shaders start compiling while its textures upload, not after. */
export const COMPILE_WITH_UPLOAD = true;
