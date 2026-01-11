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

    // Heuristic 1: First line is usually the Name
    if (lines.length > 0) {
        snapshot.fullName = lines[0];
    }

    // Heuristic 2: Headline is often the second line OR between Name and "Contact"
    // Or it might be the line before "LinkedIn Profile"
    const contactIndex = lines.findIndex((l: string) => l.toLowerCase().includes('contact'));
    const profileIndex = lines.findIndex((l: string) => l.toLowerCase().includes('linkedin profile'));

    if (profileIndex > 0) {
        // In some exports, headline is immediately before "LinkedIn Profile"
        snapshot.headline = lines[profileIndex - 1];
    } else if (contactIndex > 1) {
        // Or it's between name and contact info
        snapshot.headline = lines[1];
    }

    // About Section
    const aboutSplit = text.split(/About\n|Summary\n/i);
    if (aboutSplit.length > 1) {
        snapshot.about = aboutSplit[1].split(/Experience\n|Education\n|Projects\n/i)[0].trim();
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
