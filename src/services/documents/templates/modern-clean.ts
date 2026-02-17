import { CVContent } from '@/types/documents';

/**
 * Modern Clean CV Template
 * Professional, ATS-friendly, single-column layout
 * Uses inline CSS and system fonts only
 */
export function modernCleanTemplate(content: CVContent): string {
  const contactParts: string[] = [];
  if (content.contactInfo.email) contactParts.push(content.contactInfo.email);
  if (content.contactInfo.phone) contactParts.push(content.contactInfo.phone);
  if (content.contactInfo.location) contactParts.push(content.contactInfo.location);
  if (content.contactInfo.linkedin) contactParts.push(content.contactInfo.linkedin);
  if (content.contactInfo.github) contactParts.push(content.contactInfo.github);
  if (content.contactInfo.website) contactParts.push(content.contactInfo.website);

  const contactLine = contactParts.join(' • ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.contactInfo.name} - CV</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 0.5in;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      background: white;
    }

    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 1.5em;
      padding-bottom: 0.5em;
    }

    .name {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 0.5px;
      margin-bottom: 0.3em;
    }

    .contact {
      font-size: 10pt;
      color: #666;
      line-height: 1.4;
    }

    /* Section Headings */
    .section {
      margin-bottom: 1.2em;
    }

    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a2e;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5em;
      padding-bottom: 0.3em;
      border-bottom: 2px solid #333;
    }

    /* Summary */
    .summary {
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      text-align: justify;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 1em;
      page-break-inside: avoid;
    }

    .job-header {
      margin-bottom: 0.3em;
    }

    .company-name {
      font-size: 12pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .job-title {
      font-size: 11pt;
      font-weight: 600;
      color: #333;
      font-style: italic;
    }

    .job-meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 0.4em;
    }

    .highlights {
      margin-left: 1.2em;
      list-style-type: disc;
    }

    .highlights li {
      margin-bottom: 0.3em;
      padding-left: 0.3em;
    }

    /* Education */
    .education-item {
      margin-bottom: 0.8em;
      page-break-inside: avoid;
    }

    .institution {
      font-size: 12pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .degree {
      font-size: 11pt;
      font-weight: 600;
      color: #333;
      font-style: italic;
    }

    .education-meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 0.3em;
    }

    .honors {
      margin-left: 1.2em;
      list-style-type: disc;
      margin-top: 0.3em;
    }

    .honors li {
      margin-bottom: 0.2em;
      font-size: 10pt;
    }

    /* Skills */
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5em;
    }

    .skill-category {
      margin-bottom: 0.4em;
    }

    .skill-label {
      font-weight: 700;
      color: #1a1a2e;
      display: inline;
    }

    .skill-list {
      display: inline;
      color: #333;
    }

    /* Projects */
    .project-item {
      margin-bottom: 1em;
      page-break-inside: avoid;
    }

    .project-name {
      font-size: 12pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .project-link {
      font-size: 10pt;
      color: #666;
      font-style: italic;
    }

    .project-description {
      font-size: 10pt;
      color: #333;
      margin-bottom: 0.3em;
    }

    .project-tech {
      font-size: 10pt;
      color: #666;
      margin-bottom: 0.3em;
      font-style: italic;
    }

    /* Awards */
    .award-item {
      margin-bottom: 0.6em;
      page-break-inside: avoid;
    }

    .award-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .award-meta {
      font-size: 10pt;
      color: #666;
    }

    .award-description {
      font-size: 10pt;
      color: #333;
      margin-top: 0.2em;
    }

    /* Print optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1 class="name">${content.contactInfo.name}</h1>
      <div class="contact">${contactLine}</div>
    </header>

    <!-- Professional Summary -->
    <section class="section">
      <h2 class="section-title">Professional Summary</h2>
      <p class="summary">${content.summary}</p>
    </section>

    <!-- Professional Experience -->
    ${
      content.experience.length > 0
        ? `
    <section class="section">
      <h2 class="section-title">Professional Experience</h2>
      ${content.experience
        .map(
          (exp) => `
        <div class="experience-item">
          <div class="job-header">
            <span class="company-name">${exp.company}</span>
            <span> • </span>
            <span class="job-title">${exp.position}</span>
          </div>
          <div class="job-meta">
            ${exp.location ? `${exp.location} | ` : ''}${exp.startDate} - ${exp.endDate || 'Present'}
          </div>
          <ul class="highlights">
            ${exp.highlights.map((h) => `<li>${h}</li>`).join('\n            ')}
          </ul>
        </div>
      `
        )
        .join('\n')}
    </section>
    `
        : ''
    }

    <!-- Education -->
    ${
      content.education.length > 0
        ? `
    <section class="section">
      <h2 class="section-title">Education</h2>
      ${content.education
        .map(
          (edu) => `
        <div class="education-item">
          <div>
            <span class="institution">${edu.institution}</span>
            <span> • </span>
            <span class="degree">${edu.degree} in ${edu.field}</span>
          </div>
          <div class="education-meta">
            ${edu.location ? `${edu.location} | ` : ''}${edu.endDate || 'Present'}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
          </div>
          ${
            edu.honors && edu.honors.length > 0
              ? `
          <ul class="honors">
            ${edu.honors.map((h) => `<li>${h}</li>`).join('\n            ')}
          </ul>
          `
              : ''
          }
        </div>
      `
        )
        .join('\n')}
    </section>
    `
        : ''
    }

    <!-- Skills -->
    <section class="section">
      <h2 class="section-title">Skills</h2>
      <div class="skills-grid">
        ${
          content.skills.technical.length > 0
            ? `
        <div class="skill-category">
          <span class="skill-label">Technical:</span>
          <span class="skill-list">${content.skills.technical.join(', ')}</span>
        </div>
        `
            : ''
        }
        ${
          content.skills.soft.length > 0
            ? `
        <div class="skill-category">
          <span class="skill-label">Soft Skills:</span>
          <span class="skill-list">${content.skills.soft.join(', ')}</span>
        </div>
        `
            : ''
        }
        ${
          content.skills.languages && content.skills.languages.length > 0
            ? `
        <div class="skill-category">
          <span class="skill-label">Languages:</span>
          <span class="skill-list">${content.skills.languages.join(', ')}</span>
        </div>
        `
            : ''
        }
        ${
          content.skills.certifications && content.skills.certifications.length > 0
            ? `
        <div class="skill-category">
          <span class="skill-label">Certifications:</span>
          <span class="skill-list">${content.skills.certifications.join(', ')}</span>
        </div>
        `
            : ''
        }
      </div>
    </section>

    <!-- Projects -->
    ${
      content.projects && content.projects.length > 0
        ? `
    <section class="section">
      <h2 class="section-title">Projects</h2>
      ${content.projects
        .map(
          (project) => `
        <div class="project-item">
          <div>
            <span class="project-name">${project.name}</span>
            ${project.link ? `<span class="project-link"> (${project.link})</span>` : ''}
          </div>
          <p class="project-description">${project.description}</p>
          <p class="project-tech">Technologies: ${project.technologies.join(', ')}</p>
          <ul class="highlights">
            ${project.highlights.map((h) => `<li>${h}</li>`).join('\n            ')}
          </ul>
        </div>
      `
        )
        .join('\n')}
    </section>
    `
        : ''
    }

    <!-- Awards -->
    ${
      content.awards && content.awards.length > 0
        ? `
    <section class="section">
      <h2 class="section-title">Awards & Honors</h2>
      ${content.awards
        .map(
          (award) => `
        <div class="award-item">
          <div class="award-title">${award.title}</div>
          <div class="award-meta">${award.issuer} • ${award.date}</div>
          ${award.description ? `<p class="award-description">${award.description}</p>` : ''}
        </div>
      `
        )
        .join('\n')}
    </section>
    `
        : ''
    }
  </div>
</body>
</html>`;
}
