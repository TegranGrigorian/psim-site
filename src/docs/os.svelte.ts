export type OS = 'linux' | 'mac' | 'windows';

function detect(): OS {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  return /Windows/i.test(ua) ? 'windows' : /Mac OS X|Macintosh/i.test(ua) ? 'mac' : 'linux';
}
function saved(): OS | null {
  try { const v = localStorage.getItem('psim-docs-os'); return v === 'linux' || v === 'mac' || v === 'windows' ? v : null; } catch { return null; }
}

/** One OS choice shared by every tab group on the page. */
export const os = $state({ value: saved() ?? detect() });

export function setOS(v: OS) {
  os.value = v;
  try { localStorage.setItem('psim-docs-os', v); } catch { /* private mode */ }
}
