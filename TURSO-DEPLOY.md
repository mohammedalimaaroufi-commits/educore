# Turso deployment

The current Render deployment must include `backend/src/db/index.js` and the `libsql` dependency from this archive. Add `LIBSQL_URL` and `LIBSQL_AUTH_TOKEN` only in Render Environment Variables, never in GitHub.

After copying this project into the local Git repository, run:

```powershell
git add .
git commit -m "Enable persistent Turso database"
git push origin main
```

Then wait for Render to deploy the new commit. Confirm that `backend/package.json` contains `libsql` and `backend/src/db/index.js` contains `RemoteDatabase` before pushing.
