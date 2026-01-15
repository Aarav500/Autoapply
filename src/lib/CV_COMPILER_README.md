# CV Compiler - Type Compatibility Guide

## Two Compilers Available

### 1. cv-compiler.ts (Original)
- Single CV generation with AI enhancement
- Used by: `/cv-builder` page
- Type: `ExperienceNode` (original)

### 2. cv-compiler-v2.ts (Universal Multi-Target)
- Batch generation (15+ CVs at once)
- Strict mode: no AI, pure compilation
- Type: `ExperienceNode` (v2, backwards compatible)

## Type Compatibility

The v2 `ExperienceNode` is **backwards compatible** with the original type:

```typescript
// cv-compiler.ts ExperienceNode
{
  id, title, role, organization, dates,
  methods, tools, datasets, scale,
  outcomes, domain, category,
  description, impact, researchQuestion, businessContext,
  hours, isPublished, isProduction, isUnique
}

// cv-compiler-v2.ts ExperienceNode (adds optional fields)
{
  ...all fields from above,
  priority?: number,          // Added during ranking
  temporal?: string          // Added to scale object
}
```

**Result:** You can use experiences from `extractExperienceGraph()` (cv-compiler.ts) with `CVCompiler` (v2).

## Usage

### Option 1: Use v2 with existing extraction
```typescript
import { extractExperienceGraph } from '@/lib/cv-compiler';
import { CVCompiler } from '@/lib/cv-compiler-v2';

// Extract using original function
const experiences = extractExperienceGraph(activities, achievements);

// Compile with v2 (backwards compatible)
const compiler = new CVCompiler(experiences, profile);
const cv = compiler.compile(target);
```

### Option 2: Use original compiler
```typescript
import { compileCV, extractExperienceGraph } from '@/lib/cv-compiler';

const experiences = extractExperienceGraph(activities, achievements);
const cv = compileCV(experiences, profile, options);
```

## When to Use Which

| Use Case | Compiler | Why |
|----------|----------|-----|
| Single CV with AI enhancement | cv-compiler.ts | Better quality, AI-polished |
| 15+ CVs at once | cv-compiler-v2.ts | Batch mode, strict enforcement |
| No AI API available | cv-compiler-v2.ts | Works without AI |
| Research/Industry strict mode | cv-compiler-v2.ts | Hard ban list, signal preservation |

## Example Files

See `docs/EXAMPLE_15_CVS.ts.example` for working example of v2 usage.
