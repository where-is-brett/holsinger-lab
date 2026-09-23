# Cutover and handover: Brett's checklist

Technical companion to [`HANDOVER.md`](HANDOVER.md). Do these in order. Anything that writes to
`production`, deletes a dataset, or deletes a branch needs your explicit yes at the time.

Names used below: Sanity project `j3f9z8os`; Vercel project `holsingerlab` in team
`whereisbretts-projects`; repo `where-is-brett/holsinger-lab`. Candidate branches:
`redesign/wix` (classic) and `redesign/integration` (redesign). Both previews read the
`wix-preview` dataset through a branch-scoped `NEXT_PUBLIC_SANITY_DATASET`.

## 0. Before sending the email

- [ ] Merge this docs PR immediately before sending. The email links
      `blob/main/docs/HANDOVER.md`, and until this merges `main` still has v1.
- [ ] Both preview URLs load and show current `wix-preview` content.
- [ ] Redesign chosen? Wait for the in-flight revision PRs (PR 3 Publications, PR 4
      People/Research/Contact) to land on `redesign/integration` before cutover.

## 1. Content: import the Wix content into production

The importer exists only on `redesign/wix` (`scripts/import-wix.ts`, `data/wix/snapshot.json`).
Run it from a `redesign/wix` checkout whichever design wins. The import needs a write token
(`SANITY_API_WRITE_TOKEN`), which worktrees don't carry.

- [ ] Production `settings.labHead` is set (the classic's Team page leans on it to exclude the PI).
- [ ] Dry run:
      `npm run import:wix -- --dataset production`
- [ ] Live-impact check (spec section 8, gate G2): **drift check** (chosen path). Diff the
      fresh dry run against `dryrun-production.txt` in the wix-lookalike ledger
      (`.superpowers/sdd/2026-09-22-wix-lookalike/`, vigorous-wu worktree). Any new or changed
      line means production drifted since `wix-preview` was copied. Review each one before
      committing. No rendered "after" of old `main` is needed: the chosen design goes live
      minutes later, and it was already reviewed on `wix-preview`, which is the same data by
      construction.[^g2]
- [ ] Before committing, have the step 2 merge PR open with CI green, so the merge can follow
      the import immediately. Until it lands, old `main` renders production, and its `/people`
      shows about 22 new, mostly photo-less alumni and intern profiles.
- [ ] Backup:
      `npx sanity dataset export production ./backups/production-$(date +%F).tar.gz`
- [ ] Commit (Brett's yes first):
      `SANITY_API_WRITE_TOKEN=... npm run import:wix -- --dataset production --commit --backup ./backups/production-<date>.tar.gz --confirm-production`
      The script never deletes or blanks a field. It skips fields edited in Studio since the
      last import, and aborts the whole commit if a document changes mid-run. Re-run to re-plan.

## 2. Code: merge the chosen branch

Order: **import (step 1) → merge immediately → post-deploy smoke test.**

- [ ] Merge the PR opened in step 1 as soon as the import commit succeeds. Vercel deploys
      production.
- [ ] Post-deploy smoke test on holsingerlab.vercel.app: every nav route returns 200, `/studio`
      loads, and the imported content (team, news or resources, publications) shows.
- [ ] Paste `docs/tutorial-copy.md` into the Studio `/tutorial` page (a `page` document).
- [ ] Trim `HANDOVER.md` to the chosen design: drop section 1 and the other design's
      "only" lines. Small follow-up PR.

## 3. Remove the preview plumbing

- [ ] Vercel → Settings → Environment Variables: delete both branch-scoped
      `NEXT_PUBLIC_SANITY_DATASET` entries (Preview, `redesign/wix` and `redesign/integration`).
- [ ] Vercel: delete `SANITY_API_WRITE_TOKEN` if present. Nothing in `app/` or `lib/` reads it;
      only the one-off scripts do. That leaves Damian one token to re-issue, not two.
- [ ] sanity.io/manage → API → CORS origins: remove
      `https://holsingerlab-git-redesign-wix-whereisbretts-projects.vercel.app` and
      `https://holsingerlab-git-redesign-integration-whereisbretts-projects.vercel.app`.
- [ ] Delete the `wix-preview` dataset (and any temp impact dataset) once nothing reads it:
      `npx sanity dataset delete wix-preview`.

## 4. Webhook check

sanity.io/manage → API → Webhooks → the production webhook:

- [ ] URL `https://holsingerlab.vercel.app/api/revalidate`, dataset `production`, trigger on
      create, update and delete.
- [ ] No filter. It must fire for every type, including `newsItem`, `mediaAppearance`,
      `siteCopy`, `roleGroup` and `resource`.
- [ ] Projection `{"type": _type, "slug": slug.current}`. Classic's route revalidates every
      path whatever the type. The redesign's route switches on `type` and returns 400 for a
      `page` or `project` payload without `slug`.
- [ ] Publish a trivial edit. Confirm a 200 in the webhook's attempts log and the change live
      within about a minute.

## 5. Git housekeeping

- [ ] Tag the losing design before deleting it, e.g. `archive/redesign-integration` or
      `archive/redesign-wix`, and push the tag.
- [ ] Delete remote branches merged into `main` (`git branch -r --merged origin/main`) and the
      remaining `redesign/*` and `claude/*` branches you don't need. Check the list first.
- [ ] `git worktree list`, then `git worktree remove` each finished worktree under
      `.claude/worktrees/`. Delete the lookalike ledger only after the import has landed.

## 6. Account handover (HANDOVER.md section 3)

Golden rule: Damian has working access before you remove yourself from anything.

- [ ] **GitHub.** Repo → Settings → Collaborators → add Damian (Admin). Later: Settings →
      General → Danger Zone → Transfer ownership → his username. He has a day to accept.
- [ ] **Vercel.** Hobby teams can't add members, so the dashboard's Transfer Project flow
      (which needs you in the target team) won't reach his Hobby account. Use a transfer
      request instead:
      `curl -X POST "https://api.vercel.com/projects/holsingerlab/transfer-request?slug=whereisbretts-projects" -H "Authorization: Bearer $VERCEL_TOKEN"`
      Send him `https://vercel.com/claim-deployment?code=<code>`. The code lasts 24 hours.
      Deployments, env vars, the `holsingerlab.vercel.app` alias and the Git link move with
      the project. Integrations don't, so re-add any. Do this after the GitHub transfer so his
      Vercel account can see the repo.
- [ ] **Sanity.** Invite Damian to project `j3f9z8os` as Administrator. To move ownership,
      Damian adds you to his organisation. Then sanity.io/manage → project → Settings → move it
      to his organisation. He then removes you.
- [ ] **Keys.** After his new `read` token and `SANITY_WEBHOOK_SECRET` are live and tested,
      delete your old tokens in sanity.io/manage → API → Tokens.
- [ ] **Formspree.** Redesign: once his form works, delete yours. Classic: nothing renders the
      form, so delete yours and leave `FORMSPREE_ENDPOINT` unset.
- [ ] **Renovate.** The Renovate app install is per account, so it stops after the transfer
      unless Damian installs it. GitHub's own Dependabot alerts continue either way. Decide
      whether to mention it.
- [ ] Remove yourself from GitHub, Vercel and Sanity last.
- [ ] Never run `npm audit fix --force` here. It downgrades the CMS.

[^g2]:
    Alternative, not taken: the spec's full report (import into a temp copy of production,
    render old `main` against it). It needs a spare dataset. The Free plan allows two,
    `production` and `wix-preview` use both, and `sanity dataset copy` is Enterprise-only. So
    it would mean deleting `wix-preview` first, which takes down both previews.
