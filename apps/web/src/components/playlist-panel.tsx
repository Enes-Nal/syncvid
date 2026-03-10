import { resolveVideoTitle, type PlaylistItem } from "@syncweb/shared";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { InputWithTags } from "@/components/ui/input-with-tags";

interface PlaylistPanelProps {
  items: PlaylistItem[];
  isHost: boolean;
  onAdd: (url: string) => void;
  onRemove: (playlistItemId: string) => void;
  onAdvance: () => void;
}

export function PlaylistPanel({ items, isHost, onAdd, onRemove, onAdvance }: PlaylistPanelProps) {
  return (
    <div className="glow-card-shell playlist-panel-shell">
      <GlowingEffect
        spread={36}
        glow
        disabled={false}
        proximity={72}
        inactiveZone={0.2}
        borderWidth={2}
      />
      <section className="panel glow-card-content playlist-panel-content">
        <div className="panel-header">
          <h2>Playlist</h2>
          {isHost ? (
            <InteractiveHoverButton
              aria-label="Advance to the next playlist item"
              className="h-10 w-28 rounded-[999px] border-border bg-background text-sm text-foreground"
              onClick={onAdvance}
              text="Next"
              type="button"
            />
          ) : null}
        </div>
        <InputWithTags
          className="playlist-form-container"
          placeholder="Paste a video URL and press Enter"
          limit={undefined}
          tags={items.map((item, index) => {
            const title = resolveVideoTitle(item.title, item.url);
            return {
              id: item.id,
              text: index === 0 ? `Now: ${title}` : title
            };
          })}
          canRemoveTag={() => isHost}
          onTagAdd={(url) => {
            onAdd(url);
          }}
          onTagRemove={(_index, _tag, id) => {
            if (id && isHost) {
              onRemove(id);
            }
          }}
        />
      </section>
    </div>
  );
}
