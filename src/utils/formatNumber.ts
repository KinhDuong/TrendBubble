/**
 * Formats numbers into compact notation (1k, 2.5M, 1.2B)
 * Starting at 1,000 and above
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) {
    return value.toLocaleString();
  }

  const suffixes = [
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'k' }
  ];

  for (const { value: threshold, suffix } of suffixes) {
    if (value >= threshold) {
      const formatted = value / threshold;

      // Show 1 decimal place if it adds meaningful information
      if (formatted % 1 !== 0 && formatted < 10) {
        return formatted.toFixed(1) + suffix;
      }

      return Math.floor(formatted) + suffix;
    }
  }

  return value.toLocaleString();
}
