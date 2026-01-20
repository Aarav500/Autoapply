# CV Compiler - Quick Start Guide

## What This System Does

Transforms your activities into **3 different CV types**:
1. **Industry CV** (1 page) - Google, Meta, OpenAI, Jane Street
2. **Research CV** (2-3 pages) - MIT CSAIL, PhD labs, research internships
3. **College CV** (2-4 pages) - MIT, Stanford, CMU admissions

## The Problem It Solves

Your old CV was:
- ❌ **9 pages** (should be 1-2 for industry, 2-3 for research)
- ❌ **Narrative-driven** (reads like personal statement, not professional CV)
- ❌ **Generic alignment** ("Innovation, Problem Solving" - applies to every school)
- ❌ **Pseudoscientific** ("quantum superpositions" triggers skepticism)
- ❌ **One-size-fits-all** (mixing research + industry + college formats)

## The Solution

**Canonical Experience Graph** → **Target-Specific Rendering** → **Auto Compression**

Same data, three projections:

```
Your Activities
    ↓
Extract metadata (methods, tools, outcomes, scale)
    ↓
Select target: Industry | Research | College
    ↓
Rank by relevance + Compress to page limit
    ↓
Render in target-specific format
```

---

## How to Use

### Step 1: Navigate to New Builder

Open: `http://localhost:3000/cv-builder-v2`

### Step 2: Set Up Profile (One-Time)

Click "Setup Profile" and enter:
- Name, email, phone, location
- LinkedIn, GitHub, Portfolio
- Research paper URL (if applicable)
- Brief summary (optional)

### Step 3: Ensure Activities Are Loaded

The system reads from your existing activities data.
If empty, add activities at: `http://localhost:3000/activities`

### Step 4: Select Target

**For Google/Meta/OpenAI Job:**
1. Select target: **Industry**
2. Set page limit: **1 page**
3. Paste job description
4. Click "Compile INDUSTRY CV"

**For MIT CSAIL Research Internship:**
1. Select target: **Research**
2. Set page limit: **2 pages**
3. Click "Compile RESEARCH CV"

**For MIT Undergrad Application:**
1. Select target: **College**
2. Select college: **MIT**
3. Set page limit: **2-3 pages**
4. Click "Compile COLLEGE CV"

---

## What Each Target Produces

### Industry CV (Example)

```markdown
# Aarav Shah
aarav@email.com | (555) 123-4567 | San Francisco, CA
[LinkedIn](linkedin.com/in/aarav) | [GitHub](github.com/aarav)

---

## Professional Summary

3+ years of experience in Machine Learning and Supply Chain Optimization.
Expertise in Python, PyTorch, AWS, ARIMA, Reinforcement Learning, React.
Proven track record of delivering high-impact production solutions with
measurable business results.

---

## Technical Skills

**Technologies:** Python, PyTorch, React, Next.js, AWS Lambda, PostgreSQL
**Methods:** ARIMA, Reinforcement Learning, QUBO, Neural Networks, Optimization

---

## Professional Experience

### ML Engineer | SAP AI Implementation
*May 2024 - December 2024* • 8 months

- Achieved 23% stockout reduction by implementing ARIMA forecasting with Python/AWS
- Architected system using Reinforcement Learning, QUBO with PyTorch, scikit-learn
- Led team of 5 engineers across production deployment
- Deployed to production serving 1M+ customer transactions

### Software Engineer | F1 Race Insights
*Mar 2023 - Oct 2023* • 7.5 months

- Built end-to-end ML platform achieving 98.7% AUC-ROC using custom neural architecture
- Engineered 68 features from 1,000+ historical races dataset
- Architected system using Neural Networks, Gradient Boosting with Next.js, FastAPI, Docker
- Deployed to production with MLOps monitoring pipeline
```

**Key Features:**
- ✅ Quantified every bullet
- ✅ No narrative language
- ✅ Keywords from job description
- ✅ Production experience highlighted
- ✅ 1 page max

---

### Research CV (Example)

```markdown
# Aarav Shah
aarav@email.com
Research: arxiv.org/abs/2024.xxxxx

---

## Research Interests

Supply Chain Optimization • Quantum Computing • Machine Learning • Accessibility Technology

---

## Publications

- "Quantum-Inspired Supply Chain Optimization using QUBO Formulations"
  IEEE ICSIT 2024 (Under Review)

- "ARIMA-based Demand Forecasting for High-Variance Supply Chains"
  Working Paper, 2024

---

## Research Experience

### Quantum Supply Chain Optimization
*UC Riverside Research Lab* | September 2022 - Present

**Research Question:** Can QUBO formulations improve demand forecasting
accuracy compared to classical ARIMA methods for high-variance supply chains?

**Methods:** QUBO optimization, ARIMA baseline comparison, Reinforcement
Learning integration, Monte Carlo simulation for variance analysis

**Data:** 1M+ customer transactions spanning 5 years, high-variance retail
dataset with seasonal patterns

**Results:** 23% improvement in stockout prediction accuracy vs ARIMA baseline,
maintained 97% service levels, reduced false positives by 18%

**Published:** IEEE ICSIT 2024 (Under Review)

### Hyperspectral Imaging for Material Classification
*UC Riverside Computer Vision Lab* | Jan 2023 - Jun 2023

**Research Question:** Can hyperspectral imaging improve material classification
accuracy for recycling automation?

**Methods:** CNN-based feature extraction, spectral signature analysis,
transfer learning from ImageNet pretrained models

**Data:** 10,000+ hyperspectral images across 50 material categories

**Results:** 94% classification accuracy, 12% improvement over RGB baseline

---

## Technical Projects

### Accessibility Computing Platform
*Independent Research* | 6 months

- Investigated hands-free computer control for quadriplegic users
- Applied nose-tracking algorithms (95% accuracy) with speech recognition integration
- Achieved production-ready system supporting 1M+ potential users
```

**Key Features:**
- ✅ Research questions clearly stated
- ✅ Methods falsifiable and specific
- ✅ Data/evaluation present
- ✅ Publications prominently displayed
- ✅ No marketing language

---

### College CV (Example)

```markdown
# Aarav Shah
aarav@email.com | San Francisco, CA

---

## About Me

Passionate about using technology to solve humanitarian challenges. After
witnessing the Taliban's education ban, I dedicated myself to making STEM
learning accessible. Driven by intellectual curiosity in optimization theory
and a commitment to impact beyond code.

---

## Leadership & Significant Activities

### Daricha Educational Initiative | Curriculum Director
*September 2021 - Present* • 1,950 total hours

When the Taliban banned girls' education in Afghanistan in August 2021, I
watched friends lose access to schooling overnight. Rather than accept this
as inevitable, I joined Daricha to design STEM curricula for underground
schools. Working with 12 volunteer instructors across three provinces, I
adapted lessons for resource-constrained environments—teaching physics with
household items, coding without reliable internet, mathematics through
storytelling. Our enrollment grew from 80 to 200+ students as word spread
through communities. This wasn't just curriculum design; it became an act
of resistance through education.

**Key Outcomes:**
• 200+ Afghan girls receiving STEM education despite Taliban ban
• 12 volunteer instructors trained in remote teaching methods
• 150% enrollment growth from 80 to 200+ students
• Curriculum now used in 3 provinces across Afghanistan

---

### Quantum Supply Chain Research | Research Lead
*September 2022 - Present* • 2,080 total hours

After taking AP Statistics, I became fascinated by prediction—how can we
forecast the fundamentally uncertain? When I learned about supply chain
disruptions during COVID, I saw an opportunity to apply optimization theory
to real-world chaos. I spent two years researching QUBO-based demand
forecasting at UC Riverside, comparing quantum-inspired methods against
classical ARIMA on 1M+ customer transactions. I discovered that quantum
formulations reduced stockouts by 23% while maintaining service levels—proof
that mathematical elegance solves practical problems. This led to a paper
under review at IEEE and showed me how theory transforms into impact.

**Key Outcomes:**
• 23% improvement in demand prediction accuracy
• Paper submitted to IEEE ICSIT 2024 (Under Review)
• 2,080 hours of rigorous research methodology
• Production deployment at SAP serving 1M+ transactions

---

### Accessibility Computing Platform | Founder
*March 2023 - September 2023* • 200 total hours

After my gesture-control hackathon win, I received an email from a
quadriplegic programmer asking if I could adapt the system for nose
tracking. That message changed my perspective—accessibility isn't an edge
case; it's millions of people locked out of the digital world. I spent 200
hours building a complete hands-free computer control system: nose tracking
for cursor movement (95% accuracy), speech recognition for clicks, and
predictive navigation to reduce physical strain. Currently preparing for
open-source release because everyone deserves computer access.

**Key Outcomes:**
• 95% cursor tracking accuracy with nose-movement system
• Hands-free control for 1M+ potential users with disabilities
• Open-source release planned for global accessibility impact
```

**Key Features:**
- ✅ Compelling "why started" narratives
- ✅ Personal connections and growth
- ✅ Quantified outcomes
- ✅ Activities prioritized by impact (>100 hours)
- ✅ Activities <10 hours omitted

---

## Comparison: Before vs After

### BEFORE (Old System - cv-generator-elite.ts)

```
9 PAGES - Generic format mixing research + industry + college

### Quantum Supply Chain Research | Research Lead
By modeling customer intent as quantum superpositions and supply chain states
as entangled probability distributions, I developed a novel quantum-inspired
optimization framework that bridges prescriptive analytics with quantum
computing paradigms... [175 words]

Aligns with MIT's: Innovation, Problem Solving, Intellectual Curiosity
```

**Problems:**
- ❌ 9 pages (industry wants 1, research wants 2-3)
- ❌ Pseudoscientific language triggers skepticism
- ❌ Generic MIT alignment (every school values "innovation")
- ❌ Mixing audiences (research narrative in industry CV)

### AFTER (New System - cv-compiler.ts)

**Industry Version (1 page):**
```
### ML Engineer | Supply Chain Optimization
*Sep 2022 - Present* • 2.5 years

- Achieved 23% stockout reduction by implementing ARIMA + RL forecasting
- Architected demand prediction system using QUBO optimization
- Led team of 5 across production deployment at SAP
- Deployed to production serving 1M+ transactions
```

**Research Version (2 pages):**
```
### Quantum-Inspired Supply Chain Optimization
*UC Riverside* | Sep 2022 - Present

**Research Question:** Can QUBO formulations improve demand forecasting vs ARIMA?
**Methods:** QUBO optimization, ARIMA baseline, RL comparison
**Data:** 1M+ transactions, 5 years historical demand
**Results:** 23% improvement vs baseline, 97% service levels maintained
**Published:** IEEE ICSIT 2024 (Under Review)
```

**College Version (2 pages with narrative):**
```
After taking AP Statistics, I became fascinated by prediction. When I learned
about supply chain disruptions during COVID, I saw an opportunity to apply
optimization theory to real-world uncertainty. I spent 2 years researching
QUBO-based forecasting at UC Riverside, discovering that quantum formulations
reduced stockouts by 23%. This led to a publication and showed me how
mathematical elegance solves practical problems.
```

---

## Key Differences by Target

| Feature | Industry | Research | College |
|---------|----------|----------|---------|
| **Length** | 1 page | 2-3 pages | 2-4 pages |
| **Format** | Bullets only | Research Q + Methods | Narratives + bullets |
| **Language** | Quantified, no narrative | Academic, falsifiable | Personal, reflective |
| **Priority** | Production impact | Publications | Unique experiences |
| **Emphasis** | Keywords, scale | Methodology, rigor | Why started, growth |
| **Avoid** | Research framing | Marketing claims | Generic activities |

---

## Metadata Analysis

After compilation, the system shows:

```
CV Metadata:
- Word Count: 847
- Experiences: 4
- Publications: 1
- Signal Strength: strong
```

**Signal Strength:**
- **Strong**: Has publications OR production deployments
- **Medium**: >5 experiences with quantified outcomes
- **Weak**: <3 experiences or missing metrics

**Warnings:**
- "CV exceeds recommended word count"
- "Too few experiences included"

---

## Next Steps

1. **Test the compiler** at `/cv-builder-v2`
2. **Generate all three versions** (Industry, Research, College)
3. **Compare outputs** to see format differences
4. **Iterate on activities** if signal strength is weak

The system uses your existing activity data - no re-entry required.

---

## Technical Details

**Files:**
- `src/lib/cv-compiler.ts` - Main compiler system
- `src/app/cv-builder-v2/page.tsx` - New UI
- `CV_COMPILER_SYSTEM.md` - Full technical documentation

**Key Functions:**
- `extractExperienceGraph()` - Extract metadata from activities
- `compileCV()` - Main compiler function
- `renderIndustryCV()` - Industry format
- `renderResearchCV()` - Research format
- `renderCollegeCV()` - College format

---

## Gold Standard

If this CV were handed to:
- **MIT ORC** → "This person is already doing our work"
- **DeepMind** → "Production-ready ML engineer"
- **Google Research** → "Clear research trajectory"
- **Jane Street** → "Quantitative rigor, proven execution"

Not:
- ❌ "This is a very impressive student"

That's the difference.
