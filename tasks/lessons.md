## 2026-05-24 - Slot counters drift due to client-side fallback math
**Context**: RegistrationModal UI displayed registered/remaining counts but also used client fallback math when server `remaining` was unavailable, causing incorrect slot indicators.
**Mistake**: Mixing server-driven state (`registered`, `remaining`) with client-side derived fallback math.
**Pattern**: Slot/availability UI must be 100% derived from the server contract to avoid drift, especially under concurrent registrations.
**Action**: Remove all client fallback computations for `registered`/`remaining`; interpret server response in a single helper; refresh slot availability after successful registration.

