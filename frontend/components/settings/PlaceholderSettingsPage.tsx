import { Sparkles } from "lucide-react";

export interface PlaceholderSettingsPageProps {
  title: string;
  description: string;
}

/** Shared "not built yet" layout for settings sections outside this assignment's scope. */
export function PlaceholderSettingsPage({ title, description }: PlaceholderSettingsPageProps) {
  return (
    <div className="max-w-2xl p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-border p-10 text-center">
        <Sparkles className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          {title} isn&apos;t available yet, but it&apos;s on the roadmap.
        </p>
      </div>
    </div>
  );
}
