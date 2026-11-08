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

- Telegram messages are persisted by an authenticated webhook and read only by admins; replies revalidate the admin role server-side to keep financial communications private.
- Telegram provider calls use the linked connector gateway, and incoming updates are deduplicated by update ID to handle provider retries.
