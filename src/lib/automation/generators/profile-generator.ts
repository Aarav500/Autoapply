// Profile content generator for LinkedIn optimization

import { ProfileGraph, Experience } from '../profile-graph';

export class ProfileGenerator {
  /**
   * Generate an optimized LinkedIn headline
   */
  static generateHeadline(graph: ProfileGraph): string {
    const skills = graph.skills.slice(0, 3);
    const currentRole = graph.workExperience[0]?.role;

    if (currentRole) {
      if (skills.length > 0) {
        return `${currentRole} | ${skills.join(' • ')}`;
      }
      return currentRole;
    }

    if (skills.length > 0) {
      return skills.join(' | ');
    }

    return 'Professional';
  }

  /**
   * Generate an optimized LinkedIn about section
   */
  static generateAbout(graph: ProfileGraph): string {
    const parts: string[] = [];

    // Opening hook
    if (graph.workExperience.length > 0) {
      const currentRole = graph.workExperience[0];
      parts.push(
        `${currentRole.role} at ${currentRole.organization} with expertise in building impactful solutions.`
      );
    }

    // Skills highlight
    if (graph.skills.length > 0) {
      const topSkills = graph.skills.slice(0, 5);
      parts.push(`\n\nCore competencies: ${topSkills.join(', ')}.`);
    }

    // Experience summary
    if (graph.workExperience.length > 1) {
      parts.push(
        `\n\nPreviously worked at ${graph.workExperience
          .slice(1, 3)
          .map((e) => e.organization)
          .join(', ')}.`
      );
    }

    // Call to action
    parts.push(`\n\nOpen to connecting and discussing opportunities.`);

    return parts.join('') || graph.about || '';
  }

  /**
   * Generate optimized bullet points for an experience
   */
  static generateExperienceBlock(experience: Experience): string {
    const bullets: string[] = [];

    // Role summary
    if (experience.description) {
      bullets.push(experience.description);
    }

    // Achievements
    if (experience.achievements && experience.achievements.length > 0) {
      bullets.push(...experience.achievements.slice(0, 4));
    }

    // Skills used
    if (experience.skills && experience.skills.length > 0) {
      bullets.push(`Technologies: ${experience.skills.slice(0, 5).join(', ')}`);
    }

    return bullets.map((b) => `• ${b}`).join('\n');
  }
}
