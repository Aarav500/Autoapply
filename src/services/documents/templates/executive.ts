import { CVContent } from '@/types/documents';

/**
 * Executive CV Template
 * Bold header, two-column layout for skills/education, professional dark accent
 */
export function executiveTemplate(content: CVContent): string {
  const contactParts: string[] = [];
  if (content.contactInfo.email) contactParts.push(`<span>${content.contactInfo.email}</span>`);
  if (content.contactInfo.phone) contactParts.push(`<span>${content.contactInfo.phone}</span>`);
  if (content.contactInfo.location) contactParts.push(`<span>${content.contactInfo.location}</span>`);
  if (content.contactInfo.linkedin) contactParts.push(`<span>${content.contactInfo.linkedin}</span>`);
  if (content.contactInfo.github) contactParts.push(`<span>${content.contactInfo.github}</span>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.contactInfo.name} - CV</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4; margin: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #2d2d2d;
      background: white;
    }

    /* Bold header band */
    .header {
      background: #1a1a2e;
      color: white;
      padding: 0.55in 0.55in 0.4in;
    }

    .name {
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 0.1em;
    }

    .headline {
      font-size: 12pt;
      font-weight: 300;
      color: #a0a8d0;
      margin-bottom: 0.7em;
      letter-spacing: 0.5px;
    }

    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6em 1.5em;
      font-size: 9pt;
      color: #c0c8e8;
    }

    /* Two-column body */
    .body-wrapper {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 0;
      padding: 0.45in 0.55in;
    }

    .main-col { padding-right: 0.5in; }
    .side-col { border-left: 1px solid #e8e8ec; padding-left: 0.4in; }

    .section { margin-bottom: 1.5em; }

    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #1a1a2e;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 0.7em;
      padding-bottom: 0.3em;
      border-bottom: 2px solid #1a1a2e;
    }

    .side-section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #1a1a2e;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      margin-bottom: 0.6em;
      padding-bottom: 0.25em;
      border-bottom: 1px solid #ddd;
    }

    .summary {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #333;
      text-align: justify;
    }

    .experience-item { margin-bottom: 1.3em; page-break-inside: avoid; }

    .exp-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.1em;
    }

    .company {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .dates {
      font-size: 9pt;
      color: #888;
      white-space: nowrap;
    }

    .role {
      font-size: 10.5pt;
      font-weight: 600;
      color: #444;
      margin-bottom: 0.45em;
    }

    ul { margin-left: 1.1em; }
    li {
      margin-bottom: 0.25em;
      font-size: 10pt;
      color: #333;
    }

    /* Sidebar components */
    .skill-chip {
      display: inline-block;
      background: #f0f0f8;
      border: 1px solid #dde;
      color: #333;
      font-size: 8.5pt;
      padding: 0.15em 0.55em;
      border-radius: 2px;
      margin: 0.15em 0.2em 0.15em 0;
    }

    .edu-item { margin-bottom: 1em; }
    .edu-school { font-weight: 700; color: #1a1a2e; font-size: 10pt; }
    .edu-degree { font-size: 9.5pt; color: #555; font-style: italic; }
    .edu-year { font-size: 9pt; color: #999; }

    .cert-item {
      font-size: 9.5pt;
      color: #444;
      margin-bottom: 0.4em;
      padding-left: 0.7em;
      border-left: 2px solid #1a1a2e;
    }

    .project-item { margin-bottom: 1em; page-break-inside: avoid; }
    .project-name { font-weight: 700; color: #1a1a2e; font-size: 10.5pt; }
    .project-tech { font-size: 9pt; color: #888; margin-bottom: 0.25em; }
    .project-desc { font-size: 10pt; color: #444; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Header Band -->
  <header class="header">
    <div class="name">${content.contactInfo.name}</div>
    <div class="contact-bar">${contactParts.join('')}</div>
  </header>

  <div class="body-wrapper">
    <!-- Main Column -->
    <div class="main-col">
      <!-- Summary -->
      <section class="section">
        <div class="section-title">Executive Summary</div>
        <p class="summary">${content.summary}</p>
      </section>

      <!-- Experience -->
      ${content.experience.length > 0 ? `
      <section class="section">
        <div class="section-title">Professional Experience</div>
        ${content.experience.map(exp => `
        <div class="experience-item">
          <div class="exp-title-row">
            <span class="company">${exp.company}</span>
            <span class="dates">${exp.startDate} – ${exp.endDate || 'Present'}</span>
          </div>
          <div class="role">${exp.position}${exp.location ? ` · ${exp.location}` : ''}</div>
          <ul>
            ${exp.highlights.map(h => `<li>${h}</li>`).join('\n            ')}
          </ul>
        </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Projects -->
      ${content.projects && content.projects.length > 0 ? `
      <section class="section">
        <div class="section-title">Key Projects</div>
        ${content.projects.map(p => `
        <div class="project-item">
          <div class="project-name">${p.name}</div>
          <div class="project-tech">${p.technologies.join(' · ')}${p.link ? ` · ${p.link}` : ''}</div>
          <p class="project-desc">${p.description}</p>
        </div>
        `).join('')}
      </section>
      ` : ''}
    </div>

    <!-- Side Column -->
    <div class="side-col">
      <!-- Education -->
      ${content.education.length > 0 ? `
      <section class="section">
        <div class="side-section-title">Education</div>
        ${content.education.map(edu => `
        <div class="edu-item">
          <div class="edu-school">${edu.institution}</div>
          <div class="edu-degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</div>
          <div class="edu-year">${edu.endDate || 'Present'}${edu.gpa ? ` · GPA ${edu.gpa}` : ''}</div>
        </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Technical Skills -->
      ${content.skills.technical.length > 0 ? `
      <section class="section">
        <div class="side-section-title">Technical Skills</div>
        <div>
          ${content.skills.technical.map(s => `<span class="skill-chip">${s}</span>`).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Soft Skills -->
      ${content.skills.soft.length > 0 ? `
      <section class="section">
        <div class="side-section-title">Core Competencies</div>
        <div>
          ${content.skills.soft.map(s => `<span class="skill-chip">${s}</span>`).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Certifications -->
      ${content.skills.certifications && content.skills.certifications.length > 0 ? `
      <section class="section">
        <div class="side-section-title">Certifications</div>
        ${content.skills.certifications.map(c => `<div class="cert-item">${c}</div>`).join('')}
      </section>
      ` : ''}

      <!-- Awards -->
      ${content.awards && content.awards.length > 0 ? `
      <section class="section">
        <div class="side-section-title">Awards</div>
        ${content.awards.map(a => `
        <div class="cert-item">
          <strong>${a.title}</strong><br>${a.issuer} · ${a.date}
        </div>
        `).join('')}
      </section>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}
