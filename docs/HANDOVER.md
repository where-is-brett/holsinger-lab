# Your lab website: handover guide

For Damian Holsinger: choosing the design, taking over the accounts, and editing the site
yourself. No code needed.

The site's words, people, papers and pictures are stored in **Sanity**. You edit them in
**Studio**, a set of web forms at **holsingerlab.vercel.app/studio**. The design is code, kept on
**GitHub** and put online by **Vercel**.

---

## 1. Pick a design

Both designs are finished and show the same content, so anything you edit appears in
whichever you choose. Neither link changes the live site.

- **Classic**, matching your Wix site:
  https://holsingerlab-git-redesign-wix-whereisbretts-projects.vercel.app
- **Redesign**, a newer layout built around publications and research:
  https://holsingerlab-git-redesign-integration-whereisbretts-projects.vercel.app

|                  | Classic                                                  | Redesign                                                    |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Pages            | Home, Research, News, Publications, Team, Media, Contact | Home, Publications, Research, Resources, People, Contact    |
| Publications     | Copy any citation, or download BibTeX or RIS             | Filters, a page for every paper, and a copy-citation button |
| People           | One Team page                                            | One People page, plus an optional page for each person      |
| Doesn't include  | A Resources page                                         | News or Media pages                                         |
| Contact page     | Your address, email and phone                            | A contact form that emails you                              |
| Logo and colours | Fixed to match Wix                                       | You can change them                                         |

Look through both, on your phone too, then reply to Brett with **classic** or **redesign**.
Where this guide says "classic only" or "redesign only", skip it if it's not the one you chose.

---

## 2. What you'll own

All of these are free. There is no custom web address to renew.

| Account                       | What it holds                                        | If it's lost or lapses                                    |
| ----------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| **Sanity**                    | All content, and Studio                              | The site loses its content. The most important one.       |
| **Vercel**                    | Puts the site online                                 | The site goes offline.                                    |
| **GitHub**                    | The design code (public, but only you can change it) | The site keeps working, but no one can change the design. |
| **Formspree** (redesign only) | Sends contact-form messages to your email            | The contact form stops. Nothing else.                     |

Use one email address for all of them, and make it one you'll still read in five years.

---

## 3. Taking over the accounts

Brett will do these with you, in order. **The rule: you get access and check it works before
Brett is removed from anything.**

**Step 1. Create your accounts.** You, 20 minutes.

Sign up at **github.com**, then **vercel.com** (choose **Continue with GitHub** and the free
**Hobby** plan), then **sanity.io/manage**. Redesign only: also **formspree.io**. Done when you
can sign in to each. Send Brett your GitHub username.

**Step 2. Brett adds you.** Brett, 10 minutes.

Accept the two invitation emails (GitHub and Sanity). Done when you can sign in at
**holsingerlab.vercel.app/studio** and see the content.

**Step 3. Check you can edit.** You, 5 minutes.

In Studio, open any person in **People**, change one letter of their **Bio**, and click
**Publish**. A minute later, reload the live site and check the change is there. Change it
back and publish again. If it doesn't work, stop and tell Brett.

**Step 4. Move the accounts to you.** Both of you, 20 minutes.

1. **Code.** Brett transfers it to your GitHub account. Accept from the email. The invitation
   expires after a day.
2. **Hosting.** Brett sends you a link. Open it while signed in to Vercel and accept. The link
   lasts 24 hours. Then open the project, then **Settings**, then **Git**. It should name
   `holsinger-lab` (the code). It almost always does; if not, click **Connect** and pick
   `holsinger-lab`.
3. **Content.** Brett moves the Sanity project into your Sanity organisation. He may ask you
   to add him to it for a few minutes.

Done when the site shows in all three accounts and still loads.

**Step 5. Replace the secret keys.** You, with Brett, 20 minutes.

The site uses two private passwords to fetch content from Sanity. Brett's stop working when he
leaves, so you make new ones, with Brett alongside. A mistake here only stops new edits
appearing; the site stays up.

1. In **sanity.io/manage**, open the project, then **API**, then **Tokens**. Click
   **Add API token**. Name it `read` and choose **Viewer**. Copy the token now, because it's
   shown only once.
2. In **Vercel**, open the project, then **Settings**, then **Environment Variables**. Edit
   `SANITY_API_READ_TOKEN`, paste the token, and save.
3. Make up a long random password (20 characters or more). In Vercel, edit
   `SANITY_WEBHOOK_SECRET` and paste it. In Sanity, go to **API**, then **Webhooks**, edit the
   webhook, and paste the same password as its **Secret**. Paste both from the same copy rather
   than typing it. **The two must match exactly, or your edits stop appearing.**
4. In Vercel, open **Deployments**. On the top one, click the **⋯** menu, then **Redeploy**.
5. Repeat the Step 3 test. If the edit appears, the passwords match.

Done when the test edit appears. Brett then deletes his old ones.

**Step 6. Contact form.** Redesign only. You, 10 minutes.

1. In **Formspree**, create a new form and set it to email you.
2. Copy the form's ID. In an address like `https://formspree.io/f/xyzabcde`, it's `xyzabcde`.
3. In Vercel, edit `FORMSPREE_ENDPOINT`, paste the ID, and save. Redeploy as in Step 5.4.
4. Send yourself a message from the site's **Contact** page.

Done when the message arrives.

**Step 7. Brett steps out.** Brett, 5 minutes.

Brett removes himself from every account; remove him from your Sanity organisation. Done when
you can still sign in everywhere and the site is up.

**Step 8. Write it down.** You, 10 minutes.

Record the account email and where the passwords are kept, somewhere a colleague could find
it. A password manager shared with one trusted person is ideal.

---

## 4. Editing the site

Sign in at **holsingerlab.vercel.app/studio**. Everything you can edit is in the list on the
left. To add something, click an entry, then the **+** button at the top of the next column.
(The **Media** tab at the very top is the picture library, not the **Media** list.)

**Add a person.** **People**, then **+**. Fill in **Name**, **Role** (the words on their
card), **Role Group** (the heading they sit under) and **Image**, then **Publish**. Redesign
only: for a page of their own, turn on **Give this person their own page** and click
**Generate** next to **Slug** (the page's web address).

**Move someone to alumni.** Set their **Role Group** to **Lab Alumni** and **Publish**.

**Add a publication.** **Publication**, then **+**.

1. Paste the DOI into **DOI**, like `10.1038/s41420-025-02362-7` (not the `https://doi.org`
   part).
2. Click the small menu button beside **Publish** and choose **Fetch from DOI**. Check the
   details it shows, then confirm. Title, authors, journal, date and abstract fill in.
3. Click **Generate** next to **Slug**.
4. Redesign only: choose **Type** and **Topics**. Turn on **Featured** to show it on the home
   page.
5. **Publish**. Papers sort themselves by date. No DOI? Fill in the fields by hand.

**Add news.** Classic only. **News**, then **+**. Fill in **Headline**, **Home page text**
and **News page sentence**. Two switches choose where it shows. **Publish**.

**Add media.** Classic only. **Media**, then **+**. Fill in **Title**, **Outlet** and
**Date**. Paste a YouTube address into **Link** and the video plays on the page; any other
link shows as a link. **Publish**.

**Change the home-page text.** **Site copy**, then **About the laboratory**. Classic also
uses **Home page banner** (picture and heading) and the Team and Contact page introductions.

**Add a resource.** Redesign only. **Resource**, then **+**. Fill in **Title**, **Kind**,
**Summary**, **Source paper** and **How to obtain**. **Publish**.

**Change the order.** In **People**, **News**, **Media** and **Role Groups**, drag items up
or down; new ones start at the bottom. For research, open the project in **Project** and set
**Position on the Research page** (1 is first; empty takes it off the page).

**Hide a page.** Redesign only. **Settings**, then the **Navigation** tab. Turn off **Enable
Publications page**, **Enable Team page** (the People page) or **Enable Contact Us page**.
This removes the page completely, not just its menu link. Neither design uses **Menu Item
list**; ignore it.

**Change the lab head, logo or colours.** **Settings**:

- **Lab head** tab: choose the person. The redesign shows them at the top of People and on the
  home page (two switches). The classic leaves them off the Team page.
- **Identity** tab: **Site name**, the lab's name in the header and browser tab.
- **Branding** tab: **Icon** (the browser-tab picture) works in both. **Logo**, **Brand
  colour** and **Background tone** are redesign only. Any colour stays readable.
- **Contact** tab: your address, email and phone. The redesign uses the email only.

---

## 5. Saving and publishing

Studio saves as you type, as a private draft you can come back to. **Nothing changes on the
site until you click Publish.** After that, the site updates within about a minute. **Unpublish** (in the menu beside
**Publish**) takes something off the site without deleting it.

---

## 6. Giving someone else access

In **sanity.io/manage**, open the project, then **Members**, then **Invite**. Choose **Editor**
for someone who edits content. That's all most people need.

A developer also needs access to the code: on GitHub, open the repository, then **Settings**,
then **Collaborators**.

When someone leaves the lab, remove them the same day.

---

## 7. If something looks wrong

1. **A change isn't showing.** Wait two minutes and reload. Check you clicked **Publish**.
2. **A page has disappeared.** Check the switches in **Settings**, **Navigation** (Section 4).
3. **No edits appear at all.** The two passwords from Step 5.3 probably don't match. Redo it.
4. **The site is down or looks broken.** In Vercel, open **Deployments** and find the one
   dated before it broke. Click its **⋯** and choose **Instant Rollback**. This changes no
   content. Then contact a developer.
5. **Contact messages aren't arriving** (redesign). Check your Formspree dashboard and your junk
   mail.

---

## 8. Once a year, and if you need a developer

**Ignore GitHub's update emails.** They suggest updates to the parts the site is built from,
and accepting one yourself could break it. Instead, once a year, pay a developer for about half
a day to update everything and check the automated tests still pass.

**You need a developer only** to change the design or layout, or to fix something a rollback
doesn't. Give them access to the code (Section 6); they'll find the notes they need there.
The site uses Next.js and Sanity, which most web developers know. Ask for a fixed quote and a
preview link before anything goes live. Tell them never to run `npm audit fix --force` here.

**Optional, no action needed:** a web address of the lab's own (about $15 a year) would keep
links working if the site ever moved away from `holsingerlab.vercel.app`.
