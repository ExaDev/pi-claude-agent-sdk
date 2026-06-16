# pi-claude-agent-sdk

A [pi](https://github.com/earendil-works/pi-mono) extension that registers a
custom Claude provider routing model calls through the **Claude Agent SDK**, so
they authenticate as first-party Claude Code and draw from the **Claude Pro/Max
subscription rate-limit pool** instead of pi's per-token Anthropic-OAuth path.

Tool execution stays native to pi (deny-and-reroute): the SDK proposes tool
calls, pi executes them, so the host's bash override, permissions, and other
tooling still apply.

## Install

```bash
pi install github:ExaDev/pi-claude-agent-sdk
# or, from a local checkout:
pi install path:~/Developer/pi-claude-agent-sdk
```

The `@anthropic-ai/claude-agent-sdk` dependency (which bundles a
platform-specific Claude Code binary) is installed automatically as an optional
dependency.

## Authenticate

Pick one by logging in (no config needed for the default):

- **Subscription (Pro/Max)** — the default and the whole point. Log in with
  Claude Code and make sure no API key is set:

  ```bash
  npx @anthropic-ai/claude-code   # one-time login, writes ~/.claude
  unset ANTHROPIC_API_KEY
  ```

- **API key** — opt in to bill to the Console / extra-usage pool (useful for
  testing without touching subscription quota): `export ANTHROPIC_API_KEY=...`
  and set `authMode: "apiKey"` (below).

The provider verifies the SDK's reported auth source and **fails loudly** if
subscription was requested but an API key was detected, so it never silently
bills the wrong pool.

## Use

Select a model with `/model`, e.g. `claude-agent-sdk/claude-opus-4-7 (SDK)`.

## Configuration (`claudeAgentSdk` in settings.json)

Settings live under `claudeAgentSdk` in `~/.pi/agent/settings.json` (global)
or `<cwd>/.pi/settings.json` (project; wins).

```json
{
  "claudeAgentSdk": {
    "authMode": "subscription",
    "mode": "flatten",
    "appendSystemPrompt": true,
    "strictMcpConfig": true,
    "settingSources": ["user", "project"]
  }
}
```

| field | default | meaning |
|---|---|---|
| `authMode` | `"subscription"` | `"subscription"` (OAuth pool) or `"apiKey"` (Console pool) |
| `mode` | `"flatten"` | history mode — see below |
| `appendSystemPrompt` | `true` | append pi's system prompt to Claude Code's preset |
| `strictMcpConfig` | — | pass `--strict-mcp-config` (skip auto-loaded MCP configs) |
| `settingSources` | — | Claude Code `--setting-sources` override |

### History modes

The Agent SDK's prompt interface only accepts `role: "user"` messages, so the
conversation can't be replayed as real alternating turns per call. Two modes:

- **`flatten`** (default) — each turn sends the whole transcript as one user
  message (assistant turns as labelled text). Robust to pi's session tree and
  compaction; prompt caching still works because the flattened block prefix is
  append-only and stable. Best for general use.
- **`session`** — the SDK keeps the real alternating transcript (thinking
  signatures, tool_use/tool_result pairs) and each turn resumes the SDK session
  by id, sending only the new user/tool-result messages. Avoids flattening
  assistant turns; best for long linear conversations. A fork gets a fresh SDK
  session (keyed on pi's session id); a compact that rewrites the transcript
  resets to a fresh session (the SDK session is linear and can't follow pi's
  compactable tree).

## How it works

- `streamSimple` builds the prompt (per mode), calls the SDK `query()` with
  `permissionMode: "dontAsk"` and a `canUseTool` that always denies, and maps
  the SDK's raw Anthropic stream events onto pi's `AssistantMessageEvent`
  protocol (text / thinking / tool_use).
- pi's loop executes the resulting tool calls natively, then calls the provider
  again next turn with the updated context.
- Billing is decided by which loop makes the completion call (the SDK
  subprocess), not by where tools execute — so subscription vs API-key is purely
  an auth concern.

## Develop

```bash
pnpm install
pnpm test     # node --experimental-strip-types --test
pnpm check    # tsc --noEmit
pnpm lint     # eslint
```

## Acknowledgements

Built on the pattern established by
[`prateekmedia/claude-agent-sdk-pi`](https://github.com/prateekmedia/claude-agent-sdk-pi),
with structured/cursor-based history modes, auth determinism, type-guard
narrowing, and modular tests.
