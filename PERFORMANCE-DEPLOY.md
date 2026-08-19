# EduCore performance update

This version includes Socket.IO reconnection and recovery, optimistic chat rendering, reduced admin conversation reloads, message indexes, a single window-function query for conversation summaries, a database-mode health indicator, and lazy-loaded frontend routes.

## Deploy from the existing Git repository

Copy this folder's contents into the existing local Git repository (do not copy `.git`), then run:

```powershell
git add .
git commit -m "Improve performance and realtime messaging"
git push origin main
```

Render must deploy the new commit before public testing. After deployment, `/api/health` should include `"database":"turso"`.

Do not put `LIBSQL_AUTH_TOKEN` in GitHub. Keep it only in Render Environment Variables.
