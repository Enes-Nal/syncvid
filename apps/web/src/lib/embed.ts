import type { EmbedDescriptor, VideoSource } from "@syncweb/shared";

function parseUrl(rawUrl: string) {
  return new URL(rawUrl);
}

function getYoutubeId(url: URL) {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1) || null;
  }
  if (url.hostname.includes("youtube.com")) {
    return url.searchParams.get("v") || url.pathname.split("/")[2] || null;
  }
  return null;
}

function getVimeoId(url: URL) {
  if (!url.hostname.includes("vimeo.com")) {
    return null;
  }
  return url.pathname.split("/").find((part) => /^\d+$/.test(part)) ?? null;
}

function getDailymotionId(url: URL) {
  if (!url.hostname.includes("dailymotion.com") && !url.hostname.includes("dai.ly")) {
    return null;
  }
  return url.pathname.split("/").filter(Boolean).pop() ?? null;
}

function getTwitchTarget(url: URL) {
  if (!url.hostname.includes("twitch.tv")) {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "videos" && parts[1]) {
    return { key: "video", value: parts[1] };
  }
  if (parts[0]) {
    return { key: "channel", value: parts[0] };
  }
  return null;
}

export function buildEmbedDescriptor(rawUrl: string): EmbedDescriptor {
  const url = parseUrl(rawUrl);
  let source: VideoSource = "generic";
  let embedUrl = url.toString();
  let requiresParent = false;

  const youtubeId = getYoutubeId(url);
  if (youtubeId) {
    source = "youtube";
    const embed = new URL(`https://www.youtube.com/embed/${youtubeId}`);
    embed.searchParams.set("enablejsapi", "1");
    embedUrl = embed.toString();
  } else {
    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      source = "vimeo";
      embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    } else {
      const dailymotionId = getDailymotionId(url);
      if (dailymotionId) {
        source = "dailymotion";
        embedUrl = `https://www.dailymotion.com/embed/video/${dailymotionId}`;
      } else {
        const twitchTarget = getTwitchTarget(url);
        if (twitchTarget) {
          source = "twitch";
          const embed = new URL("https://player.twitch.tv/");
          embed.searchParams.set(twitchTarget.key, twitchTarget.value);
          embed.searchParams.set("parent", window.location.hostname || "localhost");
          embedUrl = embed.toString();
          requiresParent = true;
        } else if (/\.(mp4|webm|ogg|m3u8)$/i.test(url.pathname)) {
          source = "direct";
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
