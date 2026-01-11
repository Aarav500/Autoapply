import './polyfills';
import * as cheerio from 'cheerio';
import { LinkedInSnapshot, LinkedInSnapshotSchema } from './profile-graph';

export async function parseLinkedInPDF(buffer: Buffer): Promise<LinkedInSnapshot> {
    const pdf = require('pdf-parse');
    const data = await pdf(buffer);
    const text = data.text;

    // Extraction logic (Robust heuristics for LinkedIn Profile PDF)
    const snapshot: Partial<LinkedInSnapshot> = {
        positions: [],
        education: [],
        skills: [],
        projects: [],
    };

    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    // Robust Extraction: Find Name and Headline
    // Name is usually the first "clean" line that isn't metadata
    let nameIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i];
        const lower = line.toLowerCase();

        // Skip metadata and noise
        if (lower === 'contact' ||
            lower.includes('contact info') ||
            lower.includes('linkedin profile') ||
            lower.includes('www.linkedin.com') ||
            lower.startsWith('page ') ||
            /^\d+$/.test(line) || // Just numbers
            lower.includes('top skills') ||
            lower.includes('languages') ||
            lower.includes('certifications')) continue;

        snapshot.fullName = line;
        nameIndex = i;
        break;
    }

    // Headline is usually the line immediately following the name
    // But it could be separated by some noise in بعض formats
    if (nameIndex !== -1) {
        for (let j = nameIndex + 1; j < Math.min(lines.length, nameIndex + 4); j++) {
            const line = lines[j];
            const lower = line.toLowerCase();

            if (lower.includes('contact') ||
                lower.includes('linkedin') ||
                lower.includes('page ') ||
                /^\d+$/.test(line)) continue;

            snapshot.headline = line;
            break;
        }
    }

    // About Section
    const aboutSplit = text.split(/About\n|Summary\n|Professional Summary\n|Executive Summary\n/i);
    if (aboutSplit.length > 1) {
        snapshot.about = aboutSplit[1].split(/\nExperience\n|\nEducation\n|\nProjects\n|\nSkills\n/i)[0].trim();
    }

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
