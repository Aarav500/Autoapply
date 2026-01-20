import { ValidatedPost, ActivitySchema } from '../profile-schema';
import { QualityAnalyzer } from './quality-analyzer';
import { PostVariantTypeEnum } from '../profile-schema';
import { z } from 'zod';

type Activity = z.infer<typeof ActivitySchema>;

export class PostFactory {

    /**
     * Generates 3 variants of posts for a single activity.
     */
    static generateVariants(activity: Activity): Pick<ValidatedPost, 'type' | 'content' | 'hookScore' | 'readability'>[] {
        const variants: Pick<ValidatedPost, 'type' | 'content' | 'hookScore' | 'readability'>[] = [];

        // 1. Story Variant
        const storyContent = this.createStoryVariant(activity);
        variants.push({
            type: 'story',
            content: storyContent,
            hookScore: QualityAnalyzer.calculateHookScore(storyContent),
            readability: QualityAnalyzer.calculateReadability(storyContent)
        });

        // 2. Technical Variant
        if (activity.skills && activity.skills.length > 0) {
            const techContent = this.createTechnicalVariant(activity);
            variants.push({
                type: 'technical',
                content: techContent,
                hookScore: QualityAnalyzer.calculateHookScore(techContent),
                readability: QualityAnalyzer.calculateReadability(techContent)
            });
        }

        // 3. Lesson Variant
        const lessonContent = this.createLessonVariant(activity);
        variants.push({
            type: 'lesson',
            content: lessonContent,
            hookScore: QualityAnalyzer.calculateHookScore(lessonContent),
            readability: QualityAnalyzer.calculateReadability(lessonContent)
        });

        return variants;
    }

    private static createStoryVariant(activity: Activity): string {
        return `
I never thought I'd be able to complete ${activity.name}.

When I started as a ${activity.role} at ${activity.organization}, I was overwhelmed. The goal was simple: ${activity.description.slice(0, 50)}... but the reality was harder.

Here's what happened:
1. I faced a major blocker.
2. I had to rethink my approach.
3. I leaned on my team.

In the end, we delivered. And looking back, it wasn't just about the code. It was about resilience.

Has a project ever tested your limits? 👇
#growth #softwareengineering #${activity.name.replace(/\s/g, '').toLowerCase()}
        `.trim();
    }

    private static createTechnicalVariant(activity: Activity): string {
        const skills = activity.skills ? activity.skills.join(', ') : 'tech';
        return `
How we built ${activity.name} using ${skills}. 🛠️

At ${activity.organization}, we faced a scale challenge. We needed to solve ${activity.description.slice(0, 30)}...

The Stack:
${activity.skills?.map(s => `✅ ${s}`).join('\n') || '✅ Typescript'}

The solution wasn't obvious. We had to optimize for X and Y. But once we implemented the new architecture, performance improved by 40%.

Engineers: What's your favorite part of this stack?
#systemdesign #coding #${activity.organization.replace(/\s/g, '').toLowerCase()}
        `.trim();
    }

    private static createLessonVariant(activity: Activity): string {
        return `
3 Things I learned building ${activity.name}:

1. **Start Simple.** We overcomplicated the initial design.
2. **User Feedback is Gold.** Our first iteration missed the mark until we spoke to users.
3. **Consistency beats Intensity.** Working on it every day as a ${activity.role} compounded.

If you're building something new, don't ignore step 1.

What's the biggest lesson you've learned recently?
#learning #careeradvice #developer
        `.trim();
    }
}
