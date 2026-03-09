import type { EmbedDescriptor, VideoSource } from "@syncweb/shared";

const DIRECT_EXTENSIONS = [".mp4", ".webm", ".ogg", ".m3u8"];

function withSearch(url: URL, key: string, value: string) {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function detectYoutube(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1) || null;
  }

  if (url.hostname.includes("youtube.com")) {
    if (url.pathname.startsWith("/watch")) {
      return url.searchParams.get("v");
    }
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] ?? null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] ?? null;
    }
  }

  return null;
}

function detectVimeo(url: URL): string | null {
  if (!url.hostname.includes("vimeo.com")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  return parts.find((part) => /^\d+$/.test(part)) ?? null;
}

function detectDailymotion(url: URL): string | null {
  if (!url.hostname.includes("dailymotion.com") && !url.hostname.includes("dai.ly")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  return parts.pop() ?? null;
}

function detectTwitch(url: URL): string | null {
  if (!url.hostname.includes("twitch.tv")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "videos" && parts[1]) {
    return `video=${parts[1]}`;
  }
  if (parts[0]) {
    return `channel=${parts[0]}`;
  }
  return null;
}

function isDirectVideo(url: URL) {
  return DIRECT_EXTENSIONS.some((extension) => url.pathname.toLowerCase().endsWith(extension));
}

export function toEmbedDescriptor(rawUrl: string): EmbedDescriptor {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  let source: VideoSource = "generic";
  let embedUrl = url.toString();
  let requiresParent = false;

  const youtubeId = detectYoutube(url);
  if (youtubeId) {
    source = "youtube";
    embedUrl = new URL(`https://www.youtube.com/embed/${youtubeId}`).toString();
  } else {
    const vimeoId = detectVimeo(url);
    if (vimeoId) {
      source = "vimeo";
      embedUrl = new URL(`https://player.vimeo.com/video/${vimeoId}`).toString();
    } else {
      const dailymotionId = detectDailymotion(url);
      if (dailymotionId) {
        source = "dailymotion";
        embedUrl = new URL(`https://www.dailymotion.com/embed/video/${dailymotionId}`).toString();
      } else {
        const twitchTarget = detectTwitch(url);
        if (twitchTarget) {
          source = "twitch";
          const twitchUrl = new URL("https://player.twitch.tv/");
          twitchUrl.search = twitchTarget;
          withSearch(twitchUrl, "parent", "localhost");
          requiresParent = true;
          embedUrl = twitchUrl.toString();
        } else if (isDirectVideo(url)) {
          source = "direct";
          embedUrl = url.toString();
        } else if (hostname) {
          source = "generic";
          embedUrl = url.toString();
        }
      }
    }
  }

  return {
    source,
    embedUrl,
    originalUrl: url.toString(),
    requiresParent
  };
}
