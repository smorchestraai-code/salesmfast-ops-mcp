# SalesMfast Ops MCP — JWT Auth Issue

**For:** Dev team
**Reported by:** Yousef (smorchestra.com) via Claude QA session
**Date:** 10 May 2026
**GHL Location:** SMOrchestra (`UNw9DraGO3eyEa5l4lkJ`)
**Severity:** Blocker — all write paths and (after token expiry) all read paths fail

---

## Summary

The GHL JWT used by the `salesmfast-ops` MCP connector is being rejected by the upstream GHL API. Every write operation returns `401 Invalid JWT`. After the MCP server's mid-session reconnect, **read operations also began returning 401**, confirming the token lifecycle (not specific scope on a per-operation basis) is the underlying problem. No connector-level bug; the wrappers are forwarding correctly.

---

## Symptom

All affected calls return:

```
GHL API Error (500): GHL API Error (401): Invalid JWT
```

The error is wrapped twice (500 from the MCP wrapper, 401 from GHL upstream). The 401 is the real error.

---

## Reproduction log (this session, in order)

| # | Connector | Operation | Phase | Result |
|---|-----------|-----------|-------|--------|
| 1 | `ghl-contacts-updater` | update phone | First write attempt | 401 Invalid JWT |
| 2 | `ghl-contacts-updater` | create-note | Same contact | 401 Invalid JWT |
| 3 | `ghl-contacts-reader` | search (by email filter) | After MCP reconnect | 401 Invalid JWT |
| 4 | `ghl-contacts-reader` | search (by query string) | Retry with different params | 401 Invalid JWT |
| 5 | `ghl-email-updater` | create-template | Different connector entirely | 401 Invalid JWT |

**Pattern:** 5-for-5 failures across two readers and two updaters, three different categories. The schema validation passed in every case — payload was forwarded to GHL — and GHL rejected the JWT.

**Key inflection point:** All readers worked correctly for the first ~80% of the session. The 401s started immediately after the first updater call, and after the MCP server's reconnect the readers also began failing.

---

## Likely root causes (ranked)

1. **Token expiry mid-session.** GHL Private Integration Tokens are short-lived. The MCP server appears to cache the JWT on startup and not refresh it. Once the token expires, every downstream call 401s until the server is restarted (or a refresh flow runs).

2. **Reconnect handshake doesn't rotate the token.** When the MCP server disconnects/reconnects (which happened multiple times in this session), it should re-fetch a fresh JWT. Right now it appears to either reuse the old (now-expired) one or pull a token from the same source that's already stale.

3. **Write scope missing on the original token.** Less likely now that readers also 401, but still possible: the JWT was minted with `*.readonly` scopes only, so writes 401'd from the start, and the readers happen to have stopped working for an unrelated reason. Investigate after #1 and #2.

---

## Recommended fix path

### Short-term (unblock testing today)

1. Manually rotate the JWT used by the `salesmfast-ops` MCP for location `UNw9DraGO3eyEa5l4lkJ`.
2. Restart the MCP server / reload the connector.
3. Confirm a `ghl-contacts-reader.search` call returns `200` before any further QA.
4. Then re-run the failed test: `ghl-email-updater.create-template` with the standard params — it should succeed.

### Medium-term (prevent recurrence)

1. **Add token refresh logic** in the MCP server. Either:
   - Use the GHL OAuth refresh-token flow on a timer (refresh at T-5min before expiry), or
   - Catch 401 from upstream → trigger a one-shot refresh → retry the original call once.
2. **Refresh on reconnect.** When the MCP server restarts or its WebSocket reconnects, it should ALWAYS re-mint or refresh the JWT, never reuse an in-memory cached one.
3. **Surface the token's TTL in logs.** When the server starts, log "JWT acquired, expires at <timestamp>". When it 401s, log "JWT was expected to expire at <timestamp>". This makes the lifecycle debuggable from logs alone.
4. **Add a health-check operation** (e.g. `ghl-toolkit-help.token-status`) that returns the current token's `iat`, `exp`, and granted scopes. This lets clients/QA verify auth state without making destructive calls.

### Long-term (audit hardening)

1. **Confirm the JWT scopes include all needed write permissions.** At minimum:
   - `contacts.write`
   - `contacts.notes.write`
   - `calendars.events.write`
   - `emails.template.write`
   - `social-media.account.read` (also called out separately in the broader audit doc)
   - All other `*.write` scopes for each registered updater category.
2. **Document the required scope set in the README.** New deployers will hit the same wall otherwise.

---

## What this is NOT

- **Not a wrapper bug.** Each MCP wrapper validated input correctly and forwarded the request to GHL. The error came back from GHL, unmodified except for the 500 wrap.
- **Not a parameter problem.** Every payload was constructed against the schema. Same payload would succeed if the JWT were valid.
- **Not a per-category issue.** Failed across `contacts-reader`, `contacts-updater`, and `email-updater` — three independent categories.
- **Not an MCP routing issue.** The MCP routing layer dispatched correctly; only auth failed.

---

## Test data for verification

Once the token is rotated, these specific calls should be re-run as a regression check. They were the failed ones in this session and represent typical read + write paths:

| # | Call | Expected on success |
|---|------|---------------------|
| 1 | `ghl-contacts-reader.search` with `{ filters: { email: "nooramjad@gmail.com" } }` | 200 with contact list (0 or more) |
| 2 | `ghl-contacts-updater.update` on contact `lz6P1IRNPt4Pm5YJ6ldX` setting `phone: "+962797125018"` | 200 with updated contact |
| 3 | `ghl-contacts-updater.create-note` on contact `lz6P1IRNPt4Pm5YJ6ldX` body `"MCP contacts builder test completed."` | 200 with note id |
| 4 | `ghl-email-updater.create-template` with name "MCP Email Builder Test - Do Not Send", body `<p>...</p>` | 200 with template id |

Mark each green when it returns 2xx without retry, then close this ticket.

---

## Impact while this is open

- **No QA on any updater can proceed.** All 18 updater categories are gated by this token.
- **All readers may eventually fail** as the token continues to age — even read-only operators (status pages, dashboards built on this MCP) will start 401'ing.
- **Currently any user of this MCP gets a degraded experience**: their session works for a while, then silently breaks.

---

## Reference

This ticket is a focused excerpt of a broader MCP audit (see `salesmfast_mcp_audit.md`) that catalogues 6 separate connector issues. The JWT issue blocks regression-testing the fixes for the other 5.
