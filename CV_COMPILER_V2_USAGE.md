# CV Compiler V2 - Universal Multi-Target CV System

## What This Is

A **compile-time CV generation system** that:
1. Extracts canonical experience graph from activities
2. Generates 15+ radically different CVs from same data
3. Enforces strict signal preservation (no fluff)
4. Auto-detects target mode (Research/Industry/College)
5. Zero essay phrases, zero first-person

**This is NOT a rewriter. It's a compiler.**

---

## Quick Start

### 1. Basic Single CV

```typescript
import { CVCompiler, ExperienceNode } from '@/lib/cv-compiler-v2';
import { extractExperienceGraph } from '@/lib/cv-compiler';

// Extract graph
const experiences = extractExperienceGraph(activities, achievements);

// Initialize compiler
const compiler = new CVCompiler(experiences, profile);

// Define target
const target = {
  id: 'mit-orc',
  name: 'MIT Operations Research Center',
  type: 'research' as const,
  domains: ['Operations Research', 'Optimization'],
  pageLimit: 3,
};

// Compile
const cv = compiler.compile(target);

console.log(cv.content);           // Markdown CV
console.log(cv.metadata.signal);   // 'elite' | 'strong' | 'medium' | 'weak'
console.log(cv.metadata.warnings); // Signal preservation issues
console.log(cv.metadata.violations); // Ban list violations
```

### 2. Batch Generation (15 CVs at once)

```typescript
const targets = [
  { id: 'mit', name: 'MIT', type: 'research', pageLimit: 3 },
  { id: 'stanford', name: 'Stanford', type: 'research', pageLimit: 3 },
  { id: 'google-ml', name: 'Google ML Engineer', type: 'industry', pageLimit: 2 },
  { id: 'openai', name: 'OpenAI Research Engineer', type: 'industry', pageLimit: 2 },
  // ... 11 more
];

const results = compiler.compileAll(targets);

results.forEach(cv => {
  console.log(`${cv.targetName}: ${cv.metadata.signal} (${cv.metadata.experienceCount} experiences)`);
});
```

### 3. API Endpoint (Batch)

```bash
POST /api/cv/batch
Content-Type: application/json

{
  "activities": [...],
  "achievements": [...],
  "profile": {...},
  "targets": [
    { "id": "mit", "name": "MIT", "type": "research", "pageLimit": 3 },
    { "id": "google", "name": "Google SWE", "type": "industry", "pageLimit": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "cvs": [
    {
      "targetId": "mit",
      "targetName": "MIT",
      "mode": "research",
      "content": "# Your Name\n...",
      "metadata": {
        "signal": "elite",
        "experienceCount": 8,
        "publicationCount": 2,
        "warnings": [],
        "violations": []
      }
    }
  ],
  "summary": {
    "total": 15,
    "elite": 3,
    "strong": 7,
    "medium": 4,
    "weak": 1
  }
}
```

---

## Projection Modes

### Research CV (MIT, Stanford, PhD)

**Keeps:**
- Research projects
- Methods, datasets, experiments
- Publications
- Technical depth

**Drops:**
- Leadership roles
- Volunteer work
- Entrepreneurship
- Essay-style narratives

**Format:**
```
### Project Title
*Lab/Organization* | Dates

**Methods:** ARIMA, LSTM, Quantum Annealing
**Data:** 5 years historical, 1M+ SKUs
**Results:** 23% reduction in stockouts, 97% service level
**Published:** IEEE ICSIT 2024
```

**Output:** 3-4 pages, dense technical content

---

### Industry CV (Google, OpenAI, Quant)

**Keeps:**
- Production systems
- Enterprise ML
- Scale metrics
- Deployments

**Drops:**
- Academic narratives
- Community service
- Chess/Olympiads
- Research questions

**Format:**
```
### Software Engineer | SAP
*Jan 2023 - Present*

- Achieved 23% reduction in stockouts by implementing quantum-inspired optimization on 1M+ SKUs
- Built forecasting system using ARIMA, LSTM with Python, PyTorch, AWS Lambda
- Deployed to production serving 200+ users across EMEA region
```

**Output:** 1-2 pages, action-oriented bullets

---

### College CV (Admissions)

**Keeps:**
- Leadership roles
- Service & impact
- Research highlights
- Awards & recognition

**Drops:**
- Deep technical architecture
- Quantum math details
- Enterprise system specs

**Format:**
```
### Afghan Curriculum Translation | Founder
*Sep 2021 - Present* • 800 total hours

Led translation of educational materials for Afghan refugees displaced by Taliban regime.
Coordinated team of 12 translators across 3 provinces.
Materials now used by 500+ students in refugee education programs.

**Key Outcomes:**
• Translated 200+ pages of STEM curriculum
• Reached 500+ students in refugee camps
• Featured in local education summit
```

**Output:** 2-3 pages, narrative + outcomes

---

## Auto-Detection

The compiler can **auto-detect target mode** from name/description:

```typescript
import { inferTargetMode } from '@/lib/cv-compiler-v2';

inferTargetMode({ name: 'MIT CSAIL PhD' })
// → 'research'

inferTargetMode({ name: 'Google ML Engineer', description: 'Build production ML systems' })
// → 'industry'

inferTargetMode({ name: 'Harvard University', description: 'Undergraduate admissions' })
// → 'college'
```

---

## Signal Preservation

### ✅ VALID Bullets (have metric OR method)

```
- Achieved 23% reduction using ARIMA forecasting
- Built system with PyTorch serving 1M+ users
- Published at IEEE ICSIT 2024
- Optimized algorithm reducing latency by 40%
```

### ❌ INVALID Bullets (no metric, no method)

```
- Worked on interesting projects
- Learned about machine learning
- Contributed to team success
- Passionate about technology
```

**These are AUTO-DELETED by the compiler.**

---

## Ban List (Hard Constraint)

These phrases trigger **immediate removal**:

```
"I", "When", "Because", "Inspired", "I realized", "I watched",
"Aligns with", "Mens et Manus", "MIT", "belief", "passion",
"I believe", "fascinated", "my passion"
```

**If found:** Replaced with `[REMOVED]` and logged as violation.

---

## Target Specification

```typescript
interface CVTarget {
  id: string;           // Unique identifier
  name: string;         // Display name
  type: 'research' | 'industry' | 'college';

  // Intelligence
  domains?: string[];   // ['ML', 'Operations Research']
  keywords?: string[];  // Extracted from job posting
  prioritySignals?: string[]; // ['publications', 'production']

  // Constraints
  pageLimit: 1 | 2 | 3 | 4;
  maxExperiences?: number;

  // Context
  description?: string; // Job posting or college focus
}
```

---

## Example: 15-Target Pipeline

```typescript
// Define 15 targets
const colleges = [
  { id: 'mit', name: 'MIT', focus: ['Operations Research', 'AI'] },
  { id: 'stanford', name: 'Stanford CS', focus: ['ML', 'Systems'] },
  { id: 'berkeley', name: 'UC Berkeley', focus: ['AI', 'Theory'] },
  // ... 7 more
];

const jobs = [
  {
    id: 'google-ml',
    title: 'ML Engineer',
    company: 'Google',
    description: 'Build production ML systems at scale using Python, TensorFlow...'
  },
  {
    id: 'openai',
    title: 'Research Engineer',
    company: 'OpenAI',
    description: 'Develop and deploy large language models...'
  },
  // ... 3 more
];

// Build target list
const targets = buildTargetList(colleges, jobs);

// Compile all
const compiler = new CVCompiler(experiences, profile);
const allCVs = compiler.compileAll(targets);

// Export
allCVs.forEach(cv => {
  const filename = `CV_${cv.targetId}.md`;
  fs.writeFileSync(filename, cv.content);
  console.log(`✓ ${cv.targetName}: ${cv.metadata.signal}`);
});
```

---

## Quality Metrics

### Signal Strength

- **Elite**: 2+ publications OR 3+ production deployments
- **Strong**: 1+ publication OR 2+ production deployments
- **Medium**: 5+ experiences with strong metrics
- **Weak**: <5 experiences or weak metrics

### Metadata Output

```typescript
{
  experienceCount: 8,
  publicationCount: 2,
  wordCount: 1200,
  pageEstimate: 2,
  signal: 'elite',
  violations: [],        // Ban list violations
  warnings: [            // Signal preservation issues
    'Weak bullet (no metric/method): "Worked on projects"'
  ]
}
```

---

## Integration with Existing System

### Option A: Replace Old Compiler

```typescript
// OLD (cv-compiler.ts)
import { compileCV } from '@/lib/cv-compiler';

// NEW (cv-compiler-v2.ts)
import { CVCompiler } from '@/lib/cv-compiler-v2';
const compiler = new CVCompiler(experiences, profile);
const cv = compiler.compile(target);
```

### Option B: Side-by-Side (Recommended)

Keep both:
- `cv-compiler.ts` - For single CV generation with AI enhancement
- `cv-compiler-v2.ts` - For batch generation, strict mode

---

## Next Steps

1. **Test with your data**
   ```bash
   cd college-essay-app
   npm run dev
   # Visit /api/cv/batch
   ```

2. **Create frontend for batch generation**
   - `/cv-batch` page
   - Select targets (checkboxes for 15 colleges/jobs)
   - Generate all → Download as ZIP

3. **Add PDF export**
   - Use `markdown-pdf` or `puppeteer`
   - Generate PDF for each target

4. **Add target templates**
   - Pre-configure 15 common targets
   - MIT, Stanford, Google, OpenAI, etc.

---

## Files

- **Core**: [`src/lib/cv-compiler-v2.ts`](src/lib/cv-compiler-v2.ts)
- **API**: [`src/app/api/cv/batch/route.ts`](src/app/api/cv/batch/route.ts)
- **Docs**: This file

---

**Status**: ✅ Core system implemented
**Next**: Build frontend + PDF export
