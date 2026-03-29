import { CVContent } from '@/types/documents';

/**
 * Technical CV Template
 * Skills-first layout, monospace code-style typography, developer-focused
 */
export function technicalTemplate(content: CVContent): string {
  const contactParts: string[] = [];
  if (content.contactInfo.email) contactParts.push(content.contactInfo.email);
  if (content.contactInfo.phone) contactParts.push(content.contactInfo.phone);
  if (content.contactInfo.location) contactParts.push(content.contactInfo.location);
  if (content.contactInfo.github) contactParts.push(content.contactInfo.github);
  if (content.contactInfo.linkedin) contactParts.push(content.contactInfo.linkedin);
  if (content.contactInfo.website) contactParts.push(content.contactInfo.website);

  const allTech = [
    ...content.skills.technical,
    ...(content.skills.certifications || []),
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.contactInfo.name} - CV</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4; margin: 0.5in 0.55in; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #1e1e2e;
      background: white;
    }

    /* Header */
    .header { margin-bottom: 1.2em; padding-bottom: 0.9em; border-bottom: 3px solid #0f0f1a; }

    .name {
      font-size: 22pt;
      font-weight: 800;
      color: #0f0f1a;
      letter-spacing: -0.5px;
      margin-bottom: 0.15em;
    }

    .name-accent {
      display: inline-block;
      background: #0f0f1a;
      color: white;
      padding: 0 0.18em;
      border-radius: 2px;
    }

    .contact {
      font-family: "Courier New", Courier, monospace;
      font-size: 9pt;
      color: #666;
      margin-bottom: 0.5em;
    }

    .contact span + span::before { content: " | "; color: #bbb; }

    /* Skills banner — comes first */
    .skills-banner {
      background: #f4f4f8;
      border-left: 4px solid #0f0f1a;
      padding: 0.6em 0.8em;
      margin-bottom: 1.3em;
      font-family: "Courier New", Courier, monospace;
    }

    .skills-banner-title {
      font-size: 8pt;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 0.5em;
    }

    .tech-tags { display: flex; flex-wrap: wrap; gap: 0.3em; }

    .tag {
      display: inline-block;
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      color: #1e1e2e;
      background: white;
      border: 1px solid #ccd;
      padding: 0.1em 0.45em;
      border-radius: 2px;
    }

    .tag.primary { background: #0f0f1a; color: white; border-color: #0f0f1a; }

    /* Section */
    .section { margin-bottom: 1.3em; }

    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #0f0f1a;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 0.6em;
      display: flex;
      align-items: center;
      gap: 0.5em;
    }

    .section-title::before {
      content: "//";
      font-family: "Courier New", Courier, monospace;
      color: #aab;
      font-weight: 400;
    }

    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #dde;
      margin-left: 0.5em;
    }

    .summary {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #333;
    }

    .experience-item { margin-bottom: 1.2em; page-break-inside: avoid; }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.1em;
    }

    .company { font-size: 11pt; font-weight: 700; color: #0f0f1a; }

    .dates {
      font-family: "Courier New", Courier, monospace;
      font-size: 9pt;
      color: #888;
    }

    .role { font-size: 10pt; color: #555; margin-bottom: 0.4em; }

    .exp-techs {
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      color: #666;
      margin-bottom: 0.4em;
      font-style: italic;
    }

    ul { margin-left: 0; list-style: none; }

    li {
      margin-bottom: 0.25em;
      color: #333;
      font-size: 10pt;
      padding-left: 1.2em;
      position: relative;
    }

    li::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #888;
      font-size: 8pt;
      top: 0.15em;
    }

    .education-item { margin-bottom: 0.8em; }
    .institution { font-weight: 700; color: #0f0f1a; }
    .degree-line { font-size: 10pt; color: #555; }
    .edu-meta {
      font-family: "Courier New", Courier, monospace;
      font-size: 9pt;
      color: #999;
    }

    .project-item { margin-bottom: 1em; page-break-inside: avoid; }

    .project-header { display: flex; align-items: baseline; gap: 0.8em; margin-bottom: 0.2em; }
    .project-name { font-weight: 700; color: #0f0f1a; font-size: 10.5pt; }
    .project-link {
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      color: #888;
      text-decoration: none;
    }

    .project-tech {
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      color: #666;
      margin-bottom: 0.3em;
    }

    .project-desc { font-size: 10pt; color: #444; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="name">${content.contactInfo.name}</div>
    <div class="contact">
      ${contactParts.map(p => `<span>${p}</span>`).join('')}
    </div>
  </header>

  <!-- Skills First (tech-focused) -->
  ${allTech.length > 0 ? `
  <div class="skills-banner">
    <div class="skills-banner-title">Tech Stack</div>
    <div class="tech-tags">
      ${allTech.slice(0, 8).map(s => `<span class="tag primary">${s}</span>`).join('')}
      ${allTech.slice(8).map(s => `<span class="tag">${s}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Summary -->
  <section class="section">
    <div class="section-title">About</div>
    <p class="summary">${content.summary}</p>
  </section>

  <!-- Experience -->
  ${content.experience.length > 0 ? `
  <section class="section">
    <div class="section-title">Experience</div>
    ${content.experience.map(exp => `
    <div class="experience-item">
      <div class="exp-header">
        <span class="company">${exp.company}</span>
        <span class="dates">${exp.startDate} – ${exp.endDate || 'Present'}</span>
      </div>
      <div class="role">${exp.position}${exp.location ? ` · ${exp.location}` : ''}</div>
      <ul>
        ${exp.highlights.map(h => `<li>${h}</li>`).join('\n        ')}
      </ul>
    </div>
    `).join('')}
  </section>
  ` : ''}

  <!-- Projects -->
  ${content.projects && content.projects.length > 0 ? `
  <section class="section">
    <div class="section-title">Projects</div>
    ${content.projects.map(p => `
    <div class="project-item">
      <div class="project-header">
        <span class="project-name">${p.name}</span>
        ${p.link ? `<span class="project-link">${p.link}</span>` : ''}
      </div>
      <div class="project-tech">${p.technologies.join(' · ')}</div>
      <p class="project-desc">${p.description}</p>
      ${p.highlights.length > 0 ? `<ul>${p.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  <!-- Education -->
  ${content.education.length > 0 ? `
  <section class="section">
    <div class="section-title">Education</div>
    ${content.education.map(edu => `
    <div class="education-item">
      <div class="institution">${edu.institution}</div>
      <div class="degree-line">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</div>
      <div class="edu-meta">${edu.endDate || 'Present'}${edu.gpa ? ` · GPA ${edu.gpa}` : ''}</div>
    </div>
    `).join('')}
  </section>
  ` : ''}

  <!-- Soft Skills -->
  ${content.skills.soft.length > 0 ? `
  <section class="section">
    <div class="section-title">Soft Skills</div>
    <div class="tech-tags">
      ${content.skills.soft.map(s => `<span class="tag">${s}</span>`).join('')}
    </div>
  </section>
  ` : ''}
</body>
</html>`;
}
