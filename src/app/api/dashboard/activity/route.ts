import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { apiResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    const activities: Array<{ time: string; description: string; dotColor: string }> = [];

    // Fetch recent applications
    const appsRaw = await storage.getJSON<any>(`users/${userId}/applications/index.json`).catch(() => []);
    const appsArr = Array.isArray(appsRaw) ? appsRaw : (appsRaw?.applications || []);
    const recentApps = appsArr
      .sort((a: any, b: any) => new Date(b.appliedAt || b.createdAt).getTime() - new Date(a.appliedAt || a.createdAt).getTime())
      .slice(0, 3);

    for (const app of recentApps) {
      const time = new Date(app.appliedAt || app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Look up job details since application index only stores jobId
      let jobTitle = 'position';
      let company = 'company';
      if (app.jobId) {
        try {
          const job = await storage.getJSON<any>(`users/${userId}/jobs/${app.jobId}.json`);
          if (job) { jobTitle = job.title || jobTitle; company = job.company || company; }
        } catch { /* job may not exist */ }
      }
      activities.push({
        time,
        description: `Applied to ${jobTitle} at ${company}`,
        dotColor: "#00E676"
      });
    }

    // Fetch recent documents (getJSON returns null when file doesn't exist)
    const docsIndex = await storage.getJSON<any>(`users/${userId}/documents/index.json`);
    const recentDocs = (docsIndex?.documents || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2);

    recentDocs.forEach((doc: any) => {
      const time = new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activities.push({
        time,
        description: `Generated ${doc.type === 'cv' ? 'CV' : 'cover letter'} for ${doc.jobTitle || 'application'}`,
        dotColor: "#536DFE"
      });
    });

    // Fetch recent interviews (saved as flat array)
    const interviewsRaw = await storage.getJSON<any>(`users/${userId}/interviews/index.json`).catch(() => []);
    const recentInterviews = (Array.isArray(interviewsRaw) ? interviewsRaw : (interviewsRaw?.interviews || []))
      .filter((i: any) => i.status === 'scheduled')
      .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 2);

    recentInterviews.forEach((interview: any) => {
      const time = new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activities.push({
        time,
        description: `Interview confirmed — ${interview.company}, ${new Date(interview.scheduledAt).toLocaleDateString()}`,
        dotColor: "#FFAB00"
      });
    });

    // Fetch recent emails (saved as flat EmailIndexEntry[])
    const emailsRaw = await storage.getJSON<any>(`users/${userId}/emails/index.json`).catch(() => []);
    const recentEmails = (Array.isArray(emailsRaw) ? emailsRaw : (emailsRaw?.emails || []))
      .filter((e: any) => e.jobRelated)
      .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 2);

    recentEmails.forEach((email: any) => {
      const time = new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activities.push({
        time,
        description: `New email from ${email.from || email.company || 'recruiter'}`,
        dotColor: "#536DFE"
      });
    });

    // Fetch recent job searches (saved as flat JobSummary[])
    const jobsRaw = await storage.getJSON<any>(`users/${userId}/jobs/index.json`).catch(() => []);
    const today = new Date().toDateString();
    const newJobsToday = (Array.isArray(jobsRaw) ? jobsRaw : (jobsRaw?.jobs || [])).filter((j: any) =>
      new Date(j.createdAt).toDateString() === today
    ).length;

    if (newJobsToday > 0) {
      activities.push({
        time: "Earlier today",
        description: `${newJobsToday} new high-match jobs found`,
        dotColor: "#00FFE0"
      });
    }

    // Sort by most recent and limit to 10
    const sortedActivities = activities
      .sort(() => {
        // Keep insertion order which is already sorted by recency
        return 0;
      })
      .slice(0, 10);

    // If no activities, add a default message
    if (sortedActivities.length === 0) {
      sortedActivities.push({
        time: "Now",
        description: "Welcome! Your activity will appear here",
        dotColor: "#00FFE0"
      });
    }

    return apiResponse(sortedActivities);
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}
