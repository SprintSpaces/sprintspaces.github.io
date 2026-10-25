// Recover the existing job capability from another open same-origin tab.
// Passwords, logins and instance URLs are never broadcast. The private job
// token remains in sessionStorage in each tab, never localStorage.
const KEY = 'sprintspaces-demo';
function record(value) {
  if (!value || typeof value.key !== 'string' || typeof value.job !== 'string' || !/^[a-f0-9]{32}$/.test(value.key) || !/^[a-f0-9]{64}$/.test(value.job)) return null;
  return { key: value.key, job: value.job, profile: 'plain', wasReady: value.wasReady === true };
}
export function connectDemoTabs({ storage, channel, nonce = () => crypto.randomUUID(), delay = setTimeout, cancel = clearTimeout }) {
  const read = () => { try { return record(JSON.parse(storage.getItem(KEY))); } catch { return null; } };
  const pending = new Map();
  channel?.addEventListener('message', event => {
    const m = event.data;
    if (!m || typeof m.nonce !== 'string' || m.nonce.length > 64) return;
    if (m.type === 'request') {
      const own = read();
      if (own) channel.postMessage({ type: 'response', nonce: m.nonce, record: own });
    } else if (m.type === 'response') {
      const complete = pending.get(m.nonce), received = record(m.record);
      if (complete && received) {
        try { if (!read()) storage.setItem(KEY, JSON.stringify(received)); complete(true); }
        catch { complete(false); }
      }
    }
  });
  return {
    recover() {
      if (!channel || read()) return Promise.resolve(false);
      return new Promise(resolve => {
        const id = nonce();
        let timer;
        const finish = ok => { cancel(timer); pending.delete(id); resolve(ok); };
        pending.set(id, finish);
        timer = delay(() => finish(false), 600);
        channel.postMessage({ type: 'request', nonce: id });
      });
    },
  };
}
