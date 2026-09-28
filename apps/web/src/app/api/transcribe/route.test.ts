import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: 'test-user' } } }) } }) }));
import { POST } from './route';
function request() {
  const body = new FormData();
  body.append('audio', new File(['audio'], 'count.webm', { type: 'audio/webm' }));
  return new Request('https://example.test/api/transcribe', { method: 'POST', body });
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });
it('returns the transcript and records timings without recording the transcript', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'test');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ text: 'Absolut 2' })));
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const response = await POST(request());
  expect(await response.json()).toEqual({ text: 'Absolut 2' });
  expect(log).toHaveBeenCalledWith('[transcribe] completed', expect.objectContaining({ status: 200, audioBytes: 5 }));
  expect(JSON.stringify(log.mock.calls)).not.toContain('Absolut');
});
it('times out a stalled response body, not just a stalled connection', async () => {
  vi.useFakeTimers();
  vi.stubEnv('OPENAI_API_KEY', 'test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let started!: () => void;
  const bodyStarted = new Promise<void>(resolve => { started = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => ({
    json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      started();
    }),
  })));
  const pending = POST(request());
  await bodyStarted;
  await vi.advanceTimersByTimeAsync(40_000);
  const response = await pending;
  expect(response.status).toBe(504);
});
