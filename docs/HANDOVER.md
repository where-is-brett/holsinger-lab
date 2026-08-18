# Website handover

Everything needed to own and run the Holsinger Lab website.

**From:** Brett Yang · **To:** R. M. Damian Holsinger · **Date:** 18 August 2026

Items marked **[CONFIRM]** are ones Brett needs to fill in — they depend on account
details not visible from the code.

---

## 1. What this site is

The website has two halves.

**The content** — every person, publication, project, page, the logo and the colours —
lives in a service called **Sanity**. You edit it through a web page called Studio, at
`holsingerlab.vercel.app/studio`. It works like any other web form. Nothing you do there
involves code.

**The code** — the design and the layout, the parts that don't change week to week — lives
on **GitHub** and is published by **Vercel**.

The important consequence: **you can change anything on the site yourself, without a
developer.** Edits appear on the live site about a minute after you press Publish. You only
need a developer to change how the site _works_ — a new type of page, a different layout.

---

## 2. What you now own

Five services. Four are free at this size; one may not be.

| Service       | What it does                                  | If the account lapses                         | Cost                       |
| ------------- | --------------------------------------------- | --------------------------------------------- | -------------------------- |
| **Sanity**    | Stores all content. The Studio you edit in.   | Site loses all its content. Most serious.     | Free tier **[CONFIRM]**    |
| **Vercel**    | Publishes the site and serves it to visitors. | Site goes offline.                            | Free (Hobby) **[CONFIRM]** |
| **GitHub**    | Stores the code.                              | Site keeps running, but no one can change it. | Free                       |
| **Formspree** | Delivers contact-form messages to email.      | Contact form stops sending. Nothing else.     | Free tier **[CONFIRM]**    |
| **Domain**    | The site's address.                           | Address stops working.                        | **[CONFIRM]** — see below  |

**About the domain.** The site is currently at `holsingerlab.vercel.app`, an address Vercel
provides free. **[CONFIRM]** whether a custom domain (e.g. `holsingerlab.org`) is also
registered — if so, note the registrar, the renewal date and the annual cost, because a
domain is the one thing here that expires silently and takes the site down when it does.

**Practical advice:** put the renewal dates in your calendar with a reminder a month ahead,
and make sure the account email is one you'll still read in five years.

---

## 3. The transfer checklist

Do these in order. **The golden rule: Damian gets full access and confirms it works
_before_ Brett is removed from anything.** Reversing that order can lock everyone out.

### Step 1 — Damian creates accounts (Damian, ~20 minutes)

Sign up at each of these, using **the same email address** for all four. Use an address
that will outlive any single staff member.

- github.com
- vercel.com — sign in with the GitHub account from above
- sanity.io/manage
- formspree.io

### Step 2 — Brett grants access (Brett, ~15 minutes)

| Service       | What to do                                                                |
| ------------- | ------------------------------------------------------------------------- |
| **GitHub**    | Repo → Settings → Collaborators → add Damian as **Admin**                 |
| **Vercel**    | Project → Settings → Members → add Damian as **Owner**                    |
| **Sanity**    | sanity.io/manage → project → Members → invite Damian as **Administrator** |
| **Formspree** | See Step 5 — handled differently                                          |

### Step 3 — Damian confirms access (Damian, ~10 minutes)

Before going further, check each one works. Sign in and confirm you can see:

- **Sanity Studio** — go to `/studio`, open any person, change something trivial, press
  Publish, then check the live site a minute later. Change it back.
- **Vercel** — you can see the project dashboard and its deployment history.
- **GitHub** — you can see the code and the repository settings.

**If any of these fail, stop and sort it out before Step 4.**

### Step 4 — Replace the access keys (both, ~20 minutes)

This step is easy to skip and causes a failure weeks later, so it's worth understanding.

The site uses several secret keys to talk to Sanity. Those keys were created under **Brett's
account**. They keep working right up until Brett's account is removed — and then the site
breaks, with nothing obviously connecting the two events.

So the keys must be **created fresh by Damian**, not copied across.

1. **Damian:** sanity.io/manage → project → API → Tokens. Create two tokens:
   - one named `read`, with **Viewer** permission
   - one named `write`, with **Editor** permission
2. **Damian:** Vercel → project → Settings → Environment Variables. Replace the values of
   `SANITY_API_READ_TOKEN` and `SANITY_API_WRITE_TOKEN` with the new tokens.
3. **Damian:** invent a new random password of at least 20 characters. Put it in Vercel as
   `SANITY_WEBHOOK_SECRET`, and put the _same_ value in sanity.io/manage → API → Webhooks →
   the existing webhook → Secret. **These two must match exactly or edits stop appearing on
   the site.**
4. **Damian:** Vercel → Deployments → the most recent one → Redeploy. Environment variables
   only take effect on a new deployment.
5. **Check:** edit something in Studio, publish, confirm it appears on the site within a
   minute or two.
6. **Brett:** only now, delete your old tokens in sanity.io/manage → API → Tokens.

### Step 5 — Move the contact form (Damian, ~10 minutes)

Formspree's free plan doesn't share forms between accounts, so rather than transferring,
create a new one.

1. In your own Formspree account, create a new form. Set the notification email to wherever
   contact messages should arrive.
2. Copy the form's ID — the part after `formspree.io/f/` in its endpoint.
3. Vercel → Settings → Environment Variables → set `FORMSPREE_ENDPOINT` to that ID.
4. Redeploy (as in Step 4.4), then send yourself a test message through the site's contact
   page and confirm it arrives.

### Step 6 — Transfer full ownership (both, ~10 minutes)

Only once everything above is confirmed working.

1. **Brett:** GitHub → repo → Settings → General → Danger Zone → **Transfer ownership** to
   Damian's account.
2. **Damian:** after the transfer, check Vercel → Settings → Git still shows the repository
   connected. If it's disconnected, reconnect it and authorise Vercel for your GitHub
   account. **A silent disconnection here means edits to the code stop publishing** — worth
   testing rather than assuming.
3. **Brett:** remove yourself from Sanity, Vercel and GitHub.
4. **Damian:** confirm you can still sign in to all three, and that the site is up.

### Step 7 — Write down where everything is (Damian, ~10 minutes)

Record the account email, and where the passwords are kept, somewhere a colleague could
find it if you were unavailable. A password manager shared with one trusted person is
ideal. This is the single most valuable ten minutes in this document.

---

## 4. Editing the site

Go to **`holsingerlab.vercel.app/studio`** and sign in.

The left-hand menu lists everything you can edit. Change a field, then press **Publish**
(bottom right). Changes reach the live site in about a minute. **Nothing is live until you
press Publish** — you can leave a draft half-finished and come back to it.

### Adding a person

**People** → the **+** button. Fill in name, role and photo. Two fields worth knowing:

- **Role Group** decides which heading they appear under on the People page (Postdocs, PhD
  Students, and so on). Groups are edited under **Role Groups**.
- **Give this person their own page** — off by default. Turn it on and they get a full
  profile page of their own; leave it off and they appear in the People grid only.

You can drag people up and down in the list to change the order they appear in.

### Adding a publication

There's a shortcut worth knowing. Create the publication, paste the **DOI** into the DOI
field, then click the small arrow next to the **Publish** button and choose **Fetch from
DOI**. The title, authors, journal, volume, issue, pages, date and abstract are all filled
in automatically from the publisher's records. Check what comes back, then Publish.

If a publication has no DOI, fill the fields in by hand.

### Changing the logo, colours or lab name

**Settings**, which has tabs across the top:

- **Identity** — the lab's name, and the image shown when someone shares a link on social
  media.
- **Branding** — logo, icon, brand colour, background tone.
- **Lab head** — who's featured, and whether they appear on the home page and People page.
- **Navigation** — which pages exist and the order of the menu.
- **Footer** — the text at the bottom of every page.

Any colour you choose is safe. The site automatically adjusts how light or dark it renders
so text stays readable, in both light and dark mode. There is no colour that produces an
unreadable page.

### One thing to be careful about

Under **Settings → Navigation**, the toggles for Publications, Team and Contact Us don't
just hide the page from the menu — they **remove the page from the site entirely**. Anyone
following an old link gets a "page not found" error. Turn one off only if you genuinely
want that page gone.

---

## 5. Giving other people access

You're the administrator of all three services, so you can add and remove people yourself.

| To let someone…                   | Go to                             | Give them         |
| --------------------------------- | --------------------------------- | ----------------- |
| Edit content (most lab members)   | sanity.io/manage → Members        | **Editor**        |
| Edit content _and_ manage members | sanity.io/manage → Members        | **Administrator** |
| Change the code (a developer)     | GitHub → Settings → Collaborators | **Write**         |
| Manage the hosting                | Vercel → Settings → Members       | **Member**        |

Most people only ever need the first one. A student who's writing up their profile needs
Sanity Editor and nothing else.

**When someone leaves, remove them the same day.** It takes thirty seconds in each service
and it's the kind of task that never gets done later.

---

## 6. When something looks wrong

| What you see                                | What's likely happening            | What to do                                                                                                                    |
| ------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Edit published, but the site hasn't changed | Usually just timing                | Wait 2 minutes and reload. If still wrong, check `SANITY_WEBHOOK_SECRET` matches in both Vercel and Sanity (Step 4.3)         |
| **The whole site is down**                  | Vercel outage, or a bad deployment | Check vercel-status.com. If Vercel is fine, go to Vercel → Deployments, find the last one that worked, and click **Rollback** |
| Contact-form messages not arriving          | Formspree                          | Check the Formspree dashboard — the message may be there but the notification email wrong. Check junk mail                    |
| Can't sign in to Studio                     | Your Sanity access                 | Sign in at sanity.io/manage. If you're not listed as a member, another administrator must re-add you                          |
| A page shows "page not found"               | Usually a toggle                   | Check Settings → Navigation — that page may have been switched off (see §4)                                                   |
| Site up but looks broken or unstyled        | A bad deployment                   | Vercel → Deployments → **Rollback** to the last working one                                                                   |

**Rollback is the safe move.** It restores the previous working version in about a minute
and changes no content. If something is badly wrong and you're not sure why, roll back
first and investigate afterwards.

---

## 7. Keeping it healthy

The site is built on other people's code — hundreds of small components maintained by other
people. Those get security updates, and this repository is set up to notice.

**You will get GitHub notifications about dependency updates.** A robot called Renovate opens
a request whenever something it watches has a new version, and GitHub separately emails about
security advisories. This is normal and it never stops.

**You don't need to act on these individually, and you shouldn't merge them yourself.** A
dependency update can break the site, which is why the automated tests exist. Someone needs to
read the result.

**What to do instead:** once a year, ask a developer to do a dependency refresh — update
everything, confirm all the tests still pass, fix whatever broke. It's roughly half a day's
work and it keeps the accumulation from becoming a rewrite.

**Where things stand today:** there are 15 known advisories in the site's dependencies (4 rated
high, 11 moderate). None are in code written for this site; all are in components it depends
on, and most are the kind that only matter for software handling untrusted input in ways this
site does not. They are worth clearing at the first maintenance pass, not worth an emergency.
**[CONFIRM]** whether Brett clears these before handover.

---

## 8. If you ever need a developer

The site is built so that ordinary work — content, people, publications, branding — never
needs one. You'd need a developer for a new type of page, a different layout, or if
something breaks that rollback doesn't fix.

**What to give them:** access to the GitHub repository, and point them at `README.md` and
the `docs/` folder. `docs/superpowers/` contains the full design record of every change
made during the 2026 rebuild — an unusually complete history for a site this size.

**What to tell them it's built with:** Next.js, TypeScript, Tailwind CSS and Sanity CMS.
All current, mainstream, widely known. Any competent web developer will recognise the whole
stack.

**What to expect:** a small change is a few hours' work. Ask for a fixed quote on a defined
piece of work rather than an open-ended arrangement. The code has automated tests that run
on every change, so ask them to make sure those still pass — that's the site's safety net.

**One thing to insist on:** they work on a copy and show you a preview link before anything
reaches the live site. Vercel creates one automatically for every change. Never let someone
edit the live site directly.

---

## Reference

Details a developer will ask for.

|                   |                                                                        |
| ----------------- | ---------------------------------------------------------------------- |
| Repository        | `github.com/where-is-brett/holsinger-lab` **[CONFIRM after transfer]** |
| Live site         | `holsingerlab.vercel.app`                                              |
| Studio            | `holsingerlab.vercel.app/studio`                                       |
| Sanity project ID | `j3f9z8os`                                                             |
| Sanity dataset    | `production`                                                           |
| Custom domain     | **[CONFIRM]**                                                          |

**Environment variables** are set in Vercel → Settings → Environment Variables. Full list
and explanation in `.env.local.example`. The secret ones are `SANITY_API_READ_TOKEN`,
`SANITY_API_WRITE_TOKEN`, `SANITY_WEBHOOK_SECRET` and `FORMSPREE_ENDPOINT` — these must
never be written into the code or shared outside the people who need them.
