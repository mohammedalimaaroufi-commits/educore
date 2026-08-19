# EduCore Performance Audit — Initial Findings

## Confirmed architecture

- Render free web service runs the Express API, serves the Vite frontend, and hosts Socket.IO.
- The production frontend uses `https://educore-qvxl.onrender.com/api` for REST and `https://educore-qvxl.onrender.com` for Socket.IO.
- The database module switches between local `better-sqlite3` and remote `libsql` when `LIBSQL_URL` is set.

## Confirmed bottlenecks

1. The remote `libsql` connection is used through a synchronous better-sqlite3-style API. Each `prepare().all()`, `.get()`, `.run()`, and schema `exec()` can represent a remote round trip. This is especially expensive on a free Render instance and during cold start.
2. The admin conversation list uses three correlated subqueries per teacher (`last_message`, `last_message_at`, `unread_count`), which scales poorly over a network database.
3. Message send routes insert a row, then issue a second query to read the inserted row before emitting Socket.IO.
4. Message history routes select the full conversation and then issue a separate update to mark messages read.
5. The admin frontend calls `loadConversations()` on every `new_message` event, causing a full conversation-list query after each incoming message.
6. Neither Socket.IO client has explicit connect/error/reconnect handling or a post-reconnect history refresh. Render sleep/wake can make the first socket connection fail or remain stale.
7. The teacher chat loads full history on initial mount and again whenever the widget opens.

## Initial improvement direction

- Add indexes for message lookup and unread counts.
- Reduce duplicate message round trips and full-list refreshes.
- Add Socket.IO reconnection/error handling and refresh after reconnect.
- Keep the existing REST contract initially to reduce migration risk.
- Evaluate a later move from synchronous remote `libsql` calls to `@libsql/client` async queries or PostgreSQL if traffic grows.

## Implemented improvements

- Added a composite index on `messages(teacher_id, sender, read_by_admin, created_at)` for unread counts and conversation ordering.
- Replaced the admin conversation-list query's three correlated subqueries with one window-function query.
- Added Socket.IO reconnection, connection timeout, ping settings, and connection-state recovery.
- Added post-reconnect history refresh for teacher and admin chats.
- Removed the admin-side full conversation-list reload on every incoming message; existing conversations update locally and only unknown conversations trigger a reload.
- Added optimistic message rendering with rollback on failed sends for both teacher and admin chat.
- Added lazy loading for route pages, reducing the initial JavaScript entry bundle from about 784 KB to about 219 KB (with heavy pages loaded on demand).
- Added `database: "turso"|"sqlite"` to `/api/health` without exposing credentials.

## Validation completed

- `npm run build` completed successfully after the frontend changes.
- `node --check` passed for `server.js`, `admin.js`, and `messages.js`.
- The optimized conversation-list SQL executed successfully against local SQLite.
- Local server startup succeeded on a test port.

## Important constraint

Existing accounts cannot be used as a performance baseline if the deployed service is still switching between SQLite and Turso. Database mode must be verified before comparing timings. The performance changes are local and must be committed and deployed to Render before testing the public service.

Author: Manus AI
Date: 2026-08-19

References:
- https://docs.turso.tech/sdk/ts/quickstart
- https://socket.io/docs/v4/client-options/
- https://render.com/docs/free

قيود: لا تتضمن هذه المذكرة أي أسرار أو رموز اتصال.
