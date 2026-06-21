# Chat Experience Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chat feel like a contextual emotional roleplay instead of a one-sentence scoring bot.

**Architecture:** Keep the existing `/api/chat` endpoint and response shape, but add an emotion score contract beside stage changes. DeepSeek returns structured JSON with `response`, `emotion`, `score_delta`, `stage_changed`, `reference_answer`, and `suggestions`; server normalizes that into current UI fields.

**Tech Stack:** Next.js App Router, TypeScript, React client state, DeepSeek OpenAI-compatible chat completions.

---

### Task 1: Upgrade Chat Model Contract

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] Replace the short-reply prompt with a 2-4 sentence contextual roleplay prompt.
- [ ] Add `emotion` and `score_delta` to the expected model JSON.
- [ ] Normalize parsed model output so invalid or missing fields cannot break `/api/chat`.
- [ ] Replace fixed fallback with varied stage-aware fallback replies.

### Task 2: Add Emotion Score Flow For Guest Sessions

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/play/[id]/page.tsx`

- [ ] Track `emotionScore` in the client.
- [ ] Include `emotion_score` in `guest_session` requests.
- [ ] Return `emotion_score` from `/api/chat`.
- [ ] Advance stage when accumulated score reaches the threshold.

### Task 3: Verify

**Files:**
- Run: `corepack pnpm build`

- [ ] Confirm TypeScript and Next build pass.
- [ ] Confirm `/api/chat` is still generated as a dynamic route.
