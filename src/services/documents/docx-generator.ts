import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  BorderStyle,
} from 'docx';
import { CVContent } from '@/types/documents';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

/**
 * Generate DOCX from CV content using docx package
 */
export async function contentToDocx(cvContent: CVContent): Promise<Buffer> {
  try {
    logger.info('Generating DOCX from CV content');

    const sections: Paragraph[] = [];

    // Header: Name
    sections.push(
      new Paragraph({
        text: cvContent.contactInfo.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    // Contact Info (single line)
    const contactParts: string[] = [];
    if (cvContent.contactInfo.email) contactParts.push(cvContent.contactInfo.email);
    if (cvContent.contactInfo.phone) contactParts.push(cvContent.contactInfo.phone);
    if (cvContent.contactInfo.location) contactParts.push(cvContent.contactInfo.location);
    if (cvContent.contactInfo.linkedin) contactParts.push(cvContent.contactInfo.linkedin);
    if (cvContent.contactInfo.github) contactParts.push(cvContent.contactInfo.github);
    if (cvContent.contactInfo.website) contactParts.push(cvContent.contactInfo.website);

    sections.push(
      new Paragraph({
        text: contactParts.join(' • '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Professional Summary
    sections.push(
      new Paragraph({
        text: 'PROFESSIONAL SUMMARY',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: '333333',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    sections.push(
      new Paragraph({
        text: cvContent.summary,
        spacing: { after: 200 },
      })
    );

    // Experience
    if (cvContent.experience.length > 0) {
      sections.push(
        new Paragraph({
          text: 'PROFESSIONAL EXPERIENCE',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          border: {
            bottom: {
              color: '333333',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      for (const exp of cvContent.experience) {
        // Company & Position
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.company,
                bold: true,
              }),
              new TextRun({
                text: ' • ',
              }),
              new TextRun({
                text: exp.position,
                italics: true,
              }),
            ],
            spacing: { before: 100 },
          })
        );

        // Location & Dates
        const dateStr = exp.endDate
          ? `${exp.startDate} - ${exp.endDate}`
          : `${exp.startDate} - Present`;
        sections.push(
          new Paragraph({
            text: `${exp.location || ''} | ${dateStr}`,
            spacing: { after: 50 },
          })
        );

        // Highlights
        for (const highlight of exp.highlights) {
          sections.push(
            new Paragraph({
              text: highlight,
              bullet: {
                level: 0,
              },
              spacing: { after: 50 },
            })
          );
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          })
        );
      }
    }

    // Education
    if (cvContent.education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          border: {
            bottom: {
              color: '333333',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      for (const edu of cvContent.education) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.institution,
                bold: true,
              }),
              new TextRun({
                text: ' • ',
              }),
              new TextRun({
                text: `${edu.degree} in ${edu.field}`,
                italics: true,
              }),
            ],
            spacing: { before: 100 },
          })
        );

        const eduDetails: string[] = [];
        if (edu.location) eduDetails.push(edu.location);
        if (edu.endDate) eduDetails.push(edu.endDate);
        if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

        if (eduDetails.length > 0) {
          sections.push(
            new Paragraph({
              text: eduDetails.join(' | '),
              spacing: { after: 50 },
            })
          );
        }

        if (edu.honors && edu.honors.length > 0) {
          for (const honor of edu.honors) {
            sections.push(
              new Paragraph({
                text: honor,
                bullet: { level: 0 },
                spacing: { after: 50 },
              })
            );
          }
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          })
        );
      }
    }

    // Skills
    sections.push(
      new Paragraph({
        text: 'SKILLS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: '333333',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    if (cvContent.skills.technical.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Technical: ',
              bold: true,
            }),
            new TextRun({
              text: cvContent.skills.technical.join(', '),
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (cvContent.skills.soft.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Soft Skills: ',
              bold: true,
            }),
            new TextRun({
              text: cvContent.skills.soft.join(', '),
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (cvContent.skills.languages && cvContent.skills.languages.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Languages: ',
              bold: true,
            }),
            new TextRun({
              text: cvContent.skills.languages.join(', '),
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (cvContent.skills.certifications && cvContent.skills.certifications.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Certifications: ',
              bold: true,
            }),
            new TextRun({
              text: cvContent.skills.certifications.join(', '),
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // Projects (optional)
    if (cvContent.projects && cvContent.projects.length > 0) {
      sections.push(
        new Paragraph({
          text: 'PROJECTS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          border: {
            bottom: {
              color: '333333',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      for (const project of cvContent.projects) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: project.name,
                bold: true,
              }),
              new TextRun({
                text: project.link ? ` (${project.link})` : '',
              }),
            ],
            spacing: { before: 100 },
          })
        );

        sections.push(
          new Paragraph({
            text: project.description,
            spacing: { after: 50 },
          })
        );

        sections.push(
          new Paragraph({
            text: `Technologies: ${project.technologies.join(', ')}`,
            spacing: { after: 50 },
          })
        );

        for (const highlight of project.highlights) {
          sections.push(
            new Paragraph({
              text: highlight,
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          })
        );
      }
    }

    // Awards (optional)
    if (cvContent.awards && cvContent.awards.length > 0) {
      sections.push(
        new Paragraph({
          text: 'AWARDS & HONORS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          border: {
            bottom: {
              color: '333333',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      for (const award of cvContent.awards) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: award.title,
                bold: true,
              }),
              new TextRun({
                text: ` • ${award.issuer} • ${award.date}`,
              }),
            ],
            spacing: { before: 100 },
          })
        );

        if (award.description) {
          sections.push(
            new Paragraph({
              text: award.description,
              spacing: { after: 100 },
            })
          );
        }
      }
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    logger.info({
      sizeBytes: buffer.length,
    });

    return buffer;
  } catch (error) {
    logger.error({ error });
    throw new AppError('Failed to generate DOCX', 500, 'DOCX_GENERATION_FAILED');
  }
}
