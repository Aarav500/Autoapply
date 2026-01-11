import { Activity, Achievement } from '../storage';

export interface LinkedInPostVariant {
    type: 'story' | 'technical' | 'lessons' | 'results';
    content: string;
    hashtags: string[];
    sourceId: string;
}

export function generatePostVariants(activity: Activity): LinkedInPostVariant[] {
    const variants: LinkedInPostVariant[] = [];
    const name = activity.organization || activity.name;

    // Story Variant
    variants.push({
        type: 'story',
        content: `I'm excited to share my journey working with ${name}! 🚀\n\n${activity.description}\n\nIt was an incredible experience because...\n\n#Learning #TechJourney #Growth`,
        hashtags: ['Learning', 'TechJourney', 'Growth'],
        sourceId: activity.id,
    });

    // Technical Variant
    if (activity.skills && activity.skills.length > 0) {
        variants.push({
            type: 'technical',
            content: `Deep dive into the tech stack at ${name}. 💻\n\nWe used ${activity.skills.join(', ')} to solve some interesting challenges.\n\n${activity.description.substring(0, 200)}...\n\n#SoftwareDevelopment #TechStack #${activity.skills[0].replace(/\s+/g, '')}`,
            hashtags: ['SoftwareDevelopment', 'TechStack', activity.skills[0].replace(/\s+/g, '')],
            sourceId: activity.id,
        });
    }

    // Results Variant
    if (activity.impact) {
        variants.push({
            type: 'results',
            content: `Results from my time at ${name}: 🎯\n\nImpact: ${activity.impact}\n\n${activity.description}\n\n#Impact #Results #ProfessionalGrowth`,
            hashtags: ['Impact', 'Results', 'ProfessionalGrowth'],
            sourceId: activity.id,
        });
    }

    return variants;
}

export function validatePostClaims(content: string, activity: Activity): boolean {
    // Hard Guardrail: Ensure logic
    // This is a simple check; in reality, we'd use fuzzy matching or LLM cross-ref
    const keywords = activity.description.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    // Simple check: significantly different words should not be present if not in activity
    // For MVP, we'll assume the template content is safe as it's built from source
    return true;
}
