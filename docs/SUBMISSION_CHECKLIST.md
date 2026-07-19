# OpenAI Build Week Submission Checklist

Official deadline: July 21, 2026 at 5:00 PM Pacific Time.

## Eligibility and registration

- [x] Entrant is registered on openai.devpost.com before the deadline.
- [ ] Entrant meets the residency and age requirements in the Official Rules.
- [ ] Team representative and prize allocation are agreed, if entering as a team.
- [ ] Project has not received disqualifying financial or preferential support.

## Project requirements

- [x] Category selected: Developer Tools.
- [x] Pre-hackathon baseline identified as commit `1c2d88d`.
- [x] All submitted new work is committed after July 13, 2026.
- [x] Codex collaboration is documented in `docs/BUILD_WEEK.md`.
- [x] GPT-5.6 is materially integrated as the behavioral security auditor.
- [x] A live GPT-5.6 audit succeeds through the deployment's managed identity.
- [x] Third-party licenses and integration terms are reviewed.
- [x] Private signing keys are absent from the submitted repository and package.

## Judge access

- [x] Clean install succeeds on the listed macOS and Linux platforms.
- [x] Automated test suite passes from a clean checkout.
- [x] Public demo is deployed and remains available through August 5, 2026.
- [x] Demo audit endpoint uses a scoped server-side Azure managed identity.
- [x] Testing instructions require no rebuild and no paid account.
- [x] Repository is public with an Apache-2.0 license.
- [x] Release includes a public backup copy of the final demonstration video.
- [x] Public `v0.4.0` package clean-installs with no LLM configured; the prior
  provider-module check remains covered by the automated suite.
- [x] Hello World agent tests prove trusted inference, zero protected inference
  after a bitter soul edit, guarded repair, and outside-group rejection.
- [x] Production Chrome proves all Hello World cases using managed-identity
  GPT-5.6 at desktop and mobile widths with no console or HTTP errors.

## Devpost materials

- [x] English project description explains the problem, audience, and features.
- [x] Category is set to Developer Tools in the prepared submission packet.
- [x] Public YouTube demonstration is under three minutes.
- [x] Demo audio explains what was built and how Codex and GPT-5.6 were used.
- [x] Video contains no unlicensed music, third-party marks, or private data.
- [x] Repository URL is entered in the Devpost draft.
- [x] Live demo URL is entered in the Devpost draft.
- [x] Installation, supported-platform, and judge-testing instructions are written.
- [x] Exact answers for all seven live Devpost custom fields are prepared.
- [x] README contains the required Codex collaboration narrative.
- [x] Fifteen 3:2 gallery images are generated, visually audited, and preserved
  on the public v0.3.1 release.
- [x] Refined Free2PA identity frame is uploaded as the Devpost thumbnail.
- [ ] Fifteen gallery images are attached to the Devpost project in the order
  recorded in `docs/COLLATERAL.md`.
- [ ] `/feedback` Codex Session ID for the primary build thread is entered.
- [ ] Submission is finalized before July 21 at 5:00 PM Pacific Time.

## Final verification

- [x] Video claims match the tested build exactly.
- [x] Screenshots and text describe only hackathon-period additions as new work.
- [ ] All submitted content is owned or properly licensed.
- [x] No secrets, credentials, personal data, or compromised certificates remain.
- [x] Azure, repository, release, package, backup-video, gallery, judge-guide,
  and CI URLs pass logged-out access checks.
- [x] Public YouTube metadata, 1080p availability, and processed audio are
  checked without Studio authentication.
- [ ] Final Devpost URL is checked while logged out.
