import React from "react";

/* Real content from brief/content.json — 19 publications, 19 members.
   Do not invent people, papers or projects. */

export const PI_EMAIL = "damian.holsinger@sydney.edu.au";
export const IMG_BASE = "https://cdn.sanity.io/images/j3f9z8os/production/";
export const PI_IMG = IMG_BASE + "5801e44264c1a2308ecc8b6553d244e956cc0092-1018x970.png";

const RAW = [
  { y: "2025", t: "Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway.", a: "Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.", j: "Cell Death Discovery", r: "11(1) · 74", doi: "10.1038/s41420-025-02362-7", ty: "Article", tg: "Neuro-oncology & biomarkers", date: "23 February 2025" },
  { y: "2024", t: "Development of a Cell Culture Chamber for Investigating the Therapeutic Effects of Electrical Stimulation on Neural Growth.", a: "Huynh, Q-S. and Holsinger R.M.D.", j: "Biomedicines", r: "12(2) · 289", doi: "10.3390/biomedicines12020289", ty: "Article", tg: "Electrical stimulation & neural engineering" },
  { y: "2023", t: "INPP5D/SHIP1: Expression, Regulation and Roles in Alzheimer's Disease Pathophysiology.", a: "Olufunmilayo, E. and Holsinger, R.M.D.", j: "Genes", r: "14(10) · 1845", doi: "10.3390/genes14101845", ty: "Review", tg: "Glia & neuroinflammation" },
  { y: "2023", t: "Neuroprotective Effects of Carnosic Acid: Insight into its Mechanisms of Action", a: "Mirza, F., Zahid, S., Holsinger, R.M.D.", j: "Molecules", r: "28(5) · 2306", url: "https://www.mdpi.com/1420-3049/28/5/2306", ty: "Review", tg: "Metabolism, oxidative stress & neuroprotection" },
  { y: "2023", t: "Oxidative Stress and Antioxidants in Neurodegenerative Disorders", a: "Olufunmilayo, E., Gerke, M., Holsinger, R.M.D.", j: "Antioxidants", r: "12(2) · 517", url: "https://www.mdpi.com/2076-3921/12/2/517", ty: "Review", tg: "Metabolism, oxidative stress & neuroprotection" },
  { y: "2023", t: "Fiber and Electrical Field Alignment Increases BDNF Expression in SH-SY5Y Cells following Electrical Stimulation.", a: "Huynh Q-S, Holsinger RMD.", j: "Pharmaceuticals", r: "16(2) · 138", url: "https://www.mdpi.com/1424-8247/16/2/138", ty: "Article", tg: "Electrical stimulation & neural engineering" },
  { y: "2023", t: "The Role of Fecal Microbiota Transplantation in the Treatment of Neurodegenerative Diseases: A Review", a: "Matheson, J., Holsinger, R.M.D.", j: "International Journal of Molecular Sciences", r: "23(2) · 1001", url: "https://www.mdpi.com/1422-0067/24/2/1001", ty: "Review", tg: "Gut–brain & non-pharm therapies" },
  { y: "2022", t: "Fecal Microbiota Transplantation Reduces Pathology and Improves Cognition in a Mouse Model of Alzheimer's Disease", a: "Elangovan, S., Borody, T., Holsinger, R.M.D.", j: "Cells", r: "12(1) · 119", url: "https://www.mdpi.com/2073-4409/12/1/119", ty: "Article", tg: "Gut–brain & non-pharm therapies" },
  { y: "2022", t: "Non-Pharmacological Therapeutic Options for the Treatment of Alzheimer's Disease", a: "Huynh, Q-S., Elangovan, S., Holsinger, R.M.D.", j: "International Journal of Molecular Sciences", r: "23 · 11037", url: "https://www.mdpi.com/1422-0067/23/19/11037", ty: "Review", tg: "Gut–brain & non-pharm therapies" },
  { y: "2022", t: "Variant TREM2 Signaling in Alzheimer's Disease", a: "Olufunmilayo, E., Holsinger, R.M.D.", j: "Journal of Molecular Biology", r: "434(7) · 167470", doi: "10.1016/j.jmb.2022.167470", ty: "Review", tg: "Glia & neuroinflammation" },
  { y: "2021", t: "Diagnostic Conundrums in Cerebellar Cryptic Arteriovenous Malformations.", a: "Kwasi, V., Niwa, R., Hara, T., Holsinger, RMD.", j: "Journal of Neurology and Neuroscience", r: "12(5) · 368", url: "https://www.jneuro.com/abstract/diagnostic-conundrums-in-cerebellar-cryptic-arteriovenous-malformations-37612.html", ty: "Case report", tg: "Neuro-oncology & biomarkers" },
  { y: "2021", t: "Ground state depletion microscopy as a tool for studying microglia-synapse interactions", a: "Paasila PJ, Fok SYY, Flores-Rodriguez N, Sajjan S, Svahn AJ, Dennis CV, Holsinger RMD, Kril JJ, Becker TS, Banati RB, Sutherland GT, Graeber MB.", j: "Journal of Neuroscience Research", r: "99(6) · 1511–1532", doi: "10.1002/jnr.24819", ty: "Article", tg: "Glia & neuroinflammation" },
  { y: "2020", t: "Altered Brain Leptin and Leptin Receptor Expression in the 5XFAD Mouse Model of Alzheimer's Disease.", a: "Pratap, A., Holsinger, RMD.", j: "Pharmaceuticals", r: "13(11) · 1–15", url: "https://www.mdpi.com/1424-8247/13/11/401", ty: "Article", tg: "Metabolism, oxidative stress & neuroprotection" },
  { y: "2020", t: "In Vitro Biocompatibility of Piezoelectric K0.5Na0.5NbO3 Thin Films on Platinized Silicon Substrates.", a: "Gaukås NH, Huynh QS, Pratap AA, Einarsrud MA, Grande T, Holsinger RMD, Glaum J.", j: "ACS Applied Bio Materials", r: "3(12) · 8714–8721", doi: "10.1021/acsabm.0c01111", ty: "Article", tg: "Electrical stimulation & neural engineering" },
  { y: "2020", t: "Genome-Wide Integrative Analysis Reveals Common Molecular Signatures in Blood and Brain of Alzheimer's Disease.", a: "Rahman, M., Islam, T., Shahjaman, M., Rana, M., Holsinger, RMD., Quinn, J., Gov, E., Moni, M.", j: "Biointerface Research in Applied Chemistry", r: "11(2) · 8686–8701", doi: "10.33263/BRIAC112.86868701", ty: "Article", tg: "Neuro-oncology & biomarkers" },
  { y: "2020", t: "Altered Brain Adiponectin Receptor Expression in the 5XFAD Mouse Model of Alzheimer's Disease.", a: "Pratap, A., Holsinger, RMD.", j: "Pharmaceuticals", r: "13(7) · 1–13", url: "https://www.mdpi.com/1424-8247/13/7/150", ty: "Article", tg: "Metabolism, oxidative stress & neuroprotection" },
  { y: "2020", t: "Selective, high-contrast detection of syngeneic glioblastoma in vivo.", a: "Banati, R., Wilcox, P., Xu, R., Yin, G., Si, E., Son, E., Shimizu, M., Holsinger, RMD., Parmar, A., Zahra, D., Liu, G., Graeber, M.", j: "Scientific Reports", r: "10(1) · 9968", doi: "10.1038/s41598-020-67036-z", ty: "Article", tg: "Neuro-oncology & biomarkers" },
  { y: "2020", t: "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease.", a: "Elangovan, S., Holsinger, RMD.", j: "Biochimie", r: "38–42", doi: "10.1016/j.biochi.2020.02.003", ty: "Review", tg: "Glia & neuroinflammation" },
  { y: "2020", t: "Identification of molecular signatures and pathways to identify novel therapeutic targets in Alzheimer's disease: Insights from a systems biomedicine perspective.", a: "Rahman, M., Islam, T., Zaman, T., Shahjaman, M., Karim, M., Huq, F., Quinn, J., Holsinger, RMD., Gov, E., Moni, M.", j: "Genomics", r: "112(2) · 1290–1299", doi: "10.1016/j.ygeno.2019.07.018", ty: "Article", tg: "Neuro-oncology & biomarkers" },
];

const PI_RE = /Holsinger,?\s?R\.?\s?M\.?\s?D\.?/;

export const PUBLICATIONS = RAW.map(function (p) {
  const m = p.a.match(PI_RE);
  const i = m ? p.a.indexOf(m[0]) : -1;
  const linkHref = p.doi ? "https://doi.org/" + p.doi : p.url;
  let linkLabel = p.doi ? p.doi : p.url.replace(/^https?:\/\/(www\.)?/, "");
  if (linkLabel.length > 40) linkLabel = linkLabel.slice(0, 39) + "…";
  const linkLabelShort = linkLabel.length > 26 ? linkLabel.slice(0, 25) + "…" : linkLabel;
  return {
    year: p.y, title: p.t,
    authorsPre: i >= 0 ? p.a.slice(0, i) : p.a,
    authorsPI: i >= 0 ? m[0] : "",
    authorsPost: i >= 0 ? p.a.slice(i + m[0].length) : "",
    authors: p.a,
    journal: p.j, ref: p.r, date: p.date,
    linkKind: p.doi ? "DOI" : "URL",
    linkLabel: linkLabel, linkLabelShort: linkLabelShort, linkHref: linkHref,
    type: p.ty, topics: [p.tg],
    cite: p.a + " (" + p.y + "). " + p.t + (/[.?]$/.test(p.t) ? "" : ".") + " " + p.j + " " + p.r.replace(" · ", ", ") + ". " + linkHref,
  };
});

export const CBX7_ABSTRACT = [
  "Cancer stem cells (CSCs) are significant factors in the treatment resistance and recurrence of glioblastoma. Chromobox protein homolog 7 (CBX7) can inhibit the progression of various tumors, but its impact on the stem cell-like properties of glioblastoma cells remains unclear. Clinically, low levels of CBX7 are associated with poor prognosis and increased distant metastasis in glioblastoma patients, and this low expression is caused by methylation of the CBX7 promoter.",
  "Our current research indicates that CBX7 plays a key role in suppressing the stem-like phenotype of glioblastoma. In this study, through bioinformatics analysis, we found that CBX7 is the most significantly downregulated member of the CBX family in glioblastoma and is closely associated with the stem-like phenotype of glioblastoma cells. We show that CBX7 promotes the degradation of myosin heavy chain 9 (MYH9) protein through the ubiquitin-proteasome pathway via the polycomb repressive complex 1 (PRC1) and suppresses the stem-like phenotype of glioblastoma cells by inhibiting the nuclear factor kappa-B (NF-κB) signaling pathway. Furthermore, overexpression of MYH9 in glioblastoma cells reverses the inhibitory effects of CBX7 on migration, proliferation, invasion, and stemness of glioblastoma cells. In summary, CBX7 acts as a tumor suppressor by inhibiting the stem cell-like characteristics of glioblastoma. The CBX7-MYH9-NF-κB signaling axis may serve as a potential therapeutic target for glioblastoma.",
];

export const PI_BIO = [
  "Dr Holsinger is Head of the Laboratory of Molecular Neuroscience and Dementia at The University of Sydney in Australia. He is an academic with both teaching and research duties. He lectures in numerous areas of science and medicine including molecular biology, protein chemistry, biochemistry, cell biology, neuroscience, neurology and neurodegeneration.",
  "Dr Holsinger's research covers similar topics to those listed above with techniques expanding across cell, mouse models and human tissue.",
];

export const PEOPLE_GROUPS = [
  { label: "Research Scientists", count: "2", members: [
    { name: "Dr John Ng", role: "Research Scientist", img: IMG_BASE + "e45ffbfd1b246307ae3eb923e62f7f4eb41eb77e-447x447.jpg" },
    { name: "Dr Johnny Chan (DDS)", role: "Research Scientist", img: IMG_BASE + "6562b491fdf6a5a3d8b7842b2f2399d0c2463aed-554x554.jpg" },
  ] },
  { label: "PhD", count: "1", members: [
    { name: "Haochen Wu", role: "PhD Student", img: IMG_BASE + "8804e1e4206e971126b4ea1593388981dda21fb7-827x1157.jpg" },
  ] },
  { label: "Honours", count: "8", members: [
    { name: "Alan Yan", role: "Honours student (Diagnostic Radiography)", img: IMG_BASE + "090997071cf5eccb3713b9d0bdff96a02e6f6c11-974x1098.png" },
    { name: "Bede Taylor", role: "Honours Student (BioMedEng)", img: IMG_BASE + "57d47c618093b5cfb036e7a8786ecf2e04a5a0c0-1194x1379.jpg" },
    { name: "Eden Kim", role: "Honours Student (Biomedical Engineering)", img: IMG_BASE + "2996c84c1564a67f09d94da7b1171e1ecbf0f386-2571x2322.jpg" },
    { name: "Elizabeth Michel", role: "Honours student (Biomed Eng)", img: IMG_BASE + "553eeb7a2a986055121e8a19806abaeb2d89a58e-600x800.jpg" },
    { name: "Isaac Clark", role: "Honours Student (BioMedEng)", img: IMG_BASE + "91597fe233f81b2502a496a9b92f451c9829c395-800x788.jpg" },
    { name: "Shane Ting", role: "Honours Student (BioMedEng)", img: IMG_BASE + "eb6b607b6f2cbb372e11f9b0c41da348face14e1-450x800.jpg" },
    { name: "Sophia Moon", role: "Honours Student (BioMedEng)", img: IMG_BASE + "e3d6d84680062155162bdcd5976e6e68a4917c86-259x453.jpg" },
    { name: "Zara Broinowski", role: "Honours Student (Biomedical Engineering)", img: IMG_BASE + "6af8b1354b5bb15b741532cff9dd797d862fdb3c-1366x2048.png" },
  ] },
  { label: "Postgraduate research", count: "3", members: [
    { name: "Chelsea Lu", role: "Research Student - MD (UNSW)", img: IMG_BASE + "f40c75497ef8173b14f5ee6115c325637bfb3311-1351x1600.png" },
    { name: "Christabella Winata", role: "Research Student - MDiagRad", img: IMG_BASE + "1592b09fb1a3ef1eeb57a56d65173cd145c35510-587x679.png" },
    { name: "Tina Ouyang", role: "Research Student - BSc/MD", img: IMG_BASE + "4a67528c7951b022cf634b5a428bc5ba34e0415d-291x385.png" },
  ] },
  { label: "Undergraduate", count: "4", members: [
    { name: "Faith Ng", role: "BAppSci (Speech Pathology)", img: IMG_BASE + "94d8071351ec9124d72225b1c7deab4dd4e1d490-465x515.jpg" },
    { name: "Jiyoo Choi", role: "Ungergraduate student - Diagnostic Radiography", initials: "JC" },
    { name: "Noah Vassallo", role: "BAppSci (Diagnostic Radiography)", img: IMG_BASE + "537a5ab2b3f40c6faea37a95689667882517c219-600x800.jpg" },
    { name: "Sreevadana Venkitachalam", role: "BSc (Medical Sciences)", img: IMG_BASE + "f84ed6cc3e517afc2d315e2d359afe073324ba14-456x640.jpg" },
  ] },
  { label: "Visiting", count: "1", members: [
    { name: "Fritz Graham", role: "Study Abroad Student", img: IMG_BASE + "b5c894f59d1eebdcb4d52b427df29afa67ea51fa-450x800.jpg" },
  ] },
];
