/** Stop background artwork while hidden, offscreen, or behind the desk.
 * Resume during booting so the first portfolio handoff frame is ready. */
export function observePageAnimation(element: Element, change: (active: boolean) => void) {
  let intersecting = true;
  let previous: boolean | undefined;
  const update = () => {
    const lobby = document.querySelector('[data-lobby-active]');
    const covered = lobby && lobby.getAttribute('data-lobby-state') !== 'booting';
    const active = !document.hidden && intersecting && !covered;
    if (active !== previous) { previous = active; change(active); }
  };
  const mutations = new MutationObserver(update);
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lobby-state'] });
  const intersection = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
  intersection.observe(element);
  document.addEventListener('visibilitychange', update);
  update();
  return () => {
    mutations.disconnect(); intersection.disconnect();
    document.removeEventListener('visibilitychange', update);
  };
}
