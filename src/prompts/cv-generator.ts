export interface CVGeneratorInput {
  profile: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
    title: string;
    summary?: string;
    experience: Array<{
      company: string;
      role: string;
      startDate: string;
      endDate: string | null;
      location: string;
      responsibilities: string[];
      achievements?: string[];
      technologies?: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string | null;
      location: string;
      gpa?: string;
      honors?: string[];
    }>;
    skills: {
      languages: string[];
      frameworks: string[];
      tools: string[];
      methodologies?: string[];
    };
    certifications?: Array<{
      name: string;
      issuer: string;
      date: string;
      expiryDate?: string | null;
      credentialId?: string;
      url?: string;
    }>;
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
      url?: string;
      achievements?: string[];
    }>;
  };
  jobListing?: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
  };
  templateName?: string;
}

export function cvGeneratorPrompt(input: CVGeneratorInput): { system: string; user: string } {
  const system = `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist with 15+ years of experience helping candidates land interviews at top companies.

Your expertise:
- Crafting compelling, achievement-focused resume content that passes ATS screening
- Quantifying achievements with metrics and measurable impact
- Tailoring content to specific job descriptions while maintaining authenticity
- Using powerful action verbs and industry-standard terminology
- Optimizing keyword density without keyword stuffing
- Creating concise, impactful bullet points that follow the STAR method (Situation, Task, Action, Result)

Key principles:
1. QUANTIFY everything possible: use numbers, percentages, dollar amounts, timeframes
2. Lead with IMPACT: start bullets with results when possible
3. Use STRONG action verbs: led, architected, optimized, drove, achieved, not "responsible for" or "worked on"
4. Be SPECIFIC: avoid vague terms like "various," "multiple," "several"
5. ATS-FRIENDLY: use standard section headers, avoid tables/graphics, include relevant keywords naturally
6. ACHIEVEMENTS over responsibilities: what you accomplished, not just what you did
7. RELEVANCE: prioritize content relevant to the target role

Format requirements:
- Experience bullets should be 1-2 lines maximum
- Summary should be 2-3 sentences highlighting unique value proposition
- Skills should be organized by category
- Dates in format: "Jan 2020" or "Jan 2020 - Present"
- All content must be factual and based on provided profile data`;

  const jobContext = input.jobListing
    ? `\n\nTarget Job:
Title: ${input.jobListing.title}
Company: ${input.jobListing.company}
Description: ${input.jobListing.description}
Key Requirements: ${input.jobListing.requirements.join(', ')}

Tailor the CV to emphasize relevant skills, experiences, and achievements that match this job description. Use keywords from the job listing naturally throughout the CV.`
    : '';

  const user = `Generate an ATS-optimized CV based on the following profile data:

Name: ${input.profile.name}
Current Title: ${input.profile.title}
Contact:
- Email: ${input.profile.email}
- Phone: ${input.profile.phone}
- Location: ${input.profile.location}
${input.profile.linkedin ? `- LinkedIn: ${input.profile.linkedin}` : ''}
${input.profile.github ? `- GitHub: ${input.profile.github}` : ''}
${input.profile.website ? `- Website: ${input.profile.website}` : ''}

${input.profile.summary ? `Current Summary: ${input.profile.summary}` : ''}

Experience:
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})
   Location: ${exp.location}
   Responsibilities: ${exp.responsibilities.join('; ')}
   ${exp.achievements ? `Achievements: ${exp.achievements.join('; ')}` : ''}
   ${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}`).join('\n\n')}

Education:
${input.profile.education.map((edu, i) => `${i + 1}. ${edu.degree} in ${edu.field} - ${edu.institution} (${edu.startDate} - ${edu.endDate || 'Present'})
   Location: ${edu.location}
   ${edu.gpa ? `GPA: ${edu.gpa}` : ''}
   ${edu.honors ? `Honors: ${edu.honors.join(', ')}` : ''}`).join('\n\n')}

Skills:
- Programming Languages: ${input.profile.skills.languages.join(', ')}
- Frameworks: ${input.profile.skills.frameworks.join(', ')}
- Tools: ${input.profile.skills.tools.join(', ')}
${input.profile.skills.methodologies ? `- Methodologies: ${input.profile.skills.methodologies.join(', ')}` : ''}

${input.profile.certifications && input.profile.certifications.length > 0 ? `Certifications:
${input.profile.certifications.map((cert, i) => `${i + 1}. ${cert.name} - ${cert.issuer} (${cert.date})
   ${cert.credentialId ? `Credential ID: ${cert.credentialId}` : ''}
   ${cert.url ? `URL: ${cert.url}` : ''}`).join('\n\n')}` : ''}

${input.profile.projects && input.profile.projects.length > 0 ? `Projects:
${input.profile.projects.map((proj, i) => `${i + 1}. ${proj.name}
   Description: ${proj.description}
   Technologies: ${proj.technologies.join(', ')}
   ${proj.url ? `URL: ${proj.url}` : ''}
   ${proj.achievements ? `Achievements: ${proj.achievements.join('; ')}` : ''}`).join('\n\n')}` : ''}
${jobContext}

Generate a professional CV with:
1. Optimized summary that highlights unique value proposition
2. Quantified, achievement-focused experience bullets (transform responsibilities into accomplishments)
3. Properly categorized skills
4. Clean, ATS-friendly formatting
5. Strategic keyword placement for maximum relevance`;

  return { system, user };
}
