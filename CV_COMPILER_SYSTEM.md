# CV COMPILER SYSTEM - Architecture Documentation

## PROBLEM SOLVED

The previous CV generation system was:
- **Narrative-driven** (like personal statements)
- **Generic** (same format for all targets)
- **Bloated** (9 pages when industry expects 1, research expects 2-3)
- **Pseudoscientific** (quantum language triggering skepticism)
- **Structurally wrong** (mixing research/industry/college formats)

## NEW ARCHITECTURE

The CV Compiler System transforms activities into **three distinct CV types**, each optimized for different audiences.

### System Flow

```
Raw Activities + Achievements
    ↓
Canonical Experience Graph (extracted metadata)
    ↓
Target Selection (Industry / Research / College)
    ↓
Signal Ranking + Compression
    ↓
Target-Specific Rendering
    ↓
Final CV (1-4 pages, ATS-ready)
```

---

## 1. CANONICAL EXPERIENCE GRAPH

**File:** `src/lib/cv-compiler.ts`

Every activity is transformed into an `ExperienceNode` containing:

```typescript
interface ExperienceNode {
    // Identity
    title, organization, role, dates

    // Methods & Execution
    methods: ["ARIMA", "Reinforcement Learning", "QUBO"]
    tools: ["Python", "PyTorch", "AWS Lambda"]
    datasets: ["1M+ customer transactions"]
    scale: { team, users, budget, geographic }

    // Outcomes & Evidence
    outcomes: {
        metrics: ["23% reduction in stockouts"]
        publications: ["IEEE ICSIT 2024"]
        deployments: ["Production at SAP"]
        awards: ["1st place hackathon"]
    }

    // Classification
    domain: "Supply Chain Optimization"
    category: 'research' | 'industry' | 'leadership' | 'volunteer'

    // Metadata
    hours, isPublished, isProduction, isUnique
}
```

### Extraction Engine

**Function:** `extractExperienceGraph(activities, achievements)`

Automatically extracts:
- **Methods**: Pattern matching for ML/AI/stats terms
- **Tools**: Detects programming languages, frameworks, cloud platforms
- **Datasets**: Finds scale mentions ("1M users", "5 years of data")
- **Outcomes**: Extracts metrics with regex ("23% improvement", "$50K revenue")
- **Publications**: Links achievements with category = "publication"
- **Scale**: Team size, user counts, budget, geographic reach

**Example:**

```
Raw activity description:
"Led implementation of ARIMA-based demand forecasting system for 1M+ customers,
reducing stockouts by 23% while maintaining 97% service levels using Python and AWS."

Extracted node:
- methods: ["ARIMA"]
- tools: ["Python", "AWS"]
- datasets: ["1M+ customers"]
- scale: { users: "1M+ customers" }
- outcomes.metrics: ["23% reduction in stockouts", "97% service levels"]
- category: "industry"
- isProduction: true
```

---

## 2. TARGET-SPECIFIC RENDERERS

### A. INDUSTRY CV (Google / Meta / OpenAI / Jane Street)

**Rendering Function:** `renderIndustryCV()`

**Format:**
```
Professional Summary (with job keywords)
Technical Skills (tools + methods)
Professional Experience (ordered by relevance)
    → Bullets: Action → Method → Scale → Outcome
```

**Bullet Format (X-Y-Z):**
```
✅ Achieved 23% stockout reduction by implementing ARIMA forecasting with Python/AWS
❌ Responsible for improving supply chain efficiency through technical implementations
```

**Rules:**
- NO narrative language
- NO philosophical framing
- EVERY bullet = quantified outcome
- Keywords from job description emphasized
- Max 2 lines per bullet
- No research questions, no "exploring", no "investigating"

**Example Output:**
```markdown
## Professional Summary

3+ years of experience in Machine Learning and Supply Chain Optimization.
Expertise in Python, PyTorch, AWS, ARIMA, Reinforcement Learning. Proven track
record of delivering high-impact solutions with measurable business results.

## Technical Skills

**Technologies:** Python, PyTorch, React, AWS Lambda, PostgreSQL, Docker
**Methods:** ARIMA, Reinforcement Learning, Neural Networks, Optimization

## Professional Experience

### ML Engineer | SAP AI Implementation
*May 2024 - December 2024* • 8 months

- Achieved 23% stockout reduction by implementing ARIMA forecasting with Python/AWS
- Architected system using Reinforcement Learning, QUBO with PyTorch, scikit-learn
- Led team of 5 engineers across 3-month production deployment
- Deployed to production serving 1M+ customer transactions
```

### B. RESEARCH CV (MIT / Stanford / PhD Labs)

**Rendering Function:** `renderResearchCV()`

**Format:**
```
Research Interests
Publications (if any)
Research Experience
    → Research Question
    → Methods
    → Data
    → Results
    → Published (venue)
Technical Projects
```

**Rules:**
- Lead with research question
- Methods must be specific and falsifiable
- Data/evaluation section required
- Publications cited prominently
- No marketing language ("game-changing", "revolutionary")
- Benchmarked results preferred over claims

**Example Output:**
```markdown
## Research Interests

Supply Chain Optimization • Quantum Computing • Machine Learning

## Publications

- "Quantum-Inspired Supply Chain Optimization using QUBO Formulations"
  IEEE ICSIT 2024 (Under Review)

## Research Experience

### Quantum Supply Chain Research
*UC Riverside Research Lab* | September 2022 - Present

**Research Question:** Can quantum-inspired optimization improve demand
forecasting accuracy for high-variance supply chains?

**Methods:** QUBO formulation, ARIMA baseline comparison, Reinforcement Learning

**Data:** 1M+ customer transactions, 5 years historical demand

**Results:** 23% improvement in stockout prediction, 97% service level maintained

**Published:** IEEE ICSIT 2024 (Under Review)
```

### C. COLLEGE CV (MIT / Stanford / Undergrad Admissions)

**Rendering Function:** `renderCollegeCV()`

**Format:**
```
About Me (personal vision)
Leadership & Significant Activities
    → Narrative (why started + what did + impact)
    → Key Outcomes (bulleted)
Honors & Awards
```

**Narrative Format (75-150 words):**
```
Context: Why you started (personal connection, moment of realization)
Action: What you built/led (specific methods/tools)
Result: Quantified impact (metrics, reach, outcomes)
Learning: Growth + future connection
```

**Example Output:**
```markdown
## About Me

Passionate about using technology to solve humanitarian challenges. Driven by
intellectual curiosity in machine learning and supply chain optimization, with
deep commitment to making technical education accessible.

## Leadership & Significant Activities

### Daricha Educational Initiative | Curriculum Director
*September 2021 - Present* • 1,950 total hours

When the Taliban banned girls' education in Afghanistan in 2021, I watched
friends lose access to schooling overnight. Rather than accept this as
inevitable, I joined Daricha to design STEM curricula for underground schools.
Working with 12 volunteer instructors across provinces, I adapted lessons for
resource-constrained environments—teaching physics with household items, coding
without reliable internet. Our enrollment grew 150% to 200+ students as word
spread through communities.

**Key Outcomes:**
• 200+ Afghan girls receiving STEM education
• 12 volunteer instructors trained
• 150% enrollment growth over 2 years
```

---

## 3. SIGNAL COMPRESSION ENGINE

**Function:** `compressToPageLimit(experiences, pageLimit)`

Automatically trims experiences based on page limits:

| Page Limit | Max Experiences | Target Use Case |
|------------|----------------|-----------------|
| 1 page     | 4 experiences  | Industry job applications |
| 2 pages    | 8 experiences  | Research internships, most CVs |
| 3 pages    | 12 experiences | PhD applications |
| 4 pages    | 16 experiences | College admissions (comprehensive) |

**Prioritization Algorithm:**

```typescript
function scoreExperienceForTarget(exp, options):
    score = hours / 100  // Base score from time invested

    if target === 'industry':
        if isProduction: score += 15
        if category === 'industry': score += 10
        if deployments exist: score += 10
        if scale.users exists: score += 5
        if matches job keywords: score += 3 per keyword

    if target === 'research':
        if isPublished: score += 20
        if category === 'research': score += 15
        if researchQuestion exists: score += 10
        if methods.length > 3: score += 5

    if target === 'college':
        if isUnique: score += 15
        if hours > 500: score += 10
        if volunteer or leadership: score += 10
        if awards exist: score += 8

    return score
```

**Automatic Omissions:**
- Activities < 10 hours (unless extraordinary - e.g., published paper)
- Generic volunteer work with no measurable outcomes
- Old experiences (>4 years) unless highly significant
- Duplicate/overlapping experiences

---

## 4. JOB DESCRIPTION PARSER

**Function:** `extractJobKeywords(jobDescription)`

Automatically extracts:
- **Technical terms**: Python, React, AWS, ML, API, etc.
- **Skills**: leadership, communication, problem-solving
- **Methods**: Agile, Scrum, CI/CD
- **Domains**: fintech, healthcare, e-commerce

**Keyword Injection:**
- Professional summary includes top 7-10 keywords
- First bullet of each experience uses 2-3 keywords
- Technical skills section mirrors JD terminology exactly

**Example:**

```
JD: "Looking for Python expert with React, AWS, ML experience. Must have
strong communication and teamwork skills."

Extracted keywords: [python, react, aws, ml, communication, teamwork]

Professional summary:
"3+ years of Python and React development with AWS deployment experience.
Proven ML expertise with strong communication and teamwork skills..."
```

---

## 5. USAGE GUIDE

### Access the New System

1. Navigate to: `http://localhost:3000/cv-builder-v2`
2. Set up profile (name, email, links)
3. Ensure activities are loaded from `/activities` page

### Generate Industry CV

1. Select target: **Industry**
2. Set page limit: **1 page**
3. Paste job description
4. Click **Compile INDUSTRY CV**

**What you get:**
- ATS-optimized format
- Job keywords in summary
- X-Y-Z bullet format
- Technical skills section
- Ordered by relevance to job

### Generate Research CV

1. Select target: **Research**
2. Set page limit: **2-3 pages**
3. Click **Compile RESEARCH CV**

**What you get:**
- Research interests section
- Publications prominently displayed
- Research question for each project
- Methods, data, results structure
- No marketing language

### Generate College CV

1. Select target: **College**
2. Select college: **MIT** (or target school)
3. Set page limit: **2-4 pages**
4. Click **Compile COLLEGE CV**

**What you get:**
- Narrative-driven activities
- "Why started" context
- Quantified outcomes
- College-specific alignment
- Leadership emphasis

---

## 6. QUALITY STANDARDS

### Industry CV Validation

✅ **PASS:**
- Every bullet quantified
- No narrative language
- Keywords from JD present
- Production experience highlighted
- 1 page for <5 years experience

❌ **FAIL:**
- Generic phrases ("responsible for")
- Missing metrics
- Philosophical language
- > 2 lines per bullet
- Research framing in industry context

### Research CV Validation

✅ **PASS:**
- Research questions stated
- Methods falsifiable
- Data/evaluation present
- Publications cited
- Results benchmarked

❌ **FAIL:**
- Marketing claims
- Missing methodology
- No data description
- Vague results ("significant improvement")
- Business language in research context

### College CV Validation

✅ **PASS:**
- Compelling narratives
- Personal connections
- Quantified impact
- Leadership demonstrated
- Unique experiences highlighted

❌ **FAIL:**
- Generic activities
- Missing "why" context
- No personal voice
- Duplicate activities
- > 4 pages for undergrad

---

## 7. COMPARISON: OLD vs NEW

### OLD SYSTEM (cv-generator-elite.ts)

```markdown
## Quantum Supply Chain Research | Research Lead

By modeling customer intent as quantum superpositions and supply chain
states as entangled probability distributions, I developed a novel
quantum-inspired optimization framework that bridges prescriptive analytics
with quantum computing paradigms...

**Aligns with MIT's:** Innovation, Problem Solving, Intellectual Curiosity

[175 words of narrative]
```

**Problems:**
- ❌ Pseudoscientific language ("quantum superpositions")
- ❌ Triggers skepticism
- ❌ Generic MIT alignment
- ❌ Too long for industry
- ❌ No clear research question for academia
- ❌ Mixed audience (trying to be research + industry + college)

### NEW SYSTEM (cv-compiler.ts)

**Industry version (1 page):**
```markdown
### ML Engineer | Supply Chain Optimization
*Sep 2022 - Present* • 2.5 years

- Achieved 23% stockout reduction by implementing ARIMA + RL forecasting with Python/AWS
- Architected demand prediction system using QUBO optimization, serving 1M+ transactions
- Led team of 5 across 8-month production deployment at SAP
- Deployed to production with 97% service level maintenance
```

**Research version (2 pages):**
```markdown
### Quantum-Inspired Supply Chain Optimization
*UC Riverside Research Lab* | Sep 2022 - Present

**Research Question:** Can QUBO formulations improve demand forecasting
accuracy compared to classical ARIMA methods for high-variance supply chains?

**Methods:** QUBO optimization, ARIMA baseline, Reinforcement Learning comparison

**Data:** 1M+ customer transactions, 5 years historical demand

**Results:** 23% improvement in stockout prediction accuracy vs ARIMA baseline,
maintained 97% service levels across test period

**Published:** IEEE ICSIT 2024 (Under Review)
```

**College version (2 pages with narrative):**
```markdown
### Quantum Supply Chain Research | Research Lead
*Sep 2022 - Present* • 2,080 total hours

After taking AP Statistics, I became fascinated by prediction—how can we
forecast something inherently uncertain? When I learned about supply chain
disruptions during COVID, I saw an opportunity to apply optimization theory
to real-world uncertainty. I spent 2 years researching QUBO-based demand
forecasting at UC Riverside, comparing quantum-inspired methods against
classical ARIMA. Working with 1M+ customer transactions, I discovered that
quantum formulations reduced stockouts by 23% while maintaining service
levels. This led to a publication (under review at IEEE) and showed me how
mathematical elegance can solve practical problems.

**Key Outcomes:**
• 23% improvement in prediction accuracy
• Paper submitted to IEEE ICSIT 2024
• 2,080 hours of rigorous research
```

---

## 8. TECHNICAL IMPLEMENTATION

### File Structure

```
src/lib/
  cv-compiler.ts              # Main compiler system
  cv-generator-elite.ts       # Old system (still used for legacy)
  cv-intelligence.ts          # Activity scoring (still used)
  colleges-data.ts            # College information database

src/app/
  cv-builder/                 # Old CV builder (narrative-focused)
  cv-builder-v2/              # NEW CV compiler interface
```

### Key Functions

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `extractExperienceGraph` | Extract metadata from activities | Activities, Achievements | ExperienceNode[] |
| `compileCV` | Main compiler | ExperienceNodes, Profile, Options | CompiledCV |
| `renderIndustryCV` | Industry rendering | ExperienceNodes, Profile | Markdown string |
| `renderResearchCV` | Research rendering | ExperienceNodes, Profile | Markdown string |
| `renderCollegeCV` | College rendering | ExperienceNodes, Profile | Markdown string |
| `rankExperiencesForTarget` | Prioritize by target | ExperienceNodes, Options | Ranked nodes |
| `compressToPageLimit` | Trim to page limit | Ranked nodes, PageLimit | Trimmed nodes |
| `extractJobKeywords` | Parse job description | Job description text | Keyword array |

### Compiler Options

```typescript
interface CVCompilerOptions {
    target: 'industry' | 'research' | 'college'
    pageLimit: 1 | 2 | 3 | 4
    jobDescription?: string      // For industry
    collegeId?: string           // For college
    emphasis?: 'technical' | 'leadership' | 'impact' | 'research'
}
```

---

## 9. TESTING CHECKLIST

### Test Case 1: Google SWE Job

**Setup:**
- Target: Industry
- Page limit: 1
- Job description: "Python, ML, distributed systems, scalable APIs"

**Expected output:**
- ✅ 1 page max
- ✅ Keywords: Python, ML, distributed, scalable, API
- ✅ No narrative language
- ✅ Quantified bullets only
- ✅ Production experience first

### Test Case 2: MIT CSAIL Research Internship

**Setup:**
- Target: Research
- Page limit: 2
- No job description needed

**Expected output:**
- ✅ Research questions for all projects
- ✅ Methods + Data + Results structure
- ✅ Publications listed prominently
- ✅ No marketing language
- ✅ Academic tone throughout

### Test Case 3: MIT Undergrad Application

**Setup:**
- Target: College
- College: MIT
- Page limit: 2-3

**Expected output:**
- ✅ Compelling narratives
- ✅ "Why started" context
- ✅ Daricha work prominent (1,950 hours)
- ✅ Quantum research (2,080 hours)
- ✅ Specific MIT lab/professor connections
- ✅ Activities < 10 hours omitted

---

## 10. FUTURE ENHANCEMENTS

### Phase 2 (Planned)

- [ ] **LaTeX export** for academic CVs
- [ ] **ATS score prediction** (keyword density analysis)
- [ ] **College-specific templates** (MIT vs Stanford vs CMU)
- [ ] **Industry-specific templates** (Google vs Meta vs Jane Street)
- [ ] **Achievement auto-linking** (connect publications to activities automatically)
- [ ] **Multi-language support** (for international applications)

### Phase 3 (Research)

- [ ] **AI-powered bullet generation** (use LLM to rewrite bullets in X-Y-Z format)
- [ ] **Gap analysis** (identify missing skills for target job/college)
- [ ] **Competitive benchmarking** (compare to successful CVs in target domain)
- [ ] **Timeline visualization** (show experience progression graphically)

---

## CONCLUSION

The CV Compiler System solves the fundamental problem of **audience mismatch**.

Instead of one generic CV trying to be everything, it generates **three distinct projections** of the same data:
- **Industry**: Execution-focused, keyword-dense, quantified
- **Research**: Question-driven, methodological, falsifiable
- **College**: Narrative-rich, human-centered, growth-oriented

This is the difference between:
- ❌ "This is a very impressive student"
- ✅ "This person is already operating at our level"

Navigate to `/cv-builder-v2` to use the new system.
