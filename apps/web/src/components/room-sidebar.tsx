import { generateAvatarUrl, resolveVideoTitle, type RoomSnapshot, type RoomUser } from "@syncweb/shared";
import { Crown } from "lucide-react";
import { CopyCode } from "@/components/ui/copy-code-button";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import PeopleList from "@/components/ui/messaging-people-list";

interface RoomSidebarProps {
  snapshot: RoomSnapshot | null;
  roomName: string;
  users: RoomUser[];
  currentUsername: string;
}

type PresenceStatus = "online" | "dnd" | "offline";

function formatRelativeTime(timestamp: number) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return "Joined just now";
  }
  if (diffMinutes === 1) {
    return "Joined 1 minute ago";
  }
  if (diffMinutes < 60) {
    return `Joined ${diffMinutes} minutes ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) {
    return "Joined 1 hour ago";
  }
  return `Joined ${diffHours} hours ago`;
}

function getUserStatus(user: RoomUser, currentUsername: string): PresenceStatus {
  if (user.username === currentUsername || user.isHost) {
    return "online";
  }
  if (user.lastDriftReportAt && Date.now() - user.lastDriftReportAt < 5 * 60 * 1000) {
    return "dnd";
  }
  return "offline";
}

export function RoomSidebar({ snapshot, roomName, users, currentUsername }: RoomSidebarProps) {
  const roomLink =
    typeof window === "undefined" || !snapshot?.roomId ? "" : `${window.location.origin}/room/${snapshot.roomId}`;
  const roomPath = snapshot?.roomId ? `/${snapshot.roomId}` : "Loading...";
  const currentTitle = snapshot?.currentItem ? resolveVideoTitle(snapshot.currentItem.title, snapshot.currentItem.url) : null;
  const roomGroups = [
    {
      id: "room-link",
      name: roomName,
      avatar: snapshot ? generateAvatarUrl(`room:${snapshot.roomId}`) : undefined,
      lastMessage: snapshot?.roomId ? roomPath : "Waiting for room link...",
      unread: users.length
    },
    {
      id: "now-playing",
      name: "Now Playing",
      avatar: snapshot ? generateAvatarUrl(`now-playing:${snapshot.roomId}`) : undefined,
      lastMessage: currentTitle ?? "Nothing queued yet.",
      unread: 0
    }
  ];
  const roomPeople = users.map((user) => ({
    id: user.id,
    name: user.username,
    avatar: user.avatarUrl,
    icon: user.isHost ? <Crown aria-hidden="true" className="size-4" /> : undefined,
    lastMessage: user.isHost ? "Hosting this room" : formatRelativeTime(user.joinedAt),
    unread: 0,
    status: getUserStatus(user, currentUsername)
  }));

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
      <section className="panel room-panel glow-card-content">
        <div className="panel-header">
          <h2>Join</h2>
        </div>
        <CopyCode className="min-h-20" code={roomPath} copyValue={roomLink} />
        <PeopleList
          title="Room Activity"
          groupLabel="Room"
          peopleLabel="Participants"
          emptyGroupsMessage="Room details unavailable."
          emptyPeopleMessage="No participants connected."
          groups={roomGroups}
          people={roomPeople}
        />
      </section>
    </div>
  );
}
