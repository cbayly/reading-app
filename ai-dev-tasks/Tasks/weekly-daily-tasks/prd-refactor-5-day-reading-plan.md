# 5‑Day Reading Plan — PRD v2 (Refactor + Story‑Integrated Activities)

**Owner:** Cam
**Goal:** Replace the old weekly plan with a flexible **5‑day plan** built around a generated 3‑chapter story and daily, scaffolded activities.
**Out of Scope for now:** Rewards, trophies, badges, bonus days.

---

## 1) Objectives

* Decouple plans from calendar weeks; a plan can start any day.
* Generate a **3‑part story** using the existing story generation feature when a new plan is created. The story generation response must include a title, theme, the 3 chapters, and vocabulary words for Day 1.
* Provide clear **day states** (Locked, Available, Complete) and a linear progression (1 → 5).
* Deliver day‑specific activities tied to the story.
* Allow users to **complete the plan** and auto‑generate a new plan + story.

---

## 2) User Flows

### 2.1 Plan Overview Page

* **Header:** Plan Name (derived from the generated story's title), Theme (derived from the story's theme).
* **Days List (1–5):** Each day shows state **Locked / Available / Complete**.
* Clicking a day → navigates to **Day Detail Page**.
* "Mark Plan Complete" CTA appears **only** when all days are complete.

### 2.2 Day Detail Page

* **Reading Panel:** Show relevant chapter(s) in a friendly reading layout (line-height 1.7–1.9, font scaling, contrast).
* **Minimize/Collapse control:** For Day 4 display of all chapters, include a **per‑chapter** toggle (minimize to focus on activity).
* **Activities Panel:** Render activities for that day.
* **Complete Day Button:** Disabled until required activities validated; on complete → returns to Plan Overview with day status = Complete and unlocks next day.
* **Post‑Completion Visibility:** After a day is Complete, the user can **view** their responses and the day content **read‑only** (no editing). Optional future admin override may enable edits.

---

## 3) Day‑by‑Day Activities (Story Integration)

> All activities should be stored as structured JSON with validation rules so the UI can render and validate without brittle logic. Target **350–500 words per chapter**.

### Day 1 — Chapter 1 + Vocabulary Matching

* **Display:** Chapter 1 text (\~350–500 words).
* **Activity:** Vocab Matching (6 pairs).
  * The story generation AI will be prompted to identify and provide 6 key vocabulary words from Chapter 1, along with their definitions, directly in its JSON response. This avoids a secondary extraction step.
  * Example words (from current story draft): `edict, reverence, smuggled, enforcer, purge, rebellion`.
  * Each word has one correct definition and 3 distractors (optional stretch). Default = 1:1 list matching.
* **Completion Rule:** All 6 words must be matched correctly (support retry with per‑item feedback).

### Day 2 — Chapter 2 + Comprehension Matching

* **Display:** Chapter 2 text (\~350–500 words).
* **Activity:** Match prompts to answers (5–6 items). Question types: cause→effect, character→action, place→event.
* **Completion Rule:** All correct; allow retry.

### Day 3 — Chapter 3 + Choice‑Based Reflection

* **Display:** Chapter 3 text (\~350–500 words).
* **Activity:** Let the user choose between:
  * **Option A:** 1 good, 2 bad things about the story
  * **Option B:** 2 good, 1 bad things about the story
* **UI:** Radio/segmented control to select the mode; then show 3 text areas labeled accordingly.
* **Persist selection** as `day3Choice`.
* **Completion Rule:** Non‑empty responses for all 3 fields.

### Day 4 — All Chapters + Conditional Writing (+ Optional Upload)

* **Display:** Chapters 1–3 with **per‑chapter minimize/expand** toggles.
* **Activity:** Conditional prompt based on **Day 3 selection**:
  * If **Option A (two bad things)** was chosen: *“Write what you would change to make the story better.”* (1–3 paragraphs)
  * If **Option B (two good things)** was chosen: *“Write what you think will happen on the next adventure in the series.”* (1–3 paragraphs)
* **Optional Additional Activity:** *Draw what you described and upload it.*
  * Accept: `image/png`, `image/jpeg`, `image/webp` (max 10MB).
  * **Storage:** Images will be stored in a cloud storage solution (e.g., S3, GCS). The API will handle the secure upload and store the resulting URL.
* **Completion Rule:** Required writing present; upload is optional.

### Day 5 — Activity Ideas (user must pick **at least 2**)

* **Display:** Provide 3–6 selectable activities.
* **Instruction:** The user must be clearly instructed to select and complete at least 2 activities. No activities will be pre-selected.
* **Activity List:**
    * **Sequence Builder:** Reorder 8–10 story beats.
    * **Alternate Ending (Short):** 1–2 paragraphs.
    * **Character Journal:** Write a journal entry from a character's POV.
    * **Dialogue Rewrite:** Rewrite a scene as dialogue only (script format).
    * **Poster / Slogan:** Create a tagline and short blurb for a poster (text only; optional upload).
    * **Vocabulary Author:** User authors 4 new vocab words *with* definitions and example sentences.
* **Completion Rule:** All chosen Day 5 activities validated (non‑empty, or sequence solved ≥ 80% correct if applicable).

---

## 4) States & Progression

### Day State Machine

* **Locked:** Only Day 1 starts Available. A day is Locked until the previous day is Complete.
* **Available:** Day can be opened; activities editable.
* **Complete:** Day validations pass; **locked to read‑only** for the student (view content and responses without editing).

### Plan Progress

* Day 1 → 2 → 3 → 4 → 5 (linear).
* When **all 5 days Complete**, show **Mark Plan Complete** on the Overview page.
* On plan completion → trigger **New Plan Generation** (see §8).

---

## 5) Data Model (Finalized)

```ts
// Plan
Plan {
  id: string;
  userId: string;
  name: string;            // Sourced from story.title
  theme: string;           // Sourced from story.themes[0]
  createdAt: Date;
  status: 'active' | 'completed';
  story: Story;            // inlined or FK -> Story
  days: Day[];             // 5 entries
}

Story {
  id: string;
  title: string;
  themes: string[];
  part1: string;  // chapter 1 (350–500 words)
  part2: string;  // chapter 2 (350–500 words)
  part3: string;  // chapter 3 (350–500 words)
  vocabulary: { term: string; definition: string; }[]; // 6 words from part1
}

Day {
  index: 1|2|3|4|5;
  state: 'locked' | 'available' | 'complete';
  activities: Activity[];
  metadata?: {
    day3Choice?: 'oneGoodTwoBad' | 'twoGoodOneBad';
  };
}

Activity {
  id: string;
  type: 'matching' | 'writing' | 'sequence' | 'upload' | 'poster' | 'dialogue' | 'journal' | 'vocab-author';
  prompt: string;
  // type-specific payloads
  data?: any;
  // validation/results
  response?: any;
  isValid: boolean;     // computed on submit
}
```

---

## 6) API Endpoints (proposal)

* **POST `/api/plans`** → Create plan
  * Body: `{ generateStory: true }`
  * Server: generates a 3‑part story (including title, themes, vocab), scaffolds 5 days + activities
  * Returns: `Plan`

* **GET `/api/plans/:id`** → Fetch plan detail (with story + days + activities)

* **PUT `/api/plans/:id/days/:index`** → Save day responses + validate (supports **autosave**)
  * Body (partial): `{ activities: Partial<Activity>[] }` → server merges, recalculates `isValid`
  * Server sets day state to `complete` only if validations pass

* **POST `/api/plans/:id/complete`** → Mark entire plan complete
  * Preconditions: all 5 days complete
  * Side effect: create a **new plan** (new story seeded from generator) and return that plan’s id

---

## 7) Validation Rules (per day)

* **Day 1 (matching)**: All 6 word→definition pairs correct. Allow retry with per‑pair feedback.
* **Day 2 (comprehension matching)**: All pairs correct. Allow retry.
* **Day 3 (writing)**: Three required text fields based on selection; min length 1–2 sentences each.
* **Day 4 (conditional writing + optional upload)**: Required writing present; file upload optional, enforce size/type.
* **Day 5 (selected activities)**: User must pick **≥ 2**. For writing-based tasks → non‑empty; for sequence → at least 80% correct order.

---

## 8) New Plan Generation

* Triggered when the user marks the plan complete.
* Use **existing story generation** pipeline to create a fresh 3‑part story. The AI prompt must be updated to ensure the response includes:
  * A `title` for the story.
  * An array of `themes`.
  * The 3 chapters (`part1`, `part2`, `part3`), each 350–500 words.
  * A `vocabulary` array with 6 words and definitions sourced from `part1`.
* The new plan's `name` will be the story's `title`, and the `theme` will be the first theme in the `themes` array.
* Seed a new 5‑day plan with activity scaffolds as above.
* Redirect confirmation: show new plan name/theme on success; keep access to previous plan as read‑only.

---

## 9) UI/UX Requirements

* **Overview:**
  * Horizontal 5‑segment progress indicator (1 segment per day).
  * Day cards show state chip: Locked / Available / Complete.
* **Day 5:** UI must clearly state "Select at least 2 activities to complete the day." No activities should be pre-selected. The "Complete Day" button remains disabled until at least two are selected and valid.
* **Reading Layout:** Friendly reading mode (line‑height 1.7–1.9, 16–18px base on mobile, 18–20px desktop, high contrast).
* **Minimize Chapters (Day 4):** Per‑chapter disclosure with smooth collapse/expand.
* **Autosave:** Persist activity responses on **blur** and at **debounced intervals** during typing; visible save status (Saving… / Saved).
* **Accessibility:** Keyboard navigable matching; ARIA roles for draggable/reorder sequence; high‑contrast focus states.

---

## 10) Implementation Hints

* **Component imports:** Ensure UI lib (e.g., shadcn) is correctly imported with **named exports** (`{ Card, CardContent }`, `{ Button }`, etc.). Avoid default imports unless your local components export default.
* **Content rendering:** If rich formatting is needed, use a markdown renderer (`react-markdown`) or render as paragraphs; avoid raw HTML injection.
* **Persistence & Autosave:** Save draft responses on blur and via 800ms debounced autosave; validate on submit. Show toast/errors inline.
* **State unlock:** When a day is completed, set next day to `available` server‑side.
* **Image Storage:** A cloud storage solution (e.g., S3, Cloudinary) must be set up for the Day 4 optional image upload. The API needs to handle secure file uploads and return a URL to be stored.

---

## 11) Acceptance Criteria

1. A user can create a new **5‑day plan**. The generation process creates a 3‑part story (350–500 words each) and returns a derived **plan name** (from story title), **theme**, and **6 vocabulary words** for Day 1.
2. Plan Overview shows Name, Theme, and five days with correct states.
3. Day 1 renders Chapter 1 and a 6‑item vocab matching activity using the AI-provided words; completion requires all correct.
4. Day 2 renders Chapter 2 and a comprehension matching activity; completion requires all correct.
5. Day 3 renders Chapter 3; user selects reflection mode and submits 3 text fields; saved as `day3Choice`.
6. Day 4 renders all chapters with minimize toggles; conditional writing prompt based on `day3Choice`; optional upload to cloud storage.
7. Day 5 prompts the user to select **≥ 2** activities; validations enforced per activity rules.
8. After a day is marked **Complete**, the day content and responses are **read‑only** for the student.
9. **Mark Plan Complete** is enabled only when all 5 days are complete; calling it creates a new plan with a new story (and derived name/theme).
10. Autosave is functional (blur + debounced typing) with visible status.

---

## 12) Sample Payloads

*The main change is that the `Story` object, generated once per plan, will contain the vocabulary, not the Day 1 activity itself.*

### 12.1 Story Generation Response (Server definition)
`json
{
  "title": "The Edict of the Mustard Enforcer",
  "themes": ["Rebellion", "Food", "Dystopian"],
  "part1": "...",
  "part2": "...",
  "part3": "...",
  "vocabulary": [
    { "term": "edict", "definition": "an official order or proclamation" },
    { "term": "reverence", "definition": "deep respect for someone or something" },
    { "term": "smuggled", "definition": "moved goods illegally into or out of a country/area" },
    { "term": "enforcer", "definition": "a person who compels observance of laws or rules" },
    { "term": "purge", "definition": "remove completely and abruptly" },
    { "term": "rebellion", "definition": "an act of armed resistance to an established government or ruler" }
  ]
}
`
*The Day 1 activity payload will then be constructed using the `vocabulary` array from the story.*

---

## 13) Test Plan
*No changes from original PRD.*

---

## 14) Decisions Made
*   **Plan Naming:** The plan's `name` and `theme` will be sourced directly from a `title` and `themes` array returned by the story generation AI.
*   **Vocabulary Source:** The 6 vocabulary words for Day 1 will also be provided directly by the story generation AI to avoid a secondary extraction step.
*   **Image Storage:** Image uploads will be handled via a cloud storage provider (e.g., S3), with the API managing the upload and storing the URL.
*   **Day 5 Selection:** No activities will be pre-selected. The UI will instruct the user to select at least two.
*   **Story Model:** The `Story` data model will use `part1`, `part2`, `part3` fields to strictly enforce the 3-chapter structure for this plan type.

---

## 15) Delivery Checklist
* [ ] API endpoints implemented per §6
* [ ] UI components for matching, writing, sequence, upload
* [ ] Story renderer with per‑chapter collapse controls
* [ ] State machine + unlock logic (read‑only after completion)
* [ ] Autosave (blur + debounced) + visible status
* [ ] Validation + error UI
* [ ] Test suite (unit + integration + E2E) green
* [ ] New plan creation flow on completion
