<script lang="ts">
  let { code, lang = 'bash', title = '' }: { code: string; lang?: string; title?: string } = $props();
  let copied = $state(false);

  async function copy() {
    const text = code.trim();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers / insecure origins (e.g. LAN IP over http)
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    copied = true;
    setTimeout(() => (copied = false), 1600);
  }
</script>

<div class="code">
  <div class="bar">
    <span>{title || lang}</span>
    <button onclick={copy} aria-label="Copy to clipboard">{copied ? '✓ Copied' : 'Copy'}</button>
  </div>
  <pre><code>{code.trim()}</code></pre>
</div>

<style>
  .code { background: #0d1b2a; border-radius: 12px; margin: 12px 0 18px; overflow: hidden; border: 1px solid #1d3047; }
  .bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 6px 14px; background: #12243a; font-size: 12px; color: #8ea3bb; font-family: var(--sans); }
  button { border: 1px solid #2b4563; background: transparent; color: #d6e0ec; border-radius: 7px; padding: 4px 10px; font-size: 12px; transition: background 0.2s, color 0.2s; }
  button:hover { background: var(--maize); color: var(--blue); border-color: var(--maize); }
  pre { margin: 0; padding: 14px 16px; overflow-x: auto; color: #e6edf5; font-size: 13.5px; line-height: 1.6; }
  code { font-family: ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace; }
</style>
