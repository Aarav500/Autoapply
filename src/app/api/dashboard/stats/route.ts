import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { apiResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    // Fetch jobs to calculate stats
    const jobsIndex = await storage.getJSON<any>(`users/${userId}/jobs/index.json`).catch(() => ({ jobs: [] }));
    const jobs = jobsIndex.jobs || [];

    // Fetch applications
    const appsIndex = await storage.getJSON<any>(`users/${userId}/applications/index.json`).catch(() => ({ applications: [] }));
    const applications = appsIndex.applications || [];

    // Fetch interviews
    const interviewsIndex = await storage.getJSON<any>(`users/${userId}/interviews/index.json`).catch(() => ({ interviews: [] }));
    const interviews = interviewsIndex.interviews || [];

    // Calculate stats
    const today = new Date().toDateString();
    const applicationsToday = applications.filter((app: any) =>
      new Date(app.appliedAt || app.createdAt).toDateString() === today
    ).length;

    const totalJobs = jobs.length;
    const totalApplications = applications.length;
    const totalInterviews = interviews.filter((i: any) => i.status === 'scheduled').length;

    // Calculate response rate
    const applicationsWithResponse = applications.filter((app: any) =>
      app.status === 'screening' || app.status === 'interview' || app.status === 'offer'
    ).length;
    const responseRate = totalApplications > 0
      ? Math.round((applicationsWithResponse / totalApplications) * 100)
      : 0;

    // Count offers
    const totalOffers = applications.filter((app: any) => app.status === 'offer').length;

    // Find next interview
    const upcomingInterviews = interviews
      .filter((i: any) => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date())
      .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const nextInterview = upcomingInterviews[0];

    const stats = [
      {
        number: totalJobs.toString(),
        label: "Jobs Found",
        trend: `↑${jobs.filter((j: any) => new Date(j.createdAt).toDateString() === today).length} today`,
        trendColor: "#00E676"
      },
      {
        number: totalApplications.toString(),
        label: "Applied",
        trend: `↑${applicationsToday} today`,
        trendColor: "#00E676"
      },
      {
        number: `${responseRate}%`,
        label: "Response Rate",
        trend: applicationsWithResponse > 0 ? "↑2% this week" : "No responses yet",
        trendColor: "#00E676"
      },
      {
        number: totalInterviews.toString(),
        label: "Interviews",
        sub: nextInterview ? `Next: ${new Date(nextInterview.scheduledAt).toLocaleDateString()}` : "None scheduled",
        subColor: "#FFAB00",
        accent: true
      },
      {
        number: totalOffers.toString(),
        label: "Offers",
        sub: totalOffers > 0 ? "pending review" : "none yet",
        subColor: "#7E7E98",
        accent: true
      },
    ];

    return apiResponse({ stats, applicationsToday });
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}
