# AutoApply - Autonomous Job Hunting AI System

## System Architecture v1.0

---

## Overview

AutoApply is a fully autonomous job hunting and career management AI system that runs 24/7 to:
- Manage professional profiles (resume, skills, experience)
- Optimize GitHub and LinkedIn presence
- Search and apply for jobs across ALL platforms
- Generate tailored CVs, cover letters, and application documents
- Handle email communications autonomously
- Schedule interviews via WhatsApp/SMS
- Prepare users for interviews with AI coaching

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **UI Components**: Radix UI primitives + custom components
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **API**: Next.js API Routes (Edge + Node.js runtime)
- **Microservices**: Python (FastAPI) for AI/scraping tasks
- **Authentication**: NextAuth.js v5
- **Validation**: Zod

### Database
- **Primary**: PostgreSQL 16
- **ORM**: Prisma 5.x
- **Migrations**: Prisma Migrate

### Storage
- **Documents**: AWS S3 (or Cloudflare R2)
- **Cache**: Redis 7.x

### AI Services
- **Primary LLM**: Claude API (Anthropic) - claude-3-opus/sonnet
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Search**: PostgreSQL pgvector extension

### Background Jobs
- **Queue**: BullMQ 5.x
- **Scheduler**: BullMQ repeatable jobs
- **Worker**: Node.js workers

### External Integrations
- **Email**: Gmail API, Microsoft Graph API
- **SMS/WhatsApp**: Twilio
- **Email Sending**: SendGrid
- **Calendar**: Google Calendar API
- **Version Control**: GitHub API
- **Professional Network**: LinkedIn API (unofficial scraping)

### DevOps
- **Hosting**: Vercel (frontend) + Railway/Render (workers)
- **Monitoring**: Sentry
- **Analytics**: PostHog

---

## Module Architecture

### 1. Profile Engine

**Purpose**: Store and manage user career data

**Features**:
- Personal information management
- Work history with achievements
- Education records
- Skills matrix with proficiency levels
- Portfolio projects with GitHub integration
- Career goals and preferences
- Salary expectations and location preferences
- Skill assessment and gap analysis

**Database Models**: `User`, `Profile`, `Experience`, `Education`, `Skill`, `UserSkill`

**API Endpoints**:
```
GET    /api/profile              - Get current user profile
PUT    /api/profile              - Update profile
POST   /api/profile/experience   - Add work experience
PUT    /api/profile/experience/:id
DELETE /api/profile/experience/:id
POST   /api/profile/education    - Add education
PUT    /api/profile/education/:id
DELETE /api/profile/education/:id
POST   /api/profile/skills       - Add/update skills
GET    /api/profile/analysis     - Get skill gap analysis
```

---

### 2. Platform Optimizer

**Purpose**: GitHub & LinkedIn profile enhancement

**Features**:
- GitHub profile completeness analysis
- README optimization suggestions
- Repository showcase recommendations
- Profile bio optimization
- Pin repository suggestions
- Contribution graph analysis
- LinkedIn headline optimization
- About section enhancement
- Experience bullet point improvements
- Skills endorsement strategy
- Profile strength scoring
- Step-by-step improvement tasks

**API Endpoints**:
```
GET  /api/optimize/github           - Analyze GitHub profile
GET  /api/optimize/github/tasks     - Get improvement tasks
POST /api/optimize/github/complete  - Mark task complete
GET  /api/optimize/linkedin         - Analyze LinkedIn profile
GET  /api/optimize/linkedin/tasks   - Get improvement tasks
POST /api/optimize/linkedin/complete
```

**Background Jobs**:
- `platform:analyze:github` - Full GitHub analysis
- `platform:analyze:linkedin` - LinkedIn analysis

---

### 3. Job Hunter

**Purpose**: Multi-platform job scraping and matching

**Features**:
- Multi-platform job scraping:
  - LinkedIn Jobs
  - Indeed
  - Glassdoor
  - AngelList/Wellfound
  - WeWorkRemotely
  - RemoteOK
  - HackerNews Jobs
  - Y Combinator Jobs
  - Company career pages
- AI-powered job matching based on profile
- Job quality scoring
- Salary estimation
- Company research automation
- Application deadline tracking
- Duplicate detection
- Saved searches with alerts

**Database Models**: `Job`, `SavedSearch`, `JobMatch`

**API Endpoints**:
```
GET    /api/jobs                  - List matched jobs
GET    /api/jobs/:id              - Get job details
POST   /api/jobs/:id/bookmark     - Bookmark job
DELETE /api/jobs/:id/bookmark     - Remove bookmark
GET    /api/jobs/search           - Search jobs
POST   /api/jobs/saved-search     - Create saved search
GET    /api/jobs/company/:name    - Get company info
```

**Background Jobs**:
- `job:scrape` - Scrape all platforms (every 6 hours)
- `job:match` - Calculate match scores (after scrape)
- `job:expire` - Mark expired jobs

---

### 4. Document Generator

**Purpose**: AI-powered CV/cover letter creation

**Features**:
- Multiple ATS-optimized CV templates
- Job-specific cover letter generation
- Portfolio PDF creation
- Reference sheet preparation
- Thank you email templates
- Follow-up email templates
- Salary negotiation scripts
- Document versioning
- A/B testing document variants

**Database Models**: `Document`, `DocumentVersion`, `Template`

**API Endpoints**:
```
GET    /api/documents             - List user documents
POST   /api/documents/cv          - Generate CV
POST   /api/documents/cover-letter - Generate cover letter
POST   /api/documents/portfolio   - Generate portfolio PDF
GET    /api/documents/:id         - Get document
GET    /api/documents/:id/download - Download document
DELETE /api/documents/:id
GET    /api/templates             - List available templates
```

**Background Jobs**:
- `document:generate` - Generate document for job
- `document:optimize` - AI improve document

---

### 5. Auto Applicant

**Purpose**: Autonomous job application submission

**Features**:
- Form auto-fill with Playwright
- LinkedIn Easy Apply automation
- Indeed Easy Apply automation
- Application tracking
- Status updates from platforms
- Duplicate application prevention
- Rate limiting to avoid detection
- CAPTCHA handling (manual fallback)
- Application success analytics
- Configurable auto-apply rules

**Database Models**: `Application`, `ApplicationLog`, `AutoApplyRule`

**API Endpoints**:
```
GET    /api/applications          - List applications
POST   /api/applications          - Create manual application
GET    /api/applications/:id      - Get application details
PUT    /api/applications/:id      - Update status
POST   /api/apply/auto            - Trigger auto-apply
GET    /api/apply/rules           - Get auto-apply rules
PUT    /api/apply/rules           - Update rules
GET    /api/apply/analytics       - Get success analytics
```

**Background Jobs**:
- `job:apply` - Auto-apply to matched jobs
- `application:track` - Check application statuses

---

### 6. Communication Hub

**Purpose**: Email handling and interview scheduling

**Features**:
- Email inbox monitoring (Gmail/Outlook)
- AI email classification:
  - Recruiter outreach
  - Interview requests
  - Rejections
  - Offers
  - Follow-ups
  - Spam
- Auto-response generation
- Interview scheduling with calendar
- Recruiter relationship tracking
- Sentiment analysis
- Email thread management
- Quick response suggestions

**Database Models**: `Email`, `EmailThread`, `Recruiter`

**API Endpoints**:
```
GET    /api/inbox                 - List emails
GET    /api/inbox/:id             - Get email details
POST   /api/inbox/:id/reply       - Send reply
POST   /api/inbox/:id/classify    - Reclassify email
GET    /api/inbox/threads         - List threads
GET    /api/recruiters            - List recruiters
GET    /api/recruiters/:id        - Get recruiter details
POST   /api/inbox/connect         - Connect email account
DELETE /api/inbox/disconnect      - Disconnect account
```

**Background Jobs**:
- `email:sync` - Sync emails (every 5 minutes)
- `email:classify` - AI classify new emails
- `email:respond` - Generate/send responses

---

### 7. Interview Coach

**Purpose**: Interview preparation and coaching

**Features**:
- Company research compilation
- Role-specific common questions
- STAR method answer generator
- Technical interview preparation
- Behavioral question prep
- Salary negotiation coaching
- Questions to ask interviewer
- Mock interview practice (text-based)
- Post-interview analysis
- Interview performance tracking

**Database Models**: `Interview`, `InterviewPrep`, `InterviewQuestion`

**API Endpoints**:
```
GET    /api/interviews            - List interviews
GET    /api/interviews/:id        - Get interview details
PUT    /api/interviews/:id        - Update interview
POST   /api/interviews/:id/prep   - Generate prep materials
GET    /api/interviews/:id/questions - Get practice questions
POST   /api/interviews/:id/mock   - Start mock interview
POST   /api/interviews/:id/feedback - Submit feedback
GET    /api/coach/company/:name   - Research company
GET    /api/coach/salary          - Salary negotiation tips
```

**Background Jobs**:
- `interview:prep` - Generate prep materials
- `interview:remind` - Send reminders

---

### 8. Notification System

**Purpose**: Real-time updates via SMS/WhatsApp

**Features**:
- WhatsApp notifications via Twilio
- SMS notifications via Twilio
- Email notifications via SendGrid
- Push notifications (web)
- Notification preferences
- Digest emails (daily/weekly)
- Interview reminders
- Application status updates
- New job match alerts
- Deadline reminders

**Database Models**: `Notification`, `NotificationPreference`

**API Endpoints**:
```
GET    /api/notifications         - List notifications
PUT    /api/notifications/:id/read - Mark as read
GET    /api/notifications/preferences - Get preferences
PUT    /api/notifications/preferences - Update preferences
POST   /api/notifications/test    - Send test notification
```

**Background Jobs**:
- `notification:send` - Send queued notifications
- `notification:digest` - Send daily/weekly digests

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ USER & AUTH ============

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  phone           String?
  whatsappNumber  String?
  timezone        String   @default("UTC")
  avatarUrl       String?

  // Relations
  profile         Profile?
  jobs            Job[]
  applications    Application[]
  documents       Document[]
  emails          Email[]
  interviews      Interview[]
  notifications   Notification[]
  savedSearches   SavedSearch[]

  // Auth
  accounts        Account[]
  sessions        Session[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============ PROFILE ============

model Profile {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  headline         String?
  summary          String?  @db.Text
  location         String?
  remotePreference String?  // remote, hybrid, onsite, any
  willingToRelocate Boolean @default(false)

  salaryMin        Int?
  salaryMax        Int?
  salaryCurrency   String   @default("USD")

  yearsOfExperience Int?

  // External profiles
  githubUrl        String?
  githubUsername   String?
  githubData       Json?    // Cached analysis
  linkedinUrl      String?
  linkedinData     Json?    // Cached analysis
  portfolioUrl     String?
  personalWebsite  String?

  // Primary resume
  resumeS3Key      String?
  resumeUpdatedAt  DateTime?

  // Relations
  skills           Skill[]
  experiences      Experience[]
  education        Education[]

  // Completion tracking
  completionScore  Int      @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Skill {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  name        String
  category    String?  // technical, soft, language, tool
  proficiency Int?     // 1-5
  yearsOfExp  Float?
  isHighlight Boolean  @default(false)

  createdAt   DateTime @default(now())

  @@unique([profileId, name])
}

model Experience {
  id           String    @id @default(cuid())
  profileId    String
  profile      Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)

  company      String
  title        String
  location     String?
  locationType String?   // remote, hybrid, onsite

  startDate    DateTime
  endDate      DateTime?
  isCurrent    Boolean   @default(false)

  description  String?   @db.Text
  achievements String[]  // Bullet points
  skills       String[]  // Skills used in this role

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Education {
  id          String    @id @default(cuid())
  profileId   String
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)

  institution String
  degree      String
  field       String?

  startDate   DateTime
  endDate     DateTime?
  isCurrent   Boolean   @default(false)

  gpa         Float?
  gpaScale    Float?    @default(4.0)
  honors      String[]
  activities  String[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// ============ JOBS ============

model Job {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Job details
  title           String
  company         String
  companyLogo     String?
  location        String?
  locationType    String?  // remote, hybrid, onsite

  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String?
  salaryPeriod    String?  // yearly, monthly, hourly

  description     String   @db.Text
  requirements    String?  @db.Text
  benefits        String?  @db.Text

  // Source tracking
  sourceUrl       String
  sourcePlatform  String   // linkedin, indeed, glassdoor, etc.
  externalId      String?

  // AI analysis
  matchScore      Float?   // 0-100
  matchReasons    String[] // Why it matches
  missingSkills   String[] // Skills gap

  // User actions
  isBookmarked    Boolean  @default(false)
  isHidden        Boolean  @default(false)
  viewedAt        DateTime?

  // Application
  application     Application?

  // Timestamps
  postedAt        DateTime?
  expiresAt       DateTime?
  scrapedAt       DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([sourcePlatform, externalId])
  @@index([userId, matchScore])
  @@index([userId, isBookmarked])
}

model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  query       String
  filters     Json     // Location, salary, remote, etc.

  isActive    Boolean  @default(true)
  alertFrequency String @default("daily") // instant, daily, weekly

  lastRunAt   DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============ APPLICATIONS ============

model Application {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId           String   @unique
  job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  status          String   @default("applied")
  // applied, screening, phone_screen, interview, technical,
  // onsite, offer, negotiation, accepted, rejected, withdrawn

  appliedAt       DateTime @default(now())
  appliedVia      String?  // manual, auto, easy_apply

  // Documents used
  resumeDocId     String?
  coverLetterDocId String?

  // Tracking
  lastActivity    DateTime @default(now())
  nextFollowUp    DateTime?

  notes           String?  @db.Text

  // Relations
  emails          Email[]
  interviews      Interview[]
  logs            ApplicationLog[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, status])
}

model ApplicationLog {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  action        String      // status_change, note_added, email_sent, etc.
  oldValue      String?
  newValue      String?
  description   String?

  createdAt     DateTime    @default(now())
}

// ============ DOCUMENTS ============

model Document {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // resume, cover_letter, portfolio, reference, other
  name        String

  s3Key       String
  s3Url       String?
  mimeType    String   @default("application/pdf")
  fileSize    Int?

  version     Int      @default(1)
  isDefault   Boolean  @default(false)

  // For job-specific documents
  forJobId    String?
  forCompany  String?

  // AI metadata
  extractedText String? @db.Text
  aiSummary     String? @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, type])
}

// ============ EMAILS ============

model Email {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicationId   String?
  application     Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull)

  // Email metadata
  externalId      String       @unique
  threadId        String?
  provider        String       // gmail, outlook

  from            String
  fromName        String?
  to              String
  toName          String?
  cc              String[]
  subject         String

  bodyText        String       @db.Text
  bodyHtml        String?      @db.Text

  hasAttachments  Boolean      @default(false)
  attachments     Json?

  // AI classification
  classification  String?      // recruiter, rejection, interview, offer, follow_up, spam
  confidence      Float?
  sentiment       String?      // positive, neutral, negative

  // Actions
  isRead          Boolean      @default(false)
  isStarred       Boolean      @default(false)
  isArchived      Boolean      @default(false)
  isProcessed     Boolean      @default(false)

  // AI response
  suggestedReply  String?      @db.Text
  replySent       Boolean      @default(false)
  replySentAt     DateTime?

  receivedAt      DateTime
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([userId, classification])
  @@index([userId, isRead])
  @@index([threadId])
}

// ============ INTERVIEWS ============

model Interview {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicationId   String
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  // Interview details
  type            String      // phone_screen, video, technical, onsite, panel, final
  round           Int         @default(1)

  scheduledAt     DateTime?
  duration        Int?        // minutes
  timezone        String?

  location        String?     // URL for video, address for onsite
  meetingLink     String?

  // Participants
  interviewers    Json?       // Array of {name, title, linkedinUrl}

  status          String      @default("pending")
  // pending, confirmed, completed, cancelled, rescheduled, no_show

  // Preparation
  prepMaterials   Json?       // AI-generated prep
  practiceQuestions String[]

  // Post-interview
  notes           String?     @db.Text
  feedback        String?     @db.Text
  rating          Int?        // 1-5 self-rating

  // Calendar
  calendarEventId String?

  // Reminders
  reminderSent24h Boolean     @default(false)
  reminderSent1h  Boolean     @default(false)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId, scheduledAt])
  @@index([userId, status])
}

// ============ NOTIFICATIONS ============

model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // interview_reminder, new_match, status_update, etc.
  channel     String   // app, email, sms, whatsapp

  title       String
  body        String   @db.Text
  data        Json?    // Additional context

  isRead      Boolean  @default(false)
  readAt      DateTime?

  sentAt      DateTime?
  deliveredAt DateTime?
  failedAt    DateTime?
  failureReason String?

  createdAt   DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, type])
}

model NotificationPreference {
  id          String   @id @default(cuid())
  userId      String   @unique

  // Channels enabled
  emailEnabled    Boolean @default(true)
  smsEnabled      Boolean @default(false)
  whatsappEnabled Boolean @default(false)
  pushEnabled     Boolean @default(true)

  // Notification types
  newMatches      Boolean @default(true)
  statusUpdates   Boolean @default(true)
  interviewReminders Boolean @default(true)
  deadlineReminders Boolean @default(true)
  weeklyDigest    Boolean @default(true)

  // Quiet hours
  quietHoursStart String? // "22:00"
  quietHoursEnd   String? // "08:00"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============ SYSTEM ============

model AutoApplyRule {
  id          String   @id @default(cuid())
  userId      String

  isEnabled   Boolean  @default(false)

  // Filters
  minMatchScore    Int      @default(80)
  maxApplicationsPerDay Int @default(10)
  excludeCompanies String[]
  excludeKeywords  String[]

  // Timing
  applyWindowStart String  @default("09:00")
  applyWindowEnd   String  @default("17:00")
  timezone         String  @default("UTC")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId])
}

model JobScrapingLog {
  id          String   @id @default(cuid())
  platform    String

  startedAt   DateTime
  completedAt DateTime?

  jobsFound   Int      @default(0)
  jobsNew     Int      @default(0)
  jobsUpdated Int      @default(0)

  status      String   @default("running") // running, completed, failed
  error       String?

  createdAt   DateTime @default(now())
}
```

---

## Background Jobs Specification

### Job Queues

```typescript
// lib/jobs/queues.ts

export const QUEUES = {
  // Job hunting
  JOB_SCRAPE: 'job:scrape',
  JOB_MATCH: 'job:match',
  JOB_APPLY: 'job:apply',
  JOB_EXPIRE: 'job:expire',

  // Email
  EMAIL_SYNC: 'email:sync',
  EMAIL_CLASSIFY: 'email:classify',
  EMAIL_RESPOND: 'email:respond',

  // Documents
  DOCUMENT_GENERATE: 'document:generate',
  DOCUMENT_OPTIMIZE: 'document:optimize',

  // Platform optimization
  PLATFORM_GITHUB: 'platform:analyze:github',
  PLATFORM_LINKEDIN: 'platform:analyze:linkedin',

  // Interviews
  INTERVIEW_PREP: 'interview:prep',
  INTERVIEW_REMIND: 'interview:remind',

  // Notifications
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_DIGEST: 'notification:digest',
} as const;
```

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `job:scrape` | Every 6 hours | Scrape all job platforms |
| `job:match` | After scrape | Calculate match scores |
| `job:expire` | Daily at 2am | Mark expired jobs |
| `job:apply` | Every hour (9-5) | Auto-apply to jobs |
| `email:sync` | Every 5 minutes | Sync email inbox |
| `interview:remind` | Every 15 minutes | Send interview reminders |
| `notification:digest` | Daily at 8am | Send daily digest |

---

## API Authentication

All API routes require authentication via NextAuth.js session or API key.

```typescript
// middleware.ts
export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"]
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/autoapply"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# AI
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# Storage
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET="autoapply-docs"

# Redis
REDIS_URL="redis://localhost:6379"

# Email
GMAIL_CLIENT_ID=""
GMAIL_CLIENT_SECRET=""
SENDGRID_API_KEY=""

# Notifications
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
TWILIO_WHATSAPP_NUMBER=""

# Calendar
GOOGLE_CALENDAR_CLIENT_ID=""
GOOGLE_CALENDAR_CLIENT_SECRET=""
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── profile/page.tsx
│   │   ├── optimize/page.tsx           # Platform optimizer
│   │   ├── jobs/page.tsx
│   │   ├── jobs/[id]/page.tsx
│   │   ├── applications/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── interviews/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── profile/route.ts
│   │   ├── profile/experience/route.ts
│   │   ├── profile/education/route.ts
│   │   ├── profile/skills/route.ts
│   │   ├── optimize/github/route.ts
│   │   ├── optimize/linkedin/route.ts
│   │   ├── jobs/route.ts
│   │   ├── jobs/[id]/route.ts
│   │   ├── applications/route.ts
│   │   ├── applications/[id]/route.ts
│   │   ├── documents/route.ts
│   │   ├── documents/[id]/route.ts
│   │   ├── inbox/route.ts
│   │   ├── inbox/[id]/route.ts
│   │   ├── interviews/route.ts
│   │   ├── interviews/[id]/route.ts
│   │   ├── notifications/route.ts
│   │   └── webhooks/
│   │       ├── twilio/route.ts
│   │       └── email/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── features/
│   │   ├── profile/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── documents/
│   │   ├── inbox/
│   │   └── interviews/
│   └── layouts/
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── dashboard-layout.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   ├── api-client.ts
│   ├── ai/
│   │   ├── claude.ts
│   │   ├── embeddings.ts
│   │   └── prompts/
│   ├── jobs/
│   │   ├── queues.ts
│   │   ├── workers.ts
│   │   └── handlers/
│   ├── scrapers/
│   │   ├── linkedin.ts
│   │   ├── indeed.ts
│   │   ├── glassdoor.ts
│   │   └── ...
│   ├── email/
│   │   ├── gmail.ts
│   │   ├── outlook.ts
│   │   └── classifier.ts
│   └── notifications/
│       ├── twilio.ts
│       └── sendgrid.ts
├── hooks/
│   ├── use-profile.ts
│   ├── use-jobs.ts
│   ├── use-applications.ts
│   └── ...
├── stores/
│   ├── profile-store.ts
│   ├── jobs-store.ts
│   └── ui-store.ts
├── types/
│   ├── index.ts
│   ├── profile.ts
│   ├── jobs.ts
│   └── ...
└── workers/
    ├── index.ts           # Worker entry point
    ├── job-worker.ts
    ├── email-worker.ts
    └── notification-worker.ts
```

---

## UI Design System

### Color Palette (Dark Luxe)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a24;
  --bg-elevated: #22222e;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;

  /* Accent (Electric Blue) */
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
  --accent-muted: #3b82f620;

  /* Status */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Borders */
  --border-subtle: #27272a;
  --border-default: #3f3f46;
}
```

### Typography

- **Headings**: Inter (700)
- **Body**: Inter (400)
- **Monospace**: JetBrains Mono

### Component Patterns

- Glass morphism cards with subtle blur
- Smooth micro-animations (150-300ms)
- Skeleton loading states
- Toast notifications (bottom-right)
- Modal dialogs for destructive actions

---

## Security Considerations

1. **Authentication**: NextAuth.js with secure session handling
2. **API Security**: Rate limiting, input validation with Zod
3. **Data Encryption**: Sensitive data encrypted at rest
4. **S3 Security**: Pre-signed URLs, private bucket
5. **Secrets Management**: Environment variables, no hardcoded secrets
6. **XSS Prevention**: Content Security Policy, input sanitization
7. **CSRF Protection**: Built into NextAuth.js

---

## Monitoring & Observability

1. **Error Tracking**: Sentry for error monitoring
2. **Analytics**: PostHog for product analytics
3. **Logging**: Structured JSON logs
4. **Metrics**: Job queue depths, API latencies
5. **Alerting**: PagerDuty/Slack for critical issues

---

## Phase Implementation Schedule

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Foundation (Setup, Auth, DB) | Week 1 |
| 2 | Profile & Documents | Week 2 |
| 3 | Job Hunting | Week 3 |
| 4 | Auto-Apply | Week 4 |
| 5 | Communication Hub | Week 5 |
| 6 | Interviews & Notifications | Week 6 |
| 7 | Platform Optimization | Week 7 |
| 8 | Polish & Automation | Week 8 |

---

*Document Version: 1.0*
*Last Updated: 2025-02-04*
