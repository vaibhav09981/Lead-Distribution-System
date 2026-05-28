import { addClient, removeClient } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      addClient(controller);

      // Send initial heartbeat
      const hb = new TextEncoder().encode(': heartbeat\n\n');
      ctrl.enqueue(hb);
    },
    cancel() {
      removeClient(controller);
    },
  });

  // Keep-alive every 20s
  const interval = setInterval(() => {
    try {
      const hb = new TextEncoder().encode(': heartbeat\n\n');
      controller.enqueue(hb);
    } catch {
      clearInterval(interval);
    }
  }, 20_000);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
