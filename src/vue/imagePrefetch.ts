import type { LibraryDto, VideoPlayerDetailDto } from "@/api.js";

export type LibraryImageTarget = "author" | "home" | "playlists" | "videos";

type CompleteImageLoad = (loaded: boolean) => void;
type LoadImage = (url: string, complete: CompleteImageLoad) => void;
type PrefetchImageUrls = (urls: ReadonlyArray<string | null>) => void;

const activeBrowserImages = new Map<string, HTMLImageElement>();

function loadBrowserImage(url: string, complete: CompleteImageLoad): void {
  const image = new Image();
  activeBrowserImages.set(url, image);

  function finish(loaded: boolean): void {
    if (activeBrowserImages.get(url) !== image) return;
    image.onload = null;
    image.onerror = null;
    activeBrowserImages.delete(url);
    complete(loaded);
  }

  image.onload = () => finish(true);
  image.onerror = () => finish(false);
  image.src = url;
}

export function createImagePrefetcher(loadImage: LoadImage, concurrency = 4) {
  const loaded = new Set<string>();
  const pending = new Set<string>();
  let queued: string[] = [];

  function pump(): void {
    while (pending.size < concurrency) {
      const url = queued.shift();
      if (!url) return;
      if (loaded.has(url) || pending.has(url)) continue;

      pending.add(url);
      loadImage(url, (succeeded) => {
        pending.delete(url);
        if (succeeded) loaded.add(url);
        pump();
      });
    }
  }

  return (urls: ReadonlyArray<string | null>): void => {
    queued = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    pump();
  };
}

export const prefetchImages = createImagePrefetcher(loadBrowserImage);

let latestImagePrefetchIntent = 0;

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
