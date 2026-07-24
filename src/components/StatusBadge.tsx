export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    finalised: "bg-mist text-foreground/80",
    sent: "bg-mist text-foreground/80",
    accepted: "bg-mint text-foreground/80",
    rejected: "bg-peach text-foreground/80",
    expired: "bg-secondary text-muted-foreground",
    archived: "bg-secondary text-muted-foreground",
    active: "bg-mint text-foreground/80",
    processing: "bg-butter text-foreground/80",
    needs_review: "bg-butter text-foreground/80",
    viewed: "bg-lavender text-foreground/80",
  };
  const cls = map[status] ?? "bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${cls}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" />
      {status.replace("_", " ")}
    </span>
  );
}
