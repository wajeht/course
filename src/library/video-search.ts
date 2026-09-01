export type VideoSearchField = "title" | "author" | "playlist" | "tag" | "description";

export interface VideoSearchDocument {
  title: string;
  description: string;
  authors: string[];
  playlistTitle: string | null;
  playlistDescription?: string | null;
  tags: string[];
}

export interface TextRange {
  start: number;
  end: number;
}

export interface VideoSearchMatch {
  field: VideoSearchField;
  value: string;
  ranges: TextRange[];
}

export interface VideoSearchScore {
  score: number;
  matches: VideoSearchMatch[];
}

interface SearchValue {
  field: VideoSearchField;
  value: string;
  weight: number;
}

interface NormalizedText {
  value: string;
  starts: number[];
  ends: number[];
}

interface Word {
  value: string;
  range: TextRange;
}

const fieldWeights = {
  title: 0,
  author: 120,
  playlist: 160,
  tag: 200,
  description: 280,
} satisfies Record<VideoSearchField, number>;

function normalizeText(text: string): NormalizedText {
  let value = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;

  for (const character of text) {
    const end = offset + character.length;
    const normalized = character.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
    for (const normalizedCharacter of normalized) {
      value += normalizedCharacter;
      starts.push(offset);
      ends.push(end);
    }
    offset = end;
  }

  return { value, starts, ends };
}

function originalRange(text: NormalizedText, start: number, end: number): TextRange {
  return {
    start: text.starts[start] ?? 0,
    end: text.ends[end - 1] ?? text.ends.at(-1) ?? 0,
  };
}

function words(text: string): Word[] {
  const normalized = normalizeText(text);
  return [...normalized.value.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({
    value: match[0],
    range: originalRange(normalized, match.index, match.index + match[0].length),
  }));
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );
  for (let index = 0; index <= left.length; index += 1) rows[index]![0] = index;
  for (let index = 0; index <= right.length; index += 1) rows[0]![index] = index;

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      rows[leftIndex]![rightIndex] = Math.min(
        rows[leftIndex - 1]![rightIndex]! + 1,
        rows[leftIndex]![rightIndex - 1]! + 1,
        rows[leftIndex - 1]![rightIndex - 1]! + substitution,
      );
      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        rows[leftIndex]![rightIndex] = Math.min(
          rows[leftIndex]![rightIndex]!,
          rows[leftIndex - 2]![rightIndex - 2]! + 1,
        );
      }
    }
  }
  return rows[left.length]![right.length]!;
}

function allowedDistance(queryWord: string): number {
  if (queryWord.length < 4) return 0;
  if (queryWord.length < 8) return 1;
  return 2;
}

function values(document: VideoSearchDocument): SearchValue[] {
  const searchValues: SearchValue[] = [
    { field: "title", value: document.title, weight: fieldWeights.title },
    ...document.authors.map((value) => ({
      field: "author" as const,
      value,
      weight: fieldWeights.author,
    })),
    ...(document.playlistTitle
      ? [
          {
            field: "playlist" as const,
            value: document.playlistTitle,
            weight: fieldWeights.playlist,
          },
        ]
      : []),
    ...document.tags.map((value) => ({ field: "tag" as const, value, weight: fieldWeights.tag })),
    { field: "description", value: document.description, weight: fieldWeights.description },
    ...(document.playlistDescription
      ? [
          {
            field: "description" as const,
            value: document.playlistDescription,
            weight: fieldWeights.description,
          },
        ]
      : []),
  ];
  return searchValues.filter((entry) => entry.value.trim());
}

function directMatch(value: SearchValue, query: string): VideoSearchScore | null {
  const normalized = normalizeText(value.value);
  const index = normalized.value.indexOf(query);
  if (index < 0) return null;
  let placement = 16 + index / 100;
  if (normalized.value === query) placement = 0;
  else if (index === 0) placement = 8;
  return {
    score: value.weight + placement,
    matches: [
      {
        field: value.field,
        value: value.value,
        ranges: [originalRange(normalized, index, index + query.length)],
      },
    ],
  };
}

function wordMatchScore(queryWord: string, candidate: string): number | null {
  if (candidate === queryWord) return 0;
  if (candidate.startsWith(queryWord)) return 5;
  const distance = editDistance(queryWord, candidate);
  return distance <= allowedDistance(queryWord) ? 14 + distance * 12 : null;
}

function bestWordMatch(
  searchValues: SearchValue[],
  queryWord: string,
): { searchValue: SearchValue; word: Word; score: number } | null {
  let best: { searchValue: SearchValue; word: Word; score: number } | null = null;
  for (const searchValue of searchValues) {
    for (const candidate of words(searchValue.value)) {
      const wordScore = wordMatchScore(queryWord, candidate.value);
      if (wordScore === null) continue;
      const score = searchValue.weight + wordScore;
      if (!best || score < best.score) best = { searchValue, word: candidate, score };
    }
  }
  return best;
}

function addMatch(
  matches: VideoSearchMatch[],
  best: NonNullable<ReturnType<typeof bestWordMatch>>,
): void {
  const existing = matches.find(
    (match) => match.field === best.searchValue.field && match.value === best.searchValue.value,
  );
  if (existing) existing.ranges.push(best.word.range);
  else {
    matches.push({
      field: best.searchValue.field,
      value: best.searchValue.value,
      ranges: [best.word.range],
    });
  }
}

function tokenMatch(searchValues: SearchValue[], queryWords: string[]): VideoSearchScore | null {
  const matches: VideoSearchMatch[] = [];
  let score = 40;

  for (const queryWord of queryWords) {
    const best = bestWordMatch(searchValues, queryWord);
    if (!best) return null;
    score += best.score;
    addMatch(matches, best);
  }

  return { score: score / queryWords.length, matches };
}

export function matchVideoSearch(
  document: VideoSearchDocument,
  rawQuery: string,
): VideoSearchScore | null {
  const query = normalizeText(rawQuery.trim()).value;
  if (!query) return null;
  const searchValues = values(document);
  const direct = searchValues
    .map((value) => directMatch(value, query))
    .filter((match): match is VideoSearchScore => match !== null)
    .sort((left, right) => left.score - right.score)[0];
  if (direct) return direct;

  const queryWords = words(rawQuery).map((word) => word.value);
  return queryWords.length ? tokenMatch(searchValues, queryWords) : null;
}

export function mergeTextRanges(ranges: TextRange[]): TextRange[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  const merged: TextRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}
