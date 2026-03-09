import type { EmbedDescriptor } from "@syncweb/shared";

interface OEmbedResponse {
  title?: string;
}

function getOEmbedUrl(embed: EmbedDescriptor) {
  switch (embed.source) {
    case "youtube":
      return `https://www.youtube.com/oembed?url=${encodeURIComponent(embed.originalUrl)}&format=json`;
    case "vimeo":
      return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.originalUrl)}`;
    case "dailymotion":
      return `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(embed.originalUrl)}`;
    default:
      return null;
  }
}

export async function enrichEmbedDescriptor(embed: EmbedDescriptor): Promise<EmbedDescriptor> {
  const oEmbedUrl = getOEmbedUrl(embed);
  if (!oEmbedUrl) {
    return embed;
  }

  try {
    const response = await fetch(oEmbedUrl, {
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return embed;
    }

    const payload = (await response.json()) as OEmbedResponse;
    const title = payload.title?.trim();

    if (!title) {
      return embed;
    }

    return {
      ...embed,
      title
    };
  } catch {
    return embed;
  }
}
