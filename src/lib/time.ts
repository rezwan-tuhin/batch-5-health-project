export function hoursFromNowIso(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function hoursFromNowUnix(hours: number): number {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}