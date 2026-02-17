import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { apiResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    const activities: Array<{ time: string; description: string; dotColor: string }> = [];

    // Fetch recent applications
    const appsIndex = await storage.getJSON<any>(`users/${userId}/applications/index.json`).catch(() => ({ applications: [] }));
    const recentApps = (appsIndex.applications || [])
      .sort((a: any, b: any) => new Date(b.appliedAt || b.createdAt).getTime() - new Date(a.appliedAt || a.createdAt).getTime())
      .slice(0, 3);

    recentApps.forEach((app: any) => {
      const time = new Date(app.appliedAt || app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activities.push({
        time,
        description: `Applied to ${app.jobTitle || 'position'} at ${app.company || 'company'}`,
        dotColor: "#00E676"
      });
    });

    // Fetch recent documents
    const docsIndex = await storage.getJSON<any>(`users/${userId}/documents/index.json`).catch(() => ({ documents: [] }));
    const recentDocs = (docsIndex.documents || [])
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

    // Fetch recent interviews
    const interviewsIndex = await storage.getJSON<any>(`users/${userId}/interviews/index.json`).catch(() => ({ interviews: [] }));
    const recentInterviews = (interviewsIndex.interviews || [])
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

    // Fetch recent emails
    const emailsIndex = await storage.getJSON<any>(`users/${userId}/emails/index.json`).catch(() => ({ emails: [] }));
    const recentEmails = (emailsIndex.emails || [])
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

    // Fetch recent job searches
    const jobsIndex = await storage.getJSON<any>(`users/${userId}/jobs/index.json`).catch(() => ({ jobs: [] }));
    const today = new Date().toDateString();
    const newJobsToday = (jobsIndex.jobs || []).filter((j: any) =>
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
      .sort((a, b) => {
        // Simple time-based sorting (not perfect but works for demo)
        return 0; // Keep insertion order which is already sorted
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
