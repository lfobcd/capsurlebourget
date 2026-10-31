<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All event facts, legal texts, pricing caps and labels live in `src/config/event.ts` (cities in `cities.ts`, axes in `axes.ts`); never hardcode them in pages — one file to edit.
- Price cap logic lives only in `src/lib/pricing.ts` and is mirrored by a DB CHECK on `trips`; change both together.
- Bookings, seat counts and conversations change only through SQL functions (`book_trip`, `respond_booking`, `cancel_booking`, `get_or_create_conversation`) to stay transactional and RLS-safe.
- Phone and last name live in `profile_private`, readable only via `can_view_contact` (owner or confirmed booking party).
- Signed-in pages show an inline invitation (`RequireAuth`) instead of redirecting, per product requirement.
