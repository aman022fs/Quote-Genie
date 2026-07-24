import { ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface QuestionScreenProps {
  step?: number;
  total?: number;
  onBack?: () => void;
  onClose?: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  toneClass?: string; // background tint for the header area
}

export function QuestionScreen({
  step,
  total,
  onBack,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
  primary,
  secondary,
  toneClass = "bg-hero-warm",
}: QuestionScreenProps) {
  const progress = step && total ? Math.max(0, Math.min(1, step / total)) : 0;

  return (
    <div className={cn("flex min-h-dvh flex-col bg-background")}>
      <div className={cn("relative pt-safe", toneClass)}>
        <div className="flex items-center justify-between px-5 pt-4">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="grid size-10 place-items-center rounded-full bg-card/70 text-foreground/80 backdrop-blur transition-transform active:scale-95"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <span className="size-10" />
          )}
          {step && total ? (
            <div className="text-[11px] font-medium tracking-wider text-muted-foreground">
              {step} of {total}
            </div>
          ) : (
            <span />
          )}
          {onClose ? (
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid size-10 place-items-center rounded-full bg-card/70 text-foreground/80 backdrop-blur transition-transform active:scale-95"
            >
              <X className="size-5" />
            </button>
          ) : (
            <span className="size-10" />
          )}
        </div>
        {step && total ? (
          <div className="mx-5 mt-3 h-1 overflow-hidden rounded-full bg-foreground/5">
            <div
              className="h-full rounded-full bg-foreground/60 transition-all duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        ) : null}
        <div className="px-6 pb-6 pt-8">
          {eyebrow && (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
              {eyebrow}
            </div>
          )}
          <h1 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-32">{children}</div>

      {(primary || secondary) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-safe">
          <div className="pointer-events-auto mx-auto flex max-w-[520px] flex-col gap-2 bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-5 pt-8">
            {primary}
            {secondary}
          </div>
        </div>
      )}
    </div>
  );
}
