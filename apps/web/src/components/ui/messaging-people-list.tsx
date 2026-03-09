"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "online" | "dnd" | "offline";

interface GroupEntry {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  unread?: number;
}

interface PersonEntry {
  id: string;
  name: string;
  avatar?: string;
  icon?: React.ReactNode;
  lastMessage: string;
  unread?: number;
  status: StatusType;
}

const DEMO_GROUPS: GroupEntry[] = [
  {
    id: "g1",
    name: "HextaUI Team",
    avatar: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Release v2.0 is live!",
    unread: 2
  },
  {
    id: "g2",
    name: "Designers",
    avatar: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Check the new Figma file.",
    unread: 0
  }
];

const DEMO_PEOPLE: PersonEntry[] = [
  {
    id: "u1",
    name: "Alice",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=alice",
    lastMessage: "Let me know if you need help.",
    unread: 1,
    status: "online"
  },
  {
    id: "u2",
    name: "Bob",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=bob",
    lastMessage: "Thanks for the info!",
    unread: 0,
    status: "dnd"
  },
  {
    id: "u3",
    name: "Charlie",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=charlie",
    lastMessage: "See you at 5pm.",
    unread: 3,
    status: "offline"
  }
];

const STATUS_COLORS: Record<StatusType, string> = {
  online: "bg-emerald-400",
  dnd: "bg-amber-400",
  offline: "bg-zinc-500"
};

function StatusDot({ status }: { status: StatusType }) {
  return (
    <span
      aria-label={status}
      className={cn("inline-block size-3 rounded-full border-2 border-[#121212]", STATUS_COLORS[status])}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function handleKeyActivate(
  event: React.KeyboardEvent<HTMLDivElement>,
  callback: (() => void) | undefined
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback?.();
  }
}

interface PeopleListProps {
  className?: string;
  groups?: GroupEntry[];
  people?: PersonEntry[];
  title?: string;
  groupLabel?: string;
  peopleLabel?: string;
  emptyGroupsMessage?: string;
  emptyPeopleMessage?: string;
  onGroupClick?: (group: GroupEntry) => void;
  onPersonClick?: (person: PersonEntry) => void;
}

export default function PeopleList({
  className,
  groups = DEMO_GROUPS,
  people = DEMO_PEOPLE,
  title = "Chats",
  groupLabel = "Groups",
  peopleLabel = "Direct Messages",
  emptyGroupsMessage = "No groups found.",
  emptyPeopleMessage = "No people found.",
  onGroupClick,
  onPersonClick
}: PeopleListProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "flex w-full flex-col gap-5 overflow-hidden rounded-card border border-white/10 bg-[#080808] py-5 text-foreground shadow-[0_22px_70px_rgba(0,0,0,0.38)]",
        className
      )}
      role="complementary"
    >
      <header className="border-b border-white/10 px-5 pb-4">
        <h2 className="select-none text-lg font-semibold text-zinc-100">{title}</h2>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <section aria-labelledby="group-chats-label" className="flex flex-col gap-2">
          <h3 className="px-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500" id="group-chats-label">
            {groupLabel}
          </h3>
          <ul className="flex flex-col gap-2 px-4">
            {groups.length === 0 ? (
              <li className="px-2 py-2 text-sm text-zinc-500">{emptyGroupsMessage}</li>
            ) : (
              groups.map((group) => (
                <li key={group.id}>
                  <div
                    aria-label={`Open group chat: ${group.name}`}
                    className="flex w-full items-center gap-4 rounded-[18px] border border-white/8 bg-[#141414] px-4 py-3 text-left transition-colors hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/20"
                    onClick={() => onGroupClick?.(group)}
                    onKeyDown={(event) => handleKeyActivate(event, () => onGroupClick?.(group))}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar className="size-10 flex-shrink-0 rounded-2xl">
                      <AvatarImage alt={group.name} src={group.avatar} />
                      <AvatarFallback className="rounded-2xl bg-zinc-800 text-zinc-100">
                        {getInitials(group.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium text-zinc-100">{group.name}</span>
                      <span className="truncate text-xs text-zinc-400">{group.lastMessage}</span>
                    </div>
                    {group.unread ? (
                      <Badge
                        aria-label={`${group.unread} unread messages`}
                        className="ml-auto border-0 bg-zinc-900 px-2.5 text-zinc-100"
                        variant="secondary"
                      >
                        {group.unread}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="direct-messages-label" className="flex flex-col gap-2">
          <h3
            className="px-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500"
            id="direct-messages-label"
          >
            {peopleLabel}
          </h3>
          <ul className="flex flex-col gap-2 px-4">
            {people.length === 0 ? (
              <li className="px-2 py-2 text-sm text-zinc-500">{emptyPeopleMessage}</li>
            ) : (
              people.map((person) => (
                <li key={person.id}>
                  <div
                    aria-label={`Open direct message with ${person.name}`}
                    className="flex w-full items-center gap-4 rounded-[18px] border border-white/8 bg-[#121212] px-4 py-3 text-left transition-colors hover:bg-[#181818] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/20"
                    onClick={() => onPersonClick?.(person)}
                    onKeyDown={(event) => handleKeyActivate(event, () => onPersonClick?.(person))}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative flex flex-shrink-0 items-end">
                      <Avatar className="size-10">
                        <AvatarImage alt={person.name} src={person.avatar} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-100">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute right-0 bottom-0 flex items-center">
                        <StatusDot status={person.status} />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-zinc-100">
                        <span className="truncate">{person.name}</span>
                        {person.icon ? <span className="shrink-0 text-amber-300">{person.icon}</span> : null}
                      </span>
                      <span className="truncate text-xs text-zinc-400">{person.lastMessage}</span>
                    </div>
                    {person.unread ? (
                      <Badge
                        aria-label={`${person.unread} unread messages`}
                        className="ml-auto border-0 bg-zinc-900 px-2.5 text-zinc-100"
                        variant="secondary"
                      >
                        {person.unread}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </aside>
  );
}
