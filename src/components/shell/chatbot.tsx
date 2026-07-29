"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, ThumbsUp, ThumbsDown, Bot, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GUIDE_CATEGORIES, OPEN_GUIDE_EVENT, type OpenGuideDetail } from "./help-desk";
import { useEffectiveCapabilities } from "@/lib/store";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY } from "@/lib/nav";

// Same capability requirements the Sidebar already hides restricted nav
// items by (see visibleNavItems in nav.ts) — a quick reply is never allowed
// to offer a page the current role can't actually open, so the assistant
// can't accidentally suggest a shortcut around real RBAC.
const ROUTE_CAPABILITIES = new Map([...NAV_ITEMS, ...NAV_ITEMS_SECONDARY].map((i) => [i.href, i.requiredCapability]));

interface QuickReply {
  label: string;
  href?: string;
  /** Deep-links into Help & Support's Knowledge Center — see OPEN_GUIDE_EVENT in help-desk.tsx. */
  guideId?: string;
  searchTerm?: string;
}

interface Message {
  id: string;
  role: "bot" | "user";
  text: string;
  quickReplies?: QuickReply[];
  feedbackGiven?: "up" | "down";
}

interface KbEntry {
  keywords: string[];
  reply: string;
  quickReplies?: QuickReply[];
}

// Curated, action-first answers for the handful of things people ask most —
// each links straight to the screen, not just an explanation. Anything this
// doesn't cover falls through to the Knowledge Center search below, so the
// assistant's actual knowledge isn't capped at these eight topics.
const KNOWLEDGE_BASE: KbEntry[] = [
  {
    keywords: ["create", "new rule", "add rule"],
    reply: "You can create a rule without writing any code. Open the Rule Builder, fill in metadata, add IF conditions, and choose a THEN action.",
    quickReplies: [{ label: "Open Rule Builder", href: "/rule-builder" }],
  },
  {
    keywords: ["matrix", "slab", "haircut", "premium", "interest rate", "ltv"],
    reply: "Pricing tables like interest rate slabs, LTV/haircut bands, and premium loadings live in the Decision Matrix — edit a cell and it updates the Simulator instantly.",
    quickReplies: [{ label: "Open Decision Matrix", href: "/matrix" }],
  },
  {
    keywords: ["simulate", "simulator", "test", "run"],
    reply: "The Rule Simulator lets you enter sample customer data and see the decision, the exact rules that fired, and a full explanation trace.",
    quickReplies: [{ label: "Open Simulator", href: "/simulator" }],
  },
  {
    keywords: ["reject", "rejected", "why", "explain", "trace"],
    reply: "Every decision includes a Decision Explanation timeline — it shows each rule, the condition it checked, the expected vs. actual value, and whether it passed, failed, or was skipped.",
    quickReplies: [{ label: "Open Simulator", href: "/simulator" }],
  },
  {
    keywords: ["repository", "search rule", "find rule", "clone", "disable", "archive"],
    reply: "The Rule Repository is the searchable catalogue of every rule. You can filter by status/category/priority/owner, and clone, disable, or archive rules inline.",
    quickReplies: [{ label: "Open Repository", href: "/repository" }],
  },
  {
    keywords: ["theme", "branding", "logo", "dark mode", "appearance", "wallpaper"],
    reply: "Appearance Studio lets you switch theme presets, toggle light/dark mode, upload a wallpaper, and replace the client logo — with a live preview before you apply.",
    quickReplies: [{ label: "Open Appearance Studio", href: "/appearance" }],
  },
  {
    keywords: ["export", "csv", "download"],
    reply: "Every data table has a one-click CSV export in its toolbar — it respects your current filters and column order.",
  },
  {
    keywords: ["role", "access", "permission", "rbac"],
    reply: "The platform is RBAC-ready: switch roles from your profile menu to preview how Business Analysts, Risk Managers, and Admins see the platform differently in later phases.",
  },
];

const FALLBACK: KbEntry = {
  keywords: [],
  reply: "I couldn't find a close match for that. Try rephrasing, or browse the Knowledge Center directly — it covers everything from rule authoring to production checklists.",
  quickReplies: [{ label: "Talk to Help Desk" }],
};

// Trained directly on the Knowledge Center's own guides (help-desk.tsx) —
// same source of truth, so the assistant never says something the written
// docs don't already back up, and adding a guide there teaches the assistant
// automatically with no duplicate content to maintain here.
const ALL_GUIDES = GUIDE_CATEGORIES.flatMap((c) => c.guides);
// Title/description matches are a much stronger signal than a guide merely
// cross-referencing a term once in passing prose — without this weighting, a
// guide that just *mentions* "Audit Log" in one sentence could outscore the
// actual Audit Log guide on a tie.
const GUIDE_FIELDS = new Map(
  ALL_GUIDES.map((g) => [
    g.id,
    {
      title: g.title.toLowerCase(),
      description: g.description.toLowerCase(),
      rest: `${g.module} ${(g.content ?? []).join(" ")}`.toLowerCase(),
    },
  ])
);
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "to", "of", "in", "on", "for", "and", "or",
  "how", "do", "does", "did", "can", "could", "what", "where", "when", "why", "my", "me", "it", "this", "that",
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Below this, the best match is more likely a coincidental single mention
// somewhere in a guide's body text than a real answer — e.g. a query about
// a feature the Knowledge Center has no guide for yet shouldn't confidently
// return whichever unrelated guide happens to reference one of its words in
// passing. A lone title hit (weight 4) always clears this; a lone incidental
// content mention (weight 1-2) does not.
const MIN_CONFIDENT_SCORE = 3;

function findGuideMatch(input: string) {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;
  let best: { guide: (typeof ALL_GUIDES)[number]; score: number } | null = null;
  for (const guide of ALL_GUIDES) {
    const fields = GUIDE_FIELDS.get(guide.id)!;
    const score = tokens.reduce((acc, t) => {
      if (fields.title.includes(t)) return acc + 4;
      if (fields.description.includes(t)) return acc + 2;
      if (fields.rest.includes(t)) return acc + 1;
      return acc;
    }, 0);
    if (score >= MIN_CONFIDENT_SCORE && (!best || score > best.score)) best = { guide, score };
  }
  return best;
}

function findAnswer(input: string): KbEntry {
  const lower = input.toLowerCase();
  const curated = KNOWLEDGE_BASE.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  if (curated) return curated;

  const match = findGuideMatch(input);
  if (match) {
    const { guide } = match;
    return {
      keywords: [],
      reply: guide.content?.[0] ?? guide.description,
      quickReplies: [{ label: `Read: ${guide.title}`, guideId: guide.id, searchTerm: guide.title }],
    };
  }

  return FALLBACK;
}

const GREETING: Message = {
  id: "greet",
  role: "bot",
  text: "Hi, I'm the BRE Assistant. Ask me how to build a rule, update pricing, or explain a decision — I'll guide you to the right screen.",
  quickReplies: [
    { label: "How do I create a rule?" },
    { label: "How is a decision explained?" },
    { label: "Where do I edit interest rates?" },
  ],
};

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const capabilities = useEffectiveCapabilities();

  const canAccessHref = (href: string) => {
    const requiredCapability = ROUTE_CAPABILITIES.get(href);
    return !requiredCapability || capabilities.has(requiredCapability);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  /* eslint-disable react-hooks/purity */
  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    const kb = findAnswer(text);
    const botMsg: Message = { id: `b-${Date.now()}`, role: "bot", text: kb.reply, quickReplies: kb.quickReplies };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
    /* eslint-enable react-hooks/purity */
  };

  const handleQuickReply = (qr: QuickReply) => {
    if (qr.href) {
      // Defensive re-check — e.g. a role switch between render and click —
      // even though restricted links are already filtered out of the quick
      // reply list itself below.
      if (!canAccessHref(qr.href)) {
        setMessages((m) => [
          ...m,
          { id: `u-${Date.now()}`, role: "user", text: qr.label },
          { id: `b-${Date.now()}`, role: "bot", text: "Your current role doesn't include permission to open that screen." },
        ]);
        return;
      }
      router.push(qr.href);
      setOpen(false);
      return;
    }
    if (qr.guideId && qr.searchTerm) {
      window.dispatchEvent(
        new CustomEvent<OpenGuideDetail>(OPEN_GUIDE_EVENT, { detail: { guideId: qr.guideId, searchTerm: qr.searchTerm } })
      );
      setOpen(false);
      return;
    }
    if (qr.label === "Talk to Help Desk") {
      setMessages((m) => [
        ...m,
        { id: `u-${Date.now()}`, role: "user", text: qr.label },
        { id: `b-${Date.now()}`, role: "bot", text: "Connecting you to Help Desk — use the ? icon in the header for phone, email, and hours." },
      ]);
      return;
    }
    send(qr.label);
  };

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-5 right-5 z-50 cursor-grab active:cursor-grabbing"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="icon"
          onClick={() => setOpen((v) => !v)}
          className="size-13 rounded-full shadow-lg shadow-primary/25"
          aria-label="Open chat assistant"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "open"}
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl",
              "bottom-22 right-5 h-[min(560px,70vh)] w-[min(380px,calc(100vw-2.5rem))]"
            )}
          >
            <div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/10 to-transparent px-3.5 py-2.5 cursor-grab active:cursor-grabbing select-none" title="Drag to move BRE Assistant">
              <GripHorizontal className="size-4 text-muted-foreground/60 shrink-0" />
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                <Bot className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none truncate">BRE Assistant</p>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">Guided help · role-aware</p>
              </div>
              <Sparkles className="size-3.5 text-primary/60 shrink-0" />
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col gap-1.5", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                      m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {m.text}
                  </div>
                  {m.role === "bot" && m.quickReplies && m.quickReplies.filter((qr) => !qr.href || canAccessHref(qr.href)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.quickReplies.filter((qr) => !qr.href || canAccessHref(qr.href)).map((qr) => (
                        <button
                          key={qr.label}
                          onClick={() => handleQuickReply(qr)}
                          className="rounded-full border px-2.5 py-1 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.id !== "greet" && (
                    <div className="flex items-center gap-1 pl-1">
                      <button
                        onClick={() => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, feedbackGiven: "up" } : x)))}
                        className={cn("rounded p-0.5 hover:text-emerald-500", m.feedbackGiven === "up" && "text-emerald-500")}
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <button
                        onClick={() => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, feedbackGiven: "down" } : x)))}
                        className={cn("rounded p-0.5 hover:text-red-500", m.feedbackGiven === "down" && "text-red-500")}
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t p-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="icon" type="submit" className="size-9 shrink-0">
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
