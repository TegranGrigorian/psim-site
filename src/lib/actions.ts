/** Adds `.in` once the node scrolls into view. Respects reduced motion by showing immediately. */
export function reveal(node: HTMLElement, opts: { delay?: number } = {}) {
  if (opts.delay) node.style.setProperty('--d', `${opts.delay}ms`);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    node.classList.add('in');
    return {};
  }
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) if (e.isIntersecting) { node.classList.add('in'); io.disconnect(); }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}

/** Counts a number up when visible. Sets textContent directly. */
export function countUp(node: HTMLElement, p: { to: number; digits?: number; suffix?: string; prefix?: string }) {
  const d = p.digits ?? 0;
  const write = (v: number) => (node.textContent = `${p.prefix ?? ''}${v.toFixed(d)}${p.suffix ?? ''}`);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { write(p.to); return {}; }
  write(0);
  let raf = 0;
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      write(p.to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  io.observe(node);
  return { destroy: () => { io.disconnect(); cancelAnimationFrame(raf); } };
}
