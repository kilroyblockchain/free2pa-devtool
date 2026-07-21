# Hello World Agent

This is the smallest complete Free2PA integration. A model receives one
control file, `SOUL.md`, and the input `hello`. The host calls the Free2PA
load gate before passing those instructions to the model.

Verify the Free2PA wiring without a model account:

```bash
npm run demo:hello -- trusted block --fake-model
npm run demo:hello -- changed block --fake-model
npm run demo:hello -- changed repair --fake-model
```

Run with a real model by omitting `--fake-model` after configuring an OpenAI or
Azure OpenAI account as described in `docs/AUDITOR_PROVIDERS.md`.

The trusted agent starts and produces a greeting. Under the default block
policy, a changed soul is quarantined before the model is called. The repair
example recovers the signed original soul in memory, calls the model with that
version, and reports the change.
