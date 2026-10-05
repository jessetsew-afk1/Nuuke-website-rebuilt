// Minimal accessible tabs: click / arrow keys / Home / End. Panels toggle `hidden`.
export function initTabs(root: HTMLElement, onChange?: (i: number, prev: number) => void) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') || ''));
  let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const select = (i: number, focus = false) => {
    const prev = cur;
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      const on = k === cur;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (panels[k]) panels[k]!.hidden = !on;
    });
    if (focus) tabs[cur].focus();
    onChange?.(cur, prev);
  };
  tabs.forEach((t, i) => {
    t.tabIndex = i === cur ? 0 : -1;
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') select(cur + 1, true);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') select(cur - 1, true);
      else if (k === 'Home') select(0, true);
      else if (k === 'End') select(tabs.length - 1, true);
      else return;
      e.preventDefault();
    });
  });
  return { select, get index() { return cur; } };
}
