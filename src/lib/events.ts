// Simple global SSE registry for broadcasting events to connected dashboard clients.
// Works for single-server deployments (demo environment).

type Controller = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<Controller>();

export function addClient(controller: Controller) {
  clients.add(controller);
}

export function removeClient(controller: Controller) {
  clients.delete(controller);
}

export function broadcastEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      clients.delete(ctrl);
    }
  }
}
