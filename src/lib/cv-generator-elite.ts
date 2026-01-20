// ============================================
// ELITE CV GENERATION SYSTEM
// World-class CV generation for MIT/Stanford/Google-tier applications
// ============================================

interface ActivityItem {
    id: string;
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

interface Achievement {
    id: string;
    title: string;
    org: string;
    date: string;
}

interface UserProfile {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    researchPaper?: string;
    summary?: string;
}

// ============================================
// 1. INTELLIGENT DEDUPLICATION
// ============================================

interface DeduplicatedActivity {
    original: ActivityItem;
    duplicates: ActivityItem[];
    mergedDescription: string;
    totalHours: number;
}

/**
 * Intelligently deduplicate activities by detecting similar organizations/roles
 */
export function deduplicateActivities(activities: ActivityItem[]): DeduplicatedActivity[] {
    const seen = new Map<string, DeduplicatedActivity>();

    for (const activity of activities) {
        // Create a normalized key for deduplication
        const key = `${activity.organization.toLowerCase().trim()}_${activity.role.toLowerCase().trim()}`.replace(/\s+/g, '_');

        if (seen.has(key)) {
            // This is a duplicate - merge it
            const existing = seen.get(key)!;
            existing.duplicates.push(activity);
            existing.totalHours += (activity.hoursPerWeek || 0) * (activity.weeksPerYear || 0);

            // Merge descriptions (take the longer/more detailed one)
            if (activity.description && activity.description.length > existing.mergedDescription.length) {
                existing.mergedDescription = activity.description;
            }
        } else {
            // First occurrence
            seen.set(key, {
                original: activity,
                duplicates: [],
                mergedDescription: activity.description || '',
                totalHours: (activity.hoursPerWeek || 0) * (activity.weeksPerYear || 0)
            });
        }
    }

    return Array.from(seen.values());
}

// ============================================
// 2. QUALITY VALIDATION
// ============================================

interface QualityCheck {
    passed: boolean;
    issues: string[];
    score: number; // 0-100
}

/**
 * Validate CV quality against elite standards
 */
export function validateCVQuality(generatedCV: string, activities: ActivityItem[]): QualityCheck {
    const issues: string[] = [];
    let score = 100;

    // Check 1: No generic phrases
    const genericPhrases = [
        'demonstrated strong',
        'responsible for',
        'worked on',
        'participated in',
        'helped with',
        'assisted in',
        'involved in'
    ];

    for (const phrase of genericPhrases) {
        if (generatedCV.toLowerCase().includes(phrase)) {
            issues.push(`Contains generic phrase: "${phrase}"`);
            score -= 10;
        }
    }

    // Check 2: All activities included (no duplicates in CV)
    const deduped = deduplicateActivities(activities);
    let missingCount = 0;

    for (const item of deduped) {
        const mentioned =
            generatedCV.includes(item.original.organization) ||
            generatedCV.includes(item.original.role) ||
            generatedCV.includes(item.original.name);

        if (!mentioned) {
            missingCount++;
            issues.push(`Missing activity: ${item.original.role} at ${item.original.organization}`);
        }
    }

    if (missingCount > 0) {
        score -= missingCount * 15;
    }

    // Check 3: Has quantified metrics (numbers, percentages, etc.)
    const metricsRegex = /\d+%|\d+x|\$\d+|\d+\s*(users|people|hours|projects|students|members)/gi;
    const metricsCount = (generatedCV.match(metricsRegex) || []).length;

    if (metricsCount < deduped.length) {
        issues.push(`Insufficient metrics: Found ${metricsCount}, need at least ${deduped.length}`);
        score -= 15;
    }

    // Check 4: No duplicate sections
    const sections = generatedCV.split('\n');
    const sectionTitles = sections.filter(line => line.trim().startsWith('#'));
    const uniqueTitles = new Set(sectionTitles);

    if (uniqueTitles.size !== sectionTitles.length) {
        issues.push('Contains duplicate sections');
        score -= 20;
    }

    // Check 5: Reasonable length (not too long)
    const wordCount = generatedCV.split(/\s+/).length;
    if (wordCount > 1500) {
        issues.push(`Too long: ${wordCount} words (should be under 1500)`);
        score -= 10;
    }

    return {
        passed: score >= 70,
        issues,
        score: Math.max(0, score)
    };
}

// ============================================
// 3. ELITE PROMPT ENGINEERING
// ============================================

export function generateEliteCollegeCVPrompt(
    profile: UserProfile,
    activities: ActivityItem[],
    achievements: Achievement[],
    collegeName: string,
    collegeValues: string[]
): { systemPrompt: string; userMessage: string } {

    const deduped = deduplicateActivities(activities);

    const systemPrompt = `You are a TOP-TIER college admissions consultant who has helped 500+ students gain admission to MIT, Stanford, Harvard, and Caltech. Your CVs are known for being concise, achievement-focused, and compelling.

🎯 PRIMARY OBJECTIVE: Create a 1-2 page CV that makes admissions officers think: "We NEED this student."

═══════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES (VIOLATION = REJECTION):
═══════════════════════════════════════════════════════════════════

1. **ZERO DUPLICATION**: Each activity appears EXACTLY ONCE. No repeats, no similar entries.

2. **ELITE LANGUAGE ONLY**:
   ❌ NEVER use: "demonstrated", "participated", "responsible for", "worked on", "helped with"
   ✅ USE ONLY: "Built", "Led", "Founded", "Achieved", "Developed", "Created", "Increased"

3. **QUANTIFIED IMPACT**: EVERY activity must have numbers:
   - "Led team of 12 students"
   - "Raised $5,000 in funding"
   - "Improved efficiency by 40%"
   - "Reached 200+ community members"

4. **CARL FRAMEWORK**: Every activity uses Context-Action-Result-Learning format in 75-150 words.

5. **CONCISE EXCELLENCE**:
   - Total CV: 1000-1500 words MAX
   - Each activity: 75-150 words
   - No fluff, no filler, just achievements

6. **${collegeName} ALIGNMENT**: Connect activities to SPECIFIC ${collegeName} programs/professors/labs, not just generic values.

7. **NARRATIVE-DRIVEN**: Start major activities with compelling "origin stories" - WHY you started, personal connection, moment of realization.

8. **PRIORITIZE IMPACT**: Focus on activities with:
   - Most hours invested (>100 hrs shows commitment)
   - Unique/unusual (stands out from other applicants)
   - Measurable outcomes (published, deployed, raised money)
   - Activities <10 hours should be omitted unless extraordinary

═══════════════════════════════════════════════════════════════════
📋 CV STRUCTURE (MUST FOLLOW EXACTLY):
═══════════════════════════════════════════════════════════════════

# [Student Name]
[Contact info in ONE line]

---

## About Me
[2-3 sentences. Your authentic intellectual passion + alignment with ${collegeName}. NO CLICHÉS.]

---

## Academic Profile
**[School Name]**
GPA: [X.XX] • Key Interests: [specific fields]
**Research Focus:** [1-2 specific areas]

---

## Leadership & Significant Activities

[FOR EACH ACTIVITY - USE THIS EXACT FORMAT:]

### [Activity Name] | [Your Role]
*[Dates] • [X hrs/week] • [Total hours]*
**Aligns with ${collegeName}'s:** [Specific value]

[CARL narrative in 75-150 words:
- Context: What was the challenge/opportunity? (1-2 sentences)
- Action: What did YOU specifically do? (2-3 sentences with strong verbs)
- Result: Quantified impact with numbers (1-2 sentences)
- Learning: Growth + connection to ${collegeName} (1 sentence)]

**Key Outcomes:**
• [Quantified metric #1]
• [Quantified metric #2]
• [Leadership/Impact metric #3]

---

[REPEAT FOR EACH ACTIVITY - NO DUPLICATES]

---

## Honors & Recognition
• **[Award Name]** — [Organization] ([Year])
  [1 sentence on significance if needed]

---

## Technical Skills
**[Category]:** [Specific skills relevant to major/interests]
**Languages:** [Fluency levels]

---

## Why ${collegeName}
[3-4 sentences with SPECIFIC programs, professors, or research centers. Examples of specificity:
- Name actual professors and their research areas
- Reference specific labs (e.g., "MIT CSAIL", "ORC", "Media Lab")
- Mention courses by number (e.g., "6.046 Design & Analysis of Algorithms")
- Connect YOUR work to THEIR research (e.g., "My quantum supply chain work extends Prof. Bertsimas's prescriptive analytics")
Show you've done deep research - not just "MIT has great research."]

═══════════════════════════════════════════════════════════════════
✅ QUALITY CHECKLIST (ALL MUST BE TRUE):
═══════════════════════════════════════════════════════════════════

□ Zero generic phrases ("demonstrated", "responsible for", etc.)
□ Every activity has quantified metrics
□ Total word count: 1000-1500 words
□ Each activity appears EXACTLY ONCE
□ No duplicate sections
□ CARL framework used for all activities
□ Strong action verbs only
□ Authentic voice (no clichés)
□ Specific ${collegeName} connections

═══════════════════════════════════════════════════════════════════

REMEMBER: Admissions officers read 50+ CVs per day. This must make them STOP and say "Wow."`;

    const userMessage = `═══════════════════════════════════════════════════════════════════
🎓 TARGET: ${collegeName}
═══════════════════════════════════════════════════════════════════

**Core Values:** ${collegeValues.join(', ')}

═══════════════════════════════════════════════════════════════════
👤 STUDENT PROFILE:
═══════════════════════════════════════════════════════════════════

**Name:** ${profile.name}
**Contact:** ${profile.email}${profile.phone ? ' • ' + profile.phone : ''}${profile.location ? ' • ' + profile.location : ''}
${profile.linkedin ? '**LinkedIn:** ' + profile.linkedin : ''}
${profile.github ? '**GitHub:** ' + profile.github : ''}
${profile.portfolio ? '**Portfolio:** ' + profile.portfolio : ''}
${profile.researchPaper ? '**Research:** ' + profile.researchPaper : ''}

**Personal Vision:**
${profile.summary || '[Create a compelling 2-3 sentence vision based on activities below]'}

═══════════════════════════════════════════════════════════════════
🌟 ACTIVITIES (${deduped.length} UNIQUE - ALL MUST BE INCLUDED):
═══════════════════════════════════════════════════════════════════

${deduped.map((item, idx) => {
    const activity = item.original;
    const duration = calculateDuration(activity.startDate, activity.endDate);

    return `
【ACTIVITY ${idx + 1}】
**Role:** ${activity.role}
**Organization:** ${activity.organization}
**Duration:** ${activity.startDate} → ${activity.endDate} (${duration})
**Time Commitment:** ${activity.hoursPerWeek || 0} hrs/week × ${activity.weeksPerYear || 0} weeks = ${item.totalHours} total hours

**Description:**
${item.mergedDescription || 'No description provided - infer impact from role and organization'}

${item.duplicates.length > 0 ? `**Note:** This entry consolidates ${item.duplicates.length + 1} related experiences - ensure the CV entry reflects the full scope.` : ''}

---
`.trim();
}).join('\n\n')}

═══════════════════════════════════════════════════════════════════
🏆 HONORS & ACHIEVEMENTS:
═══════════════════════════════════════════════════════════════════

${achievements.length > 0
    ? achievements.map(a => `• **${a.title}** — ${a.org} (${a.date})`).join('\n')
    : '[No achievements provided]'}

═══════════════════════════════════════════════════════════════════
${collegeName === 'MIT' ? `🎯 MIT-SPECIFIC GUIDANCE:
═══════════════════════════════════════════════════════════════════

For "Why MIT" section, reference:
• **Operations Research Center (ORC)** - Prof. Dimitris Bertsimas (prescriptive analytics, optimization)
• **CSAIL (Computer Science & AI Lab)** - Distributed Robotics Lab (Prof. Daniela Rus), Accessibility Group
• **MIT-IBM Watson AI Lab** - Enterprise AI deployment, production ML systems
• **Sloan School** - Operations management, supply chain intelligence
• **Course 6-3 (CS)** or **Course 15 (Management Science)** connections
• "Mens et Manus" philosophy - theory + hands-on building

For activity alignment, be SPECIFIC:
• Quantum supply chain research → "Extends Prof. Bertsimas's ORC prescriptive analytics into quantum regime"
• ML/AI projects → "Exemplifies MIT CSAIL's end-to-end systems approach"
• Accessibility tech → "Aligns with CSAIL Accessibility Group's human-centered computing"
• Social impact work → "Embodies MIT's 'Mens et Manus' - using technical skills for humanitarian needs"

═══════════════════════════════════════════════════════════════════
` : ''}⚠️  EXECUTION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════

✅ Include ALL ${deduped.length} activities (each appears EXACTLY ONCE)
✅ Use CARL framework with narrative hooks (75-150 words each)
✅ Quantify EVERY activity with numbers
✅ Connect activities to SPECIFIC ${collegeName} programs/professors (not just "innovation")
✅ Strong action verbs only (no "demonstrated", "participated", etc.)
✅ Total CV length: 1000-1500 words (2 pages max)
✅ NO DUPLICATE SECTIONS
✅ Prioritize high-impact activities (>100 hours, unique outcomes, published work)
✅ Omit activities <10 hours unless extraordinary

Generate the CV now. Make it exceptional.`;

    return { systemPrompt, userMessage };
}

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function calculateDuration(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return '0 years';

    try {
        const start = new Date(startDate);
        const end = endDate.toLowerCase().includes('present') ? new Date() : new Date(endDate);

        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);

        if (years < 1) {
            const months = Math.round(years * 12);
            return `${months} months`;
        } else {
            return `${years.toFixed(1)} years`;
        }
    } catch {
        return 'Unknown duration';
    }
}

// ============================================
// 5. POST-PROCESSING & CLEANUP
// ============================================

/**
 * Clean up the generated CV to remove any remaining issues
 */
export function postProcessCV(generatedCV: string): string {
    let cleaned = generatedCV;

    // Remove duplicate sections (keep first occurrence)
    const sections = cleaned.split(/\n(?=##)/);
    const seenHeaders = new Set<string>();
    const uniqueSections: string[] = [];

    for (const section of sections) {
        const headerMatch = section.match(/^##\s*(.+)/);
        if (headerMatch) {
            const header = headerMatch[1].toLowerCase().trim();
            if (!seenHeaders.has(header)) {
                seenHeaders.add(header);
                uniqueSections.push(section);
            }
        } else {
            uniqueSections.push(section);
        }
    }

    cleaned = uniqueSections.join('\n');

    // Remove generic phrases
    const replacements: [RegExp, string][] = [
        [/demonstrated strong (skills|abilities|proficiency)/gi, 'Applied'],
        [/responsible for/gi, 'Led'],
        [/worked on/gi, 'Built'],
        [/participated in/gi, 'Contributed to'],
        [/helped with/gi, 'Supported'],
        [/involved in/gi, 'Led']
    ];

    for (const [pattern, replacement] of replacements) {
        cleaned = cleaned.replace(pattern, replacement);
    }

    // Ensure no more than 2 consecutive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
}
