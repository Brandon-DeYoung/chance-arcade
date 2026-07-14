export function selectPositionBoard<T>(finished: T[], active: T[]): T[] {
  if (!finished.length) return active.slice(0, 6);

  if (finished.length < 3) {
    const podiumOpenings = 3 - finished.length;
    return [
      ...finished,
      ...active.slice(0, podiumOpenings),
      ...active.slice(podiumOpenings, podiumOpenings + 3),
    ];
  }

  const approaching = active.slice(0, 3);
  const slowestNeeded = 3 - approaching.length;
  const slowestFinished = slowestNeeded
    ? finished.slice(Math.max(3, finished.length - slowestNeeded))
    : [];

  return [...finished.slice(0, 3), ...slowestFinished, ...approaching];
}
