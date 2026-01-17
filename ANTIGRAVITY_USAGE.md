# Antigravity CV System - Usage Guide

## Architecture Overview

The Antigravity CV system now implements the **Graph → Claude Projection → Rendering** architecture you specified:

```
User Data
    ↓
Canonical Experience Graph
    ↓
Claude Projection Engine  ← Uses Claude API
    ↓
Deterministic CV Renderer
    ↓
PDF Output
```

## Key Components

### 1. **CV Projection Engine** ([cv-projection-engine.ts](src/lib/cv-projection-engine.ts))
- Uses Claude API to select and rank experiences for each target
- Claude does NOT write text - it only selects which experiences to show
- Outputs: ranked experience IDs + reasoning

### 2. **Target Analyzer** ([target-analyzer.ts](src/lib/target-analyzer.ts))
- Uses Claude API to parse job descriptions and extract requirements
- Extracts: domains, methods, keywords, required skills
- Automatically determines CV mode (research/industry/college)

### 3. **CV Compiler V2** ([cv-compiler-v2.ts](src/lib/cv-compiler-v2.ts))
- Deterministic renderer - NO Claude generation
- Enforces hard grammar rules and page limits
- Banned phrases filter prevents essay language

### 4. **Batch API** ([api/cv/batch/route.ts](src/app/api/cv/batch/route.ts))
- Generate CVs for multiple targets
- Automatically uses Claude projection if API key available
- Fallback to deterministic ranking if Claude unavailable

---

## Usage Examples

### Example 1: Generate CVs for All Predefined Targets

```typescript
import { ALL_TARGETS } from '@/lib/cv-targets';
import { extractExperienceGraph } from '@/lib/cv-compiler';

const experiences = extractExperienceGraph(activities, achievements);
const profile = {
  name: "Aarav Shah",
  email: "aarav@example.com",
  phone: "+1234567890",
  linkedin: "linkedin.com/in/aarav",
  github: "github.com/aarav"
};

// Call batch API
const response = await fetch('/api/cv/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    activities,
    achievements,
    profile,
    targets: ALL_TARGETS, // All 30+ predefined targets
    useClaudeProjection: true // Enable Claude projection
  })
});

const { cvs, summary } = await response.json();

// Result: 30+ CVs, each tailored to specific target
console.log(`Generated ${summary.total} CVs`);
console.log(`Elite quality: ${summary.elite}`);
```

### Example 2: Generate CV for a Custom Job

```typescript
import { TargetAnalyzer } from '@/lib/target-analyzer';
import { CVProjectionEngine } from '@/lib/cv-projection-engine';
import { CVCompiler } from '@/lib/cv-compiler-v2';

const apiKey = process.env.CLAUDE_API_KEY;

// Step 1: Analyze job description using Claude
const analyzer = new TargetAnalyzer(apiKey);
const jobTarget = await analyzer.analyzeJob(
  "Machine Learning Engineer",
  "OpenAI",
  `We're looking for ML engineers to build the next generation of AI systems.
   Required: Python, PyTorch, distributed training, production ML.
   Nice to have: LLMs, RLHF, scalable inference.`,
  2 // 2-page limit
);

// Step 2: Project experiences using Claude
const engine = new CVProjectionEngine(apiKey);
const projection = await engine.projectForTarget(jobTarget, experiences);

// Step 3: Render CV deterministically
const selectedExperiences = projection.rankedExperienceIds.map(id =>
  experiences.find(exp => exp.id === id)
);
const compiler = new CVCompiler(selectedExperiences, profile);
const cv = compiler.compile(jobTarget);

// Result: 2-page CV with only ML production work
console.log(cv.content); // Markdown CV
console.log(cv.metadata.signal); // "elite" | "strong" | "medium" | "weak"
```

### Example 3: Generate CVs for Multiple Custom Jobs

```typescript
import { analyzeJobDescription } from '@/lib/target-analyzer';
import { projectExperiencesForTargets } from '@/lib/cv-projection-engine';
import { CVCompiler } from '@/lib/cv-compiler-v2';

const apiKey = process.env.CLAUDE_API_KEY;

// Step 1: Analyze all jobs using Claude
const jobs = [
  { title: "ML Engineer", company: "Google", description: "...", pageLimit: 2 },
  { title: "Quant Researcher", company: "Jane Street", description: "...", pageLimit: 1 },
  { title: "Research Scientist", company: "OpenAI", description: "...", pageLimit: 2 }
];

const targets = await Promise.all(
  jobs.map(job => analyzeJobDescription(apiKey, job.title, job.company, job.description, job.pageLimit))
);

// Step 2: Project experiences for all targets in parallel
const projections = await projectExperiencesForTargets(apiKey, targets, experiences);

// Step 3: Render CVs
const cvs = targets.map(target => {
  const projection = projections.get(target.id);
  const selectedExps = projection.rankedExperienceIds.map(id =>
    experiences.find(exp => exp.id === id)
  );
  const compiler = new CVCompiler(selectedExps, profile);
  return compiler.compile(target);
});

// Result: 3 different CVs, each optimized for specific role
```

### Example 4: Generate College Application CVs

```typescript
import { COLLEGE_TARGETS } from '@/lib/cv-targets';
import { CVProjectionEngine } from '@/lib/cv-projection-engine';
import { CVCompiler } from '@/lib/cv-compiler-v2';

const apiKey = process.env.CLAUDE_API_KEY;

// Select colleges
const myColleges = COLLEGE_TARGETS.filter(t =>
  ['mit-undergrad', 'stanford-undergrad', 'cmu-undergrad'].includes(t.id)
);

// Project using Claude
const engine = new CVProjectionEngine(apiKey);
const projections = await engine.projectForMultipleTargets(myColleges, experiences);

// Generate CVs
const collegeCVs = myColleges.map(college => {
  const projection = projections.get(college.id);
  const selectedExps = projection.rankedExperienceIds.map(id =>
    experiences.find(exp => exp.id === id)
  );
  const compiler = new CVCompiler(selectedExps, profile);
  return compiler.compile(college);
});

// Result:
// - MIT CV: Research + awards + leadership (3 pages)
// - Stanford CV: Entrepreneurship + innovation + leadership (3 pages)
// - CMU CV: Technical depth + creativity + research (3 pages)
```

---

## API Endpoints

### POST /api/cv/batch
Generate CVs for multiple targets with Claude projection.

**Request:**
```json
{
  "activities": [...],
  "achievements": [...],
  "profile": {
    "name": "Aarav Shah",
    "email": "aarav@example.com"
  },
  "targets": [
    {
      "id": "google-ml",
      "name": "Google ML Engineer",
      "type": "industry",
      "pageLimit": 2
    }
  ],
  "useClaudeProjection": true
}
```

**Response:**
```json
{
  "success": true,
  "cvs": [
    {
      "targetId": "google-ml",
      "targetName": "Google ML Engineer",
      "mode": "industry",
      "content": "# Aarav Shah\n...",
      "metadata": {
        "experienceCount": 6,
        "publicationCount": 2,
        "wordCount": 850,
        "pageEstimate": 2,
        "signal": "elite"
      }
    }
  ],
  "projectionUsed": true,
  "summary": {
    "total": 1,
    "elite": 1,
    "strong": 0,
    "medium": 0,
    "weak": 0
  }
}
```

### POST /api/cv/generate-multi
Advanced batch generation with projection details.

**Request:** Same as `/api/cv/batch`

**Response:** Includes `projections` field with Claude's reasoning:
```json
{
  "success": true,
  "cvs": [...],
  "projections": {
    "google-ml": {
      "rankedExperienceIds": ["exp_1", "exp_3", "exp_5"],
      "reasoning": {
        "exp_1": "Direct match to production ML at scale",
        "exp_3": "Demonstrates distributed systems expertise",
        "exp_5": "Shows ML deployment experience"
      }
    }
  }
}
```

---

## Environment Setup

### Required Environment Variable

```bash
# .env.local
CLAUDE_API_KEY=sk-ant-api03-...
# or
NEXT_PUBLIC_CLAUDE_API_KEY=sk-ant-api03-...
```

### Fallback Behavior

If Claude API key is not available:
- System falls back to deterministic ranking (no Claude projection)
- Still generates valid CVs using rule-based scoring
- No error - seamless degradation

---

## How It Works

### The Claude Projection Pipeline

1. **Input**: Target description + Experience graph
2. **Claude analyzes**:
   - What skills/methods does target need?
   - Which experiences demonstrate those skills?
   - How relevant is each experience? (score 0-100)
3. **Claude outputs**: Ranked list of experience IDs
4. **Compiler renders**: Selected experiences → PDF

### What Claude Does NOT Do

- ❌ Write bullets
- ❌ Generate text
- ❌ Invent experiences
- ❌ Create narratives

### What Claude DOES Do

- ✅ Select relevant experiences
- ✅ Rank by relevance
- ✅ Explain reasoning
- ✅ Filter out irrelevant items

---

## CV Grammar Enforcement

Every bullet must follow:
```
<Action> <Method> <Scale> <Result>
```

**Example:**
```
Built ARIMA + RL forecasting on 500+ SKUs; reduced stock-outs 23%.
```

**Forbidden:**
- when, because, inspired
- I, I believe, I think
- MIT, Stanford, Harvard (target contamination)
- passionate, meaningful, journey

**Auto-removed** if found in source data.

---

## Page Limits (Enforced)

| Target Type | Max Pages | Max Experiences |
|-------------|-----------|-----------------|
| Research    | 3-4       | 8-10            |
| Industry    | 1-2       | 4-8             |
| College     | 2-3       | 10-12           |

Compiler automatically truncates to fit page limits.

---

## Output Quality Signals

Each CV is rated:
- **Elite**: 2+ publications OR 3+ production systems
- **Strong**: 1+ publication OR 2+ production systems
- **Medium**: 5+ experiences with 2+ metrics each
- **Weak**: Everything else

Use this to filter which CVs to send.

---

## Predefined Targets

### Research (5 targets)
- MIT ORC, MIT CSAIL, Stanford CS, CMU SCS, PhD ML

### Industry (8 targets)
- Google ML, OpenAI Research, Meta SWE, Jane Street Quant, Citadel Quant, Amazon SDE, Microsoft SWE

### College (14 targets)
- MIT, Stanford, CMU, Cornell, Georgia Tech, UMich, UIUC, UW, NYU, USC, UT Austin, Northeastern, NUS, UMD

**Total**: 30+ ready-to-use targets

---

## Next Steps

1. ✅ **Set environment variable**: `CLAUDE_API_KEY`
2. ✅ **Build experience graph**: Use existing data extraction
3. ✅ **Call batch API**: `/api/cv/batch` with all targets
4. ✅ **Download PDFs**: Use `/api/cv/download` for each CV
5. ✅ **Review quality**: Check `metadata.signal` for each CV

---

## Architecture Benefits

### Before (Problems)
- ❌ 9-page essay CVs
- ❌ 3-page empty CVs
- ❌ Repeated blocks
- ❌ Target contamination ("MIT philosophy")
- ❌ No relevance filtering

### After (Solutions)
- ✅ Page-bounded (1-4 pages)
- ✅ Target-specific selection
- ✅ Signal-preserving compression
- ✅ Hard grammar enforcement
- ✅ Claude-powered relevance ranking

---

## Example Output

### MIT ORC Research CV (4 pages)
```markdown
# Aarav Shah
aarav@example.com

---

## Research Interests
Operations Research • Quantum Computing • Supply Chain Optimization

## Publications
- Quantum-Classical Hybrid Framework for Supply Chain Optimization (IEEE ICSIT 2025)

## Research Experience

### Quantum-Classical Supply Chain Framework
*GCPL Research Lab* | Jun 2024 - Present

**Methods:** ARIMA, QUBO, Q-Learning, VRP
**Data:** 5 years historical demand (500+ SKUs, 3 warehouses)
**Results:** 12-18% profit improvement, 23% stockout reduction
**Published:** IEEE ICSIT 2025
```

### Google ML Industry CV (2 pages)
```markdown
# Aarav Shah
aarav@example.com | +1234567890

---

## Technical Skills
**Technologies:** Python, PyTorch, TensorFlow, AWS, Docker, FastAPI
**Methods:** ARIMA, RL, QUBO, Forecasting, Optimization

## Professional Experience

### ML Intern | SAP Labs
*May 2024 - Aug 2024*

- Achieved 23% stockout reduction by implementing ARIMA + RL forecasting on 500+ SKU inventory system
- Built production ML pipeline using Python, PyTorch, FastAPI with 97% SLA
- Deployed to AWS serving 200+ daily users
```

### Stanford College CV (3 pages)
```markdown
# Aarav Shah
aarav@example.com

---

## Leadership & Significant Activities

### 1. Quantum-Classical Supply Chain Research
**Lead Researcher** at GCPL Research Lab
*Jun 2024 - Present* | 400 hours

Led research combining quantum computing with classical ML...

**Impact:**
• Published in IEEE ICSIT 2025
• 12-18% profit improvement for real supply chain

**Key Outcomes:**
• First QUBO-based supply chain framework in literature
• Presented at IEEE International Conference

**Skills:** ARIMA, Q-Learning, Python, PyTorch
```

---

## Troubleshooting

### "No CVs generated"
- Check `CLAUDE_API_KEY` environment variable
- Verify experiences array is not empty
- Check API call logs for errors

### "All CVs are 'weak' signal"
- Need more publications or production deployments
- Add metrics to experience outcomes
- Increase hours/scale indicators

### "Page limit exceeded"
- Compiler auto-truncates to fit
- Reduce `maxExperiences` in target definition
- Check `metadata.warnings` for details

---

## Summary

Antigravity is now a **projection engine**, not a "CV writer".

**Core principle**: One canonical experience graph → N target-specific projections

Claude's role: **Select**, not **Write**.

Result: Different CVs for different targets, all from same data, all page-bounded, all signal-dense.
