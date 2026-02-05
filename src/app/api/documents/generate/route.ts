import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { generateText, generateCoverLetter } from '@/lib/ai/claude';

const generateDocumentSchema = z.object({
  type: z.enum(['resume', 'cover_letter', 'thank_you', 'follow_up']),
  jobId: z.string().optional(),
  templateId: z.string().optional(),
  customizations: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, jobId, templateId, customizations } = generateDocumentSchema.parse(body);

    // Get user profile
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        skills: true,
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        user: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get job if specified
    let job = null;
    if (jobId) {
      job = await db.job.findUnique({ where: { id: jobId } });
      if (!job || job.userId !== session.user.id) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    let content: string;
    let filename: string;

    switch (type) {
      case 'resume':
        content = await generateResume(profile, job, customizations);
        filename = `Resume_${profile.user.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
        break;

      case 'cover_letter':
        if (!job) {
          return NextResponse.json(
            { error: 'Job ID required for cover letter' },
            { status: 400 }
          );
        }
        const experienceLines: string[] = [];
        for (const exp of profile.experiences) {
          experienceLines.push(`${exp.title} at ${exp.company}: ${exp.achievements.join(', ')}`);
        }
        const skillNames: string[] = [];
        for (const skill of profile.skills) {
          skillNames.push(skill.name);
        }
        const allAchievements: string[] = [];
        for (const exp of profile.experiences) {
          allAchievements.push(...exp.achievements);
        }
        content = await generateCoverLetter(
          {
            title: job.title,
            company: job.company,
            description: job.description,
          },
          {
            name: profile.user.name,
            headline: profile.headline || '',
            experience: experienceLines.join('\n'),
            skills: skillNames,
            achievements: allAchievements.slice(0, 5),
          }
        );
        filename = `Cover_Letter_${job.company.replace(/\s+/g, '_')}_${Date.now()}.txt`;
        break;

      case 'thank_you':
        if (!job) {
          return NextResponse.json(
            { error: 'Job ID required for thank you letter' },
            { status: 400 }
          );
        }
        content = await generateThankYouLetter(profile.user.name, job, customizations);
        filename = `Thank_You_${job.company.replace(/\s+/g, '_')}_${Date.now()}.txt`;
        break;

      case 'follow_up':
        if (!job) {
          return NextResponse.json(
            { error: 'Job ID required for follow-up email' },
            { status: 400 }
          );
        }
        content = await generateFollowUpEmail(profile.user.name, job, customizations);
        filename = `Follow_Up_${job.company.replace(/\s+/g, '_')}_${Date.now()}.txt`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Save document to database
    const document = await db.document.create({
      data: {
        userId: session.user.id,
        type,
        name: filename,
        s3Key: `documents/${session.user.id}/${filename}`,
        mimeType: 'text/plain',
        forJobId: jobId,
        forCompany: job?.company,
        extractedText: content,
      },
    });

    return NextResponse.json({
      id: document.id,
      content,
      filename,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

async function generateResume(
  profile: {
    headline?: string | null;
    summary?: string | null;
    location?: string | null;
    skills: { name: string; proficiency?: number | null }[];
    experiences: {
      company: string;
      title: string;
      location?: string | null;
      startDate: Date;
      endDate?: Date | null;
      isCurrent: boolean;
      description?: string | null;
      achievements: string[];
    }[];
    education: {
      institution: string;
      degree: string;
      field?: string | null;
      startDate: Date;
      endDate?: Date | null;
      gpa?: number | null;
    }[];
    user: { name: string; email: string };
  },
  job: { title: string; company: string; description: string; requiredSkills: string[] } | null,
  customizations?: Record<string, string>
): Promise<string> {
  const prompt = `Create a professional, ATS-optimized resume for:

NAME: ${profile.user.name}
EMAIL: ${profile.user.email}
LOCATION: ${profile.location || 'Not specified'}
HEADLINE: ${profile.headline || 'Professional'}

SUMMARY:
${profile.summary || 'Experienced professional seeking new opportunities.'}

SKILLS:
${profile.skills.map((s: { name: string }) => s.name).join(', ')}

EXPERIENCE:
${profile.experiences
  .map(
    (e: { title: string; company: string; location?: string | null; startDate: Date; endDate?: Date | null; isCurrent: boolean; description?: string | null; achievements: string[] }) => `
${e.title} at ${e.company}
${e.location || ''} | ${e.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${e.isCurrent ? 'Present' : e.endDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
${e.description || ''}
Achievements:
${e.achievements.map((a: string) => `• ${a}`).join('\n')}`
  )
  .join('\n\n')}

EDUCATION:
${profile.education
  .map(
    (e: { degree: string; field?: string | null; institution: string; startDate: Date; endDate?: Date | null; gpa?: number | null }) => `
${e.degree} in ${e.field || 'General Studies'}
${e.institution}
${e.startDate.getFullYear()} - ${e.endDate?.getFullYear() || 'Present'}${e.gpa ? ` | GPA: ${e.gpa}` : ''}`
  )
  .join('\n\n')}

${job ? `TARGET JOB: ${job.title} at ${job.company}\nKEY REQUIREMENTS: ${job.requiredSkills.join(', ')}` : ''}

${customizations?.tone ? `TONE: ${customizations.tone}` : ''}

Create a clean, professional resume with:
1. Contact information header
2. Professional summary (2-3 sentences)
3. Skills section (categorized if appropriate)
4. Work experience with quantified achievements
5. Education section

Use strong action verbs and quantify achievements where possible. Optimize for ATS by using standard section headers.`;

  return generateText(prompt, {
    system: 'You are an expert resume writer. Create ATS-optimized, professional resumes that highlight achievements and match job requirements.',
    model: 'claude-3-5-sonnet-20241022',
  });
}

async function generateThankYouLetter(
  userName: string,
  job: { title: string; company: string },
  customizations?: Record<string, string>
): Promise<string> {
  const interviewerName = customizations?.interviewerName || 'Hiring Team';
  const specificTopic = customizations?.specificTopic || '';

  const prompt = `Write a professional thank you letter after an interview.

CANDIDATE: ${userName}
POSITION: ${job.title}
COMPANY: ${job.company}
INTERVIEWER: ${interviewerName}
${specificTopic ? `SPECIFIC TOPIC DISCUSSED: ${specificTopic}` : ''}

Write a sincere, professional thank you letter that:
1. Thanks them for their time
2. Reiterates enthusiasm for the role
3. References something specific from the conversation if provided
4. Reinforces fit for the position
5. Ends with a clear call to action

Keep it concise (3-4 paragraphs) and professional.`;

  return generateText(prompt, {
    system: 'You are an expert at writing professional business correspondence. Write sincere, professional thank you letters.',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
  });
}

async function generateFollowUpEmail(
  userName: string,
  job: { title: string; company: string },
  customizations?: Record<string, string>
): Promise<string> {
  const daysSinceApplication = customizations?.daysSince || '7';
  const context = customizations?.context || 'application';

  const prompt = `Write a professional follow-up email.

CANDIDATE: ${userName}
POSITION: ${job.title}
COMPANY: ${job.company}
DAYS SINCE ${context.toUpperCase()}: ${daysSinceApplication}
CONTEXT: ${context}

Write a polite, professional follow-up email that:
1. References the original ${context}
2. Expresses continued interest
3. Asks for an update on the process
4. Offers to provide additional information
5. Thanks them for their consideration

Keep it brief and professional. Avoid being pushy.`;

  return generateText(prompt, {
    system: 'You are an expert at writing professional business correspondence. Write polite, effective follow-up emails.',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
  });
}
