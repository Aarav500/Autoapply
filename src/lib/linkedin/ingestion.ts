import './polyfills';
import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { LinkedInSnapshot, LinkedInSnapshotSchema } from './profile-graph';

export async function parseLinkedInPDF(buffer: Buffer): Promise<LinkedInSnapshot> {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = data.text;

    // Always call destroy() to free memory as per v2 docs
    await parser.destroy();

    // Extraction logic (Heuristics for LinkedIn Profile PDF)
    const snapshot: Partial<LinkedInSnapshot> = {
        positions: [],
        education: [],
        skills: [],
        projects: [],
    };

    // Basic regex-based extraction (simplified for MVP)
    const nameMatch = text.match(/^([^\n]+)/);
    if (nameMatch) snapshot.fullName = nameMatch[1].trim();

    const headlineMatch = text.match(/\n([^\n]+)\n[^\n]*LinkedIn Profile/);
    if (headlineMatch) snapshot.headline = headlineMatch[1].trim();

    // Experience Section
    const experienceSplit = text.split(/Experience\n/i);
    if (experienceSplit.length > 1) {
        const experienceText = experienceSplit[1].split(/Education\n|Projects\n|Skills\n/i)[0];
        const lines = experienceText.split('\n').filter((l: string) => l.trim().length > 0);

        // Naive experience parsing
        for (let i = 0; i < lines.length; i += 3) {
            if (lines[i] && lines[i + 1]) {
                snapshot.positions?.push({
                    title: lines[i].trim(),
                    company: lines[i + 1].trim(),
                    isCurrent: i === 0,
                    highlights: [],
                });
            }
        }
    }

    // Skills
    const skillsSplit = text.split(/Skills\n/i);
    if (skillsSplit.length > 1) {
        const skillsText = skillsSplit[1].split(/Education\n|Projects\n|Languages\n/i)[0];
        snapshot.skills = skillsText.split('\n')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && !s.includes('·'));
    }

    return LinkedInSnapshotSchema.parse(snapshot);
}

export async function parseLinkedInHTML(html: string): Promise<LinkedInSnapshot> {
    const $ = cheerio.load(html);

    const snapshot: Partial<LinkedInSnapshot> = {
        positions: [],
        education: [],
        skills: [],
        projects: [],
    };

    snapshot.fullName = $('.pv-top-card-section__name, .text-heading-xlarge').first().text().trim();
    snapshot.headline = $('.pv-top-card-section__headline, .text-body-medium').first().text().trim();
    snapshot.about = $('#about').next('.display-flex').find('.pv-shared-text-with-see-more').text().trim() ||
        $('.pv-about-section .pv-shared-text-with-see-more').text().trim();

    // Positions
    $('.experience-section li, .pvs-list__item--line-separated').each((_, el) => {
        const title = $(el).find('.display-flex.align-items-center.mr1 span[aria-hidden="true"]').first().text().trim();
        const company = $(el).find('.t-14.t-normal span[aria-hidden="true"]').first().text().trim();
        if (title && company) {
            snapshot.positions?.push({
                title,
                company,
                isCurrent: $(el).text().includes('Present'),
                highlights: [],
            });
        }
    });

    // Skills
    $('.pv-skill-categories-section__top-skills-list-item, .pv-skill-category-entity__name').each((_, el) => {
        const skill = $(el).text().trim();
        if (skill && !snapshot.skills?.includes(skill)) {
            snapshot.skills?.push(skill);
        }
    });

    return LinkedInSnapshotSchema.parse(snapshot);
}
