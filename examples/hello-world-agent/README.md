# Hello World Agent

This is the smallest complete Free2PA integration. An OpenAI or Azure OpenAI
model receives one control file, `SOUL.md`, and the input `hello`. The trusted
soul permits only `Hello, <optimistic adjective> world!`. The host calls the
Free2PA load gate before passing those instructions to the model.

```bash
npm run demo:hello -- trusted
npm run demo:hello -- changed
npm run demo:hello -- outside
npm run demo:hello -- changed repair
```

Configure your own model account as described in `docs/AUDITOR_PROVIDERS.md`.
The trusted agent starts and produces an optimistic greeting. Under the default
block policy, a soul changed to require bitter adjectives is quarantined and an
outside-group publisher is rejected before the model is called. The repair
example recovers the signed optimistic soul in memory, calls the model with
that version, and reports the change.
