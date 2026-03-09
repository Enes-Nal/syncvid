import { useEffect, useRef, useState } from "react";
import type { EmbedDescriptor } from "@syncweb/shared";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { DirectVideoAdapter } from "../players/direct-video-adapter";
import { PassiveIframeAdapter } from "../players/passive-iframe-adapter";
import { createTwitchAdapter } from "../players/twitch-adapter";
import type { UnifiedPlayerAdapter } from "../players/types";
import { createVimeoAdapter } from "../players/vimeo-adapter";
import { createYouTubeAdapter } from "../players/youtube-adapter";

interface PlayerContainerProps {
  embed: EmbedDescriptor | null;
  onAdapterReady: (adapter: UnifiedPlayerAdapter | null) => void;
}

export function PlayerContainer({ embed, onAdapterReady }: PlayerContainerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const providerMountRef = useRef<HTMLDivElement | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const embedSource = embed?.source ?? null;
  const embedUrl = embed?.embedUrl ?? null;

  useEffect(() => {
    let disposed = false;
    let currentAdapter: UnifiedPlayerAdapter | null = null;

    if (!embedSource || !embedUrl) {
      setPlayerError(null);
      onAdapterReady(null);
      return;
    }

    const setup = async () => {
      try {
        setPlayerError(null);

        if (embedSource === "direct" && videoRef.current) {
          currentAdapter = new DirectVideoAdapter(videoRef.current);
        } else if (embedSource === "youtube" && providerMountRef.current) {
          providerMountRef.current.innerHTML = "";
          currentAdapter = await createYouTubeAdapter(providerMountRef.current, embedUrl);
        } else if (embedSource === "vimeo" && iframeRef.current) {
          currentAdapter = createVimeoAdapter(iframeRef.current);
        } else if (embedSource === "twitch" && providerMountRef.current) {
          providerMountRef.current.innerHTML = "";
          currentAdapter = await createTwitchAdapter(providerMountRef.current, embedUrl);
        } else {
          currentAdapter = new PassiveIframeAdapter();
        }
      } catch (error) {
        if (!disposed) {
          console.error("Failed to initialize player adapter", error);
          setPlayerError("This video could not be loaded.");
          onAdapterReady(null);
        }
        return;
      }

      if (!disposed) {
        onAdapterReady(currentAdapter);
      }
    };

    void setup();

    return () => {
      disposed = true;
      currentAdapter?.destroy?.();
      onAdapterReady(null);
    };
  }, [embedSource, embedUrl, onAdapterReady]);

  if (!embed) {
    return (
      <div className="glow-card-shell">
        <GlowingEffect
          spread={36}
          glow
          disabled={false}
          proximity={72}
          inactiveZone={0.2}
          borderWidth={2}
        />
        <div className="player-placeholder glow-card-content">Add a video URL to start the room.</div>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="glow-card-shell">
        <GlowingEffect
          spread={36}
          glow
          disabled={false}
          proximity={72}
          inactiveZone={0.2}
          borderWidth={2}
        />
        <div className="player-placeholder glow-card-content">{playerError}</div>
      </div>
    );
  }

  if (embed.source === "direct") {
    return (
      <div className="glow-card-shell">
        <GlowingEffect
          spread={36}
          glow
          disabled={false}
          proximity={72}
          inactiveZone={0.2}
          borderWidth={2}
        />
        <div className="player-shell glow-card-content">
          <video ref={videoRef} className="player-frame" controls src={embed.embedUrl} />
        </div>
      </div>
    );
  }

  if (embed.source === "youtube" || embed.source === "twitch") {
    return (
      <div className="glow-card-shell">
        <GlowingEffect
          spread={36}
          glow
          disabled={false}
          proximity={72}
          inactiveZone={0.2}
          borderWidth={2}
        />
        <div className="player-shell glow-card-content">
          <div ref={providerMountRef} className="player-frame" />
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card-shell">
      <GlowingEffect
        spread={36}
        glow
        disabled={false}
        proximity={72}
        inactiveZone={0.2}
        borderWidth={2}
      />
      <div className="player-shell glow-card-content">
        <iframe
          ref={iframeRef}
          className="player-frame"
          src={embed.embedUrl}
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allowFullScreen
        />
      </div>
    </div>
  );
}
