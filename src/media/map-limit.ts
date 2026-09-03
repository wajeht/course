export async function mapLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const pending = worker(item).finally(() => executing.delete(pending));
    executing.add(pending);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}
