import type { LibraryDto, VideoPlayerDetailDto } from "@/api.js";

export type LibraryImageTarget = "author" | "home" | "playlists" | "videos";

type CompleteImageLoad = () => void;
type LoadImage = (url: string, complete: CompleteImageLoad) => void;
type PrefetchImageUrls = (urls: ReadonlyArray<string | null>) => void;

const activeBrowserImages = new Map<string, HTMLImageElement>();

function loadBrowserImage(url: string, complete: CompleteImageLoad): void {
  const image = new Image();
  activeBrowserImages.set(url, image);

  function finish(): void {
    image.onload = null;
    image.onerror = null;
    if (activeBrowserImages.get(url) !== image) return;
    activeBrowserImages.delete(url);
    complete();
  }

  image.onload = finish;
  image.onerror = finish;
  image.src = url;
}

function resetBrowserImages(): void {
  for (const image of activeBrowserImages.values()) {
    image.onload = null;
    image.onerror = null;
  }
  activeBrowserImages.clear();
}

export function createImagePrefetcher(loadImage: LoadImage, concurrency = 4) {
  const pending = new Set<string>();
  let queued: string[] = [];
  let generation = 0;

  function pump(): void {
    while (pending.size < concurrency) {
      const url = queued.shift();
      if (!url) return;
      if (pending.has(url)) continue;

      pending.add(url);
      const requestGeneration = generation;
      loadImage(url, () => {
        if (requestGeneration !== generation) return;
        pending.delete(url);
        pump();
      });
    }
  }

  return {
    prefetch(urls: ReadonlyArray<string | null>): void {
      queued = [...new Set(urls.filter((url): url is string => Boolean(url)))];
      pump();
    },
    reset(): void {
      generation += 1;
      pending.clear();
      queued = [];
    },
  };
}

const browserImagePrefetcher = createImagePrefetcher(loadBrowserImage);
export const prefetchImages = browserImagePrefetcher.prefetch;

let latestImagePrefetchIntent = 0;

export function resetImagePrefetch(): void {
  latestImagePrefetchIntent += 1;
  resetBrowserImages();
  browserImagePrefetcher.reset();
}

export function prepareImagePrefetch(
  queueImages: PrefetchImageUrls = prefetchImages,
): PrefetchImageUrls {
  const intent = ++latestImagePrefetchIntent;
  queueImages([]);
  return (urls) => {
    if (intent === latestImagePrefetchIntent) queueImages(urls);
  };
}

export function libraryImageUrls(library: LibraryDto, target: LibraryImageTarget): string[] {
  if (target === "home") {
    return library.continueWatching.flatMap((video) => (video.coverUrl ? [video.coverUrl] : []));
  }
  if (target === "author") {
    return [
      ...library.playlists.map((playlist) => playlist.coverUrl),
      ...library.videos.map((video) => video.coverUrl),
    ].filter((url): url is string => Boolean(url));
  }
  if (target === "playlists") {
    return library.playlists.flatMap((playlist) => (playlist.coverUrl ? [playlist.coverUrl] : []));
  }
  return library.videos.flatMap((video) => (video.coverUrl ? [video.coverUrl] : []));
}

export function videoImageUrls(detail: VideoPlayerDetailDto): string[] {
  return [
    detail.video.coverUrl,
    ...detail.video.chapters.map((chapter) => chapter.thumbnailUrl),
  ].filter((url): url is string => Boolean(url));
}
