
import { prisma } from '@/lib/prisma';
import { PostFactory } from '../generators/post-factory';
import { ProfileGraphService } from '../profile-graph';
import { ProfileGraph } from '../profile-schema';

export class ContentSchedulerService {

    /**
     * Auto-populates the calendar for the next N days.
     * Strategy:
     * 1. Get all activities
     * 2. Generate variants for each if not already generated
     * 3. Distribute them: 2-3 posts per week
     * 4. Rotate types: Story -> Technical -> Lesson
     */
    static async generateCalendar(userId: string, startDate: Date = new Date(), days: number = 30) {
        const graph = await ProfileGraphService.getProfileGraph(userId);
        const activities = [...graph.workExperience, ...graph.projects];

        if (activities.length === 0) return [];

        // 1. Ensure we have variants
        // In a real app, we'd check DB first. For now, we regenerate or check existing.
        // We'll just generate fresh candidates for scheduling.
        let pool = activities.flatMap(a => PostFactory.generateVariants(a));

        // Shuffle pool
        pool = this.shuffle(pool);

        // 2. Schedule
        const schedule = [];
        let currentDate = new Date(startDate);
        const postsPerWeek = 3;
        let postsScheduledThisWeek = 0;

        // Simple iterator
        for (let i = 0; i < days; i++) {
            const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat

            // Skip weekends? Maybe. Let's post Tue, Wed, Thu for high engagement.
            const isPostingDay = [2, 3, 4].includes(dayOfWeek);

            if (isPostingDay && pool.length > 0) {
                const post = pool.pop();
                if (post) {
                    schedule.push({
                        date: new Date(currentDate),
                        post
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return schedule;
    }

    private static shuffle(array: any[]) {
        return array.sort(() => Math.random() - 0.5);
    }
}
