## AI Usage Policy

> [!NOTE]
> This fork takes a different position from upstream. Upstream asks that AI be
> used assistively only and may close pull requests that look AI generated.
> Here, AI is allowed. What we ask for instead is evidence that the change is
> correct.

### Our rule

Use AI as much as you like. Write the whole patch with it if that is how you
work.

What we care about is not who typed the code, it is whether the change does
what it claims and whether anything else moved while you were not looking. A
tool that writes fast can also drift fast, so the burden of proof sits with the
contributor, not the reviewer.

Two things make that work: asking for the right change, and proving it with
tests.

## Ask for the change, not the outcome

The failure mode we want to avoid is a vague instruction that leaves the tool
free to reshape whatever it likes.

Do not ask for:

> make the button green

An instruction like that has no boundary. The model may restyle a shared
component, add a colour to the theme, touch every button in the app, or invent
a new one. You get your green button and three other things you did not ask
for.

Ask for:

> in `frontend/src/components/share/modals/showCreateReverseShareModal.tsx`,
> change the submit button's colour to the theme's `green` shade, leave every
> other button alone

Name the file, name the thing, and say what must not change. This applies to
more than styling. "Speed up the share list" is a wish. "Replace the per share
`findUnique` in `backend/src/share/share.service.ts` with a single `findMany`,
keeping the same returned shape" is an instruction you can review.

If the model proposes a wider change than you asked for, that is a signal worth
reading, not a bonus to accept.

## Prove it with tests

Every behaviour change needs a test that fails before the change and passes
after. That test is the thing that stops the next contributor, human or model,
from quietly undoing your work.

Pick the level that actually covers the behaviour:

| Kind of change | Where the test belongs | Command |
|---|---|---|
| A pure function, a guard, a validator | `*.spec.ts` next to the source | `npm test` |
| Anything touching the schema or a query shape | `backend/test/prisma` | `npm run test:db` |
| A request path, an upload, an antivirus verdict | `backend/test/integration` | `npm run test:integration` |
| A frontend utility | `*.test.ts` next to the source | `npm test` in `frontend` |

A test that passes whether or not your change is present is not a test. Break
the change on purpose and confirm the test goes red before you trust it.

If a change genuinely cannot be tested, say so in the pull request and explain
what you did instead. That is a reasonable answer. Silence is not.

## Run everything before you ask for review

CI runs lint, typecheck, unit tests and the database checks. Run them yourself
first. Turning the pull request into your test run wastes the reviewer's time
and hides which of your commits broke what.

```bash
# backend
cd backend
npm run lint && npx tsc --noEmit && npm test && npm run test:db

# frontend
cd frontend
npm run lint && npx tsc --noEmit && npm test && npm run build
```

The integration suite needs a running stack and is not part of CI, so it is on
you to run it when your change touches a request path:

```bash
docker compose -f docker-compose.local.yml up -d
cd backend && npm run test:integration
```

If your change touches the container, the database or startup, build the image
and start it. "It compiles" is not the same as "it boots".

## What still applies

1. **Understand what you are submitting.** You should be able to explain any
   line of it without opening the tool again. If you cannot explain it, you
   cannot review it, and neither can we.
2. **You own the result.** Bugs belong to the person who opened the pull
   request, not to the model.
3. **Keep the diff honest.** Formatting churn, unrelated refactors and drive by
   "improvements" make review harder. Every changed line should trace back to
   what you set out to do.
4. **Small commits.** One logical change each. A single large commit is hard to
   review and harder to revert.
5. **Say what you used.** A line in the pull request is enough. This is not a
   confession, it helps the reviewer know where to look closely.

### Example disclosure

> Claude wrote most of this patch. I pointed it at the specific guard, reviewed
> the diff, added the test for the anonymous case and ran the full suite plus
> the integration tests locally.

> I used ChatGPT to work out why the migration failed. The fix is mine, and the
> database check that now covers it is new.
