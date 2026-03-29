import { CVContent } from '@/types/documents';

/**
 * Minimal CV Template
 * Ultra-minimal, single column, generous whitespace, clean typography
 */
export function minimalTemplate(content: CVContent): string {
  const contactParts: string[] = [];
  if (content.contactInfo.email) contactParts.push(content.contactInfo.email);
  if (content.contactInfo.phone) contactParts.push(content.contactInfo.phone);
  if (content.contactInfo.location) contactParts.push(content.contactInfo.location);
  if (content.contactInfo.linkedin) contactParts.push(content.contactInfo.linkedin);
  if (content.contactInfo.github) contactParts.push(content.contactInfo.github);
  if (content.contactInfo.website) contactParts.push(content.contactInfo.website);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.contactInfo.name} - CV</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4; margin: 0.75in 0.9in; }

    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.8;
      color: #222;
      background: white;
    }

    .name {
      font-size: 28pt;
      font-weight: 400;
      letter-spacing: 2px;
      color: #111;
      margin-bottom: 0.4em;
      text-transform: uppercase;
    }

    .contact {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9.5pt;
      color: #888;
      letter-spacing: 0.3px;
      margin-bottom: 2.5em;
    }

    .contact span + span::before { content: "  ·  "; color: #ccc; }

    .section { margin-bottom: 2.2em; }

    .section-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 8.5pt;
      font-weight: 600;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 1em;
      padding-bottom: 0.4em;
      border-bottom: 1px solid #eee;
    }

    .summary {
      font-size: 11pt;
      line-height: 1.9;
      color: #444;
    }

    .experience-item { margin-bottom: 1.6em; }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.2em;
    }

    .company { font-weight: 700; color: #111; font-size: 11pt; }
    .dates {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9.5pt;
      color: #999;
    }

    .role {
      font-style: italic;
      color: #555;
      font-size: 10.5pt;
      margin-bottom: 0.6em;
    }

    ul { margin-left: 1.3em; }
    li { margin-bottom: 0.35em; color: #333; }

    .education-item { margin-bottom: 1.2em; }
    .institution { font-weight: 700; color: #111; }
    .degree-line { color: #555; font-style: italic; font-size: 10.5pt; }
    .edu-meta {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9.5pt;
      color: #999;
    }

    .skills-line { color: #333; line-height: 2; }
    .skills-label { font-weight: 700; color: #111; margin-right: 0.5em; }

    .project-item { margin-bottom: 1.2em; }
    .project-name { font-weight: 700; color: #111; }
    .project-meta { font-size: 9.5pt; color: #999; font-style: italic; margin-bottom: 0.3em; }
    .project-desc { color: #444; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1 class="name">${content.contactInfo.name}</h1>
  <div class="contact">
    ${contactParts.map(p => `<span>${p}</span>`).join('')}
  </div>

  <!-- Summary -->
  <section class="section">
    <div class="section-title">Profile</div>
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

  <!-- Skills -->
  <section class="section">
    <div class="section-title">Skills</div>
    ${content.skills.technical.length > 0 ? `<p class="skills-line"><span class="skills-label">Technical</span>${content.skills.technical.join(', ')}</p>` : ''}
    ${content.skills.soft.length > 0 ? `<p class="skills-line"><span class="skills-label">Soft Skills</span>${content.skills.soft.join(', ')}</p>` : ''}
    ${content.skills.certifications && content.skills.certifications.length > 0 ? `<p class="skills-line"><span class="skills-label">Certifications</span>${content.skills.certifications.join(', ')}</p>` : ''}
  </section>

  <!-- Projects -->
  ${content.projects && content.projects.length > 0 ? `
  <section class="section">
    <div class="section-title">Projects</div>
    ${content.projects.map(p => `
    <div class="project-item">
      <div class="project-name">${p.name}</div>
      <div class="project-meta">${p.technologies.join(', ')}${p.link ? ` · ${p.link}` : ''}</div>
      <p class="project-desc">${p.description}</p>
    </div>
    `).join('')}
  </section>
  ` : ''}
</body>
</html>`;
}
