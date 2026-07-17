import GlassCard from "./GlassCard.jsx";
import { BookOpen } from "lucide-react";
import { DOCS_SECTIONS } from "../constants/labels.js";

export default function ManualDocs() {
  return (
    <div className="space-y-5">
      <GlassCard eyebrow="Reference" title="Manual & Help Docs">
        <div className="flex items-center gap-2 text-ink/70 text-sm mb-2">
          <BookOpen size={15} className="text-cyan-glow/70" />
          Everything below explains what AEGIS does, how its AI works, and what each part of the dashboard is for.
        </div>
      </GlassCard>

      {DOCS_SECTIONS.map((section) => (
        <GlassCard key={section.heading} title={section.heading}>
          <p className="text-sm text-ink/70 leading-relaxed">{section.body}</p>
        </GlassCard>
      ))}
    </div>
  );
}
