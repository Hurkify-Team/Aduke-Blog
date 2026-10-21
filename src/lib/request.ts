// Enforce actual streamed bytes, including requests without Content-Length.
export async function limitedBytes(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks));
}
export async function limitedJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  const input: unknown = JSON.parse(new TextDecoder().decode(await limitedBytes(request, limit)));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a JSON object.');
  return input as Record<string, unknown>;
}
