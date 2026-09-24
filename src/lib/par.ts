export function parseParSeconds(v: string | null | undefined): number | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  const mmss = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/);
  if (min) return Number(min[1]) * 60;
  const sec = s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)?\b/);
  if (sec) {
    const n = Number(sec[1]);
    return n > 0 ? n : null;
  }
  return null;
}
