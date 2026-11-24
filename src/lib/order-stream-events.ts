/** Extract complete SSE frames while retaining split chunks until the next read. */
export const readOrderStreamEvents = (buffer: string): { events: string[]; remainder: string } => {
  const frames = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const remainder = frames.pop() || '';
  const events = frames.map(frame => frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim())
    .filter((event): event is string => event === 'ready' || event === 'status' || event === 'ping');
  return { events, remainder };
};