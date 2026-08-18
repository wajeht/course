export interface ByteRange {
  start: number;
  end: number;
}

export function parseByteRange(header: string | undefined, size: number): ByteRange | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) throw new RangeError("Only one byte range is supported");
  const [, startValue, endValue] = match;
  if (!startValue && !endValue) throw new RangeError("Invalid byte range");

  let start: number;
  let end: number;
  if (!startValue) {
    const suffix = Number(endValue);
    if (!Number.isInteger(suffix) || suffix <= 0) throw new RangeError("Invalid byte range");
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startValue);
    end = endValue ? Number(endValue) : size - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    throw new RangeError("Byte range is outside the file");
  }
  return { start, end: Math.min(end, size - 1) };
}
