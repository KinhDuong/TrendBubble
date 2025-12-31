/**
 * Formats large numbers into compact notation (e.g., 100k, 2M, 20M)
 * Numbers below 10,000 are displayed as-is
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    const formatted = value / 1_000_000_000;
    return `${formatted >= 10 ? formatted.toFixed(0) : formatted.toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    const formatted = value / 1_000_000;
    return `${formatted >= 10 ? formatted.toFixed(0) : formatted.toFixed(1)}M`;
  }

  if (value >= 10_000) {
    const formatted = value / 1_000;
    return `${formatted >= 10 ? formatted.toFixed(0) : formatted.toFixed(1)}k`;
  }

  return value.toLocaleString();
}
