const MAX_BODY_BYTES = 1_000_000;

export async function readBodyLimited(response: Response, maxBytes = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("response body too large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("response body too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
