// Throwaway: extract public lab content from Sanity into brief/content.json for Claude Design mockups.
const PID = 'j3f9z8os', DS = 'production';
const pt = (blocks) => Array.isArray(blocks)
  ? blocks.filter(b => b._type === 'block').map(b => (b.children || []).map(c => c.text).join('')).join('\n').trim()
  : (blocks ?? null);
const img = (i) => i?.asset?.url ?? null;

const q = `{
  "settings": *[_type=="settings"][0]{siteName, shortName, "labHead": labHead->{name, role, slug}, showLabHeadOnHome, showLabHeadOnPeople, footer, "menu": menuItems[]->{_type, title, "slug": slug.current}},
  "home": *[_type=="home"][0]{title, overview, "showcase": showcaseProjects[]->{title, "slug": slug.current}},
  "people": *[_type=="profile"] | order(name asc){name, role, "roleGroup": roleGroup->{title, "slug": slug.current, order}, email, bio, fullBio, link, "slug": slug.current, hasPage, "image": image{asset->{url}, alt}},
  "publications": *[_type=="publication"] | order(date desc){title, author, journal, volume, issue, pages, doi, url, date, abstract, publicationDateDesc},
  "projects": *[_type=="project"] | order(title asc){title, "slug": slug.current, overview, category, status, tags, site, description, duration, "coverImage": coverImage{asset->{url}, alt}, "timeline": timeline{title, "count": count(milestones)}},
  "pages": *[_type=="page"]{title, "slug": slug.current, overview, "bodyPreview": body[0..2], "hasTimeline": defined(timeline)}
}`;
const r = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent(q)}`);
const { result: d } = await r.json();

const out = {
  _about: 'Real public content from the Holsinger Lab site (Sanity dataset), extracted 2026-08-19 for design mockups. Portable-text flattened to plain text.',
  site: {
    name: d.settings?.siteName ?? d.home?.title, shortName: d.settings?.shortName,
    tagline: pt(d.home?.overview), labHead: d.settings?.labHead ?? null,
    footer: pt(d.settings?.footer), menu: d.settings?.menu ?? [],
    showcaseProjects: (d.home?.showcase ?? []).map(p => p.title),
  },
  people: d.people.map(p => ({ name: p.name, role: p.role, roleGroup: p.roleGroup?.title ?? null, bio: pt(p.bio), fullBio: pt(p.fullBio), hasPage: p.hasPage ?? false, links: (p.link ?? []).map(l => l.href), image: img(p.image) })),
  publications: d.publications.map(p => ({ title: p.title, authors: p.author, journal: p.journal, volume: p.volume, issue: p.issue, pages: p.pages, doi: p.doi, url: p.url, date: p.date, abstract: pt(p.abstract) })),
  projects: d.projects.map(p => ({ title: p.title, slug: p.slug, category: p.category, status: p.status, tags: p.tags, site: p.site, duration: p.duration, overview: pt(p.overview), description: pt(p.description), coverImage: img(p.coverImage), timeline: p.timeline })),
  pages: d.pages.map(p => ({ title: p.title, slug: p.slug, overview: pt(p.overview), hasTimeline: p.hasTimeline, bodyPreview: pt(p.bodyPreview) })),
};
process.stdout.write(JSON.stringify(out, null, 1));
