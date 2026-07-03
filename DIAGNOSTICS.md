# ADD Diagnostics — Zróbmy coś

Three edge-cases identified while building the layout, and exactly where the code above handles each one.

## 1. Rapid double-clicking the 🔥 button

**Risk:** a user double-clicks (or the click handler double-fires on a slow render) before the disabled state re-renders, sending two inserts for the same `(project_id, user_id)` pair.

**Solution, three layers deep:**
- `components/fire-button.tsx` sets a synchronous `isLocked` flag *before* the async call starts, so a second click inside the same event loop tick is a no-op even though React hasn't re-rendered `disabled` yet.
- The optimistic UI flips `hasFired` to `true` immediately, so the button visually locks on the first click regardless of network latency.
- The real backstop is the database: `fires` has `unique (project_id, user_id)`. If two inserts somehow race past the client guard (two tabs, a replay), Postgres rejects the second with `23505 unique_violation`, and the client treats that specific error code as a success rather than surfacing it — the user's fire was already recorded, so no error should appear.

## 2. Real-time message duplication

**Risk:** when a user sends a message, it can arrive twice — once from the optimistic local insert, once echoed back through the `postgres_changes` realtime subscription (and potentially a third time if the subscription reconnects and re-delivers).

**Solution:** `app/messages/[chatId]/page.tsx` keeps a `seenIds` ref (a `Set`) that is the single source of truth for "has this message id been rendered." A temp id (`tmp-...`) is added to the set the moment the optimistic bubble is shown; the real id is added to the set the moment the insert resolves *or* the moment the realtime event arrives, whichever happens first. `appendMessage()` checks the set before ever pushing to state, so no code path can render the same message twice — including out-of-order delivery where the realtime INSERT event arrives before the `insert().select()` response does.

## 3. Chat room duplication from concurrent "Napisz" clicks

**Risk:** two users click "Napisz" on each other at nearly the same moment (or one user clicks it twice from two devices), and a naive `select-then-insert` creates two separate rooms for the same pair.

**Solution:** room creation never happens directly from the client. `components/napisz-button.tsx` calls the `get_or_create_chat_room` Postgres function (`security definer`), which normalizes the pair so the smaller UUID is always `user_a` — meaning `(user_a, user_b)` is deterministic regardless of who clicked first — and relies on the `unique (user_a, user_b)` constraint plus `on conflict do nothing` to make the insert idempotent. A losing race simply re-selects the row the winner just created, so both clients always end up in the same room.

## Other hardening worth flagging

- **Middleware rate limiting** uses an in-memory sliding window per identity+route. This is correct for a single-instance deployment but **not** for multi-instance serverless — the comment in `middleware.ts` flags this explicitly so it isn't missed when moving to production scale (swap for Upstash Redis or similar).
- **RLS as the real security boundary.** Every client-side check (disabled buttons, optimistic UI) is UX polish, not security — the actual guarantees live in the RLS policies in `schema.sql`, so even a modified client can't write data it shouldn't.
