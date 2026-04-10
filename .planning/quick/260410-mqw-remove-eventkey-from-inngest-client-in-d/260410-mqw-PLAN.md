---
phase: quick-260410-mqw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inngest/client.ts
  - .env.local
autonomous: true
requirements: []

must_haves:
  truths:
    - eventKey is only used when INNGEST_ENV is production
    - Development mode Inngest client works without eventKey
    - .env.local no longer contains INNGEST_EVENT_KEY
  artifacts:
    - path: lib/inngest/client.ts
      provides: Conditional eventKey configuration based on environment
      min_lines: 8
  key_links:
    - from: lib/inngest/client.ts
      to: process.env.INNGEST_ENV
      via: Environment check for eventKey inclusion
      pattern: "process\\.env\\.INNGEST_ENV"
---

<objective>
Make eventKey conditional on production environment in Inngest client configuration.

Purpose: The Inngest dev server doesn't require eventKey for local development. Including it unnecessarily creates configuration overhead and potential confusion. Production deployments need eventKey for proper event routing, but development should work without it.

Output: Updated Inngest client that only includes eventKey when running in production environment.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/CLAUDE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/lib/inngest/client.ts
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.env.local
</context>

<interfaces>
<!-- Current Inngest client configuration -->
From lib/inngest/client.ts:
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pilactive-helper",
  env: process.env.INNGEST_ENV ?? "development",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

<!-- Inngest client configuration signature -->
Inngest constructor accepts optional eventKey field:
```typescript
new Inngest({
  id: string;
  env?: string;
  eventKey?: string;
})
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Make eventKey conditional on production environment</name>
  <files>lib/inngest/client.ts, .env.local</files>
  <action>
Update Inngest client configuration to only include eventKey when INNGEST_ENV is 'production':

1. Modify lib/inngest/client.ts:
   - Change eventKey configuration to be conditional:
     ```typescript
     export const inngest = new Inngest({
       id: "pilactive-helper",
       env: process.env.INNGEST_ENV ?? "development",
       ...(process.env.INNGEST_ENV === "production" && {
         eventKey: process.env.INNGEST_EVENT_KEY,
       }),
     });
     ```
   - This uses the spread operator with a conditional object to only include eventKey when env is production
   - The ?? operator ensures we default to "development" if INNGEST_ENV is not set

2. Remove INNGEST_EVENT_KEY from .env.local:
   - Delete the line `INNGEST_EVENT_KEY=local-dev-key`
   - Keep the comment about INNGEST_SIGNING_KEY for future reference
   - This removes unnecessary local configuration

Why this approach:
- Inngest dev server works perfectly without eventKey for local development
- Production environments need eventKey for proper event routing to Inngest Cloud
- Conditional inclusion keeps configuration clean and intentional
- No need to set dummy values for local development
  </action>
  <verify>
    <automated>
# Verify eventKey is conditionally included
grep -q "process\.env\.INNGEST_ENV === \"production\"" lib/inngest/client.ts && echo "✓ Conditional eventKey found" || echo "✗ Conditional eventKey missing"

# Verify .env.local no longer has INNGEST_EVENT_KEY
! grep -q "INNGEST_EVENT_KEY=" .env.local && echo "✓ INNGEST_EVENT_KEY removed from .env.local" || echo "✗ INNGEST_EVENT_KEY still in .env.local"

# Verify TypeScript compilation passes
npx tsc --noEmit && echo "✓ TypeScript compilation successful" || echo "✗ TypeScript errors"
    </automated>
  </verify>
  <done>
1. lib/inngest/client.ts contains conditional eventKey based on production environment
2. .env.local no longer contains INNGEST_EVENT_KEY dummy value
3. TypeScript compilation passes without errors
4. Inngest client configuration is cleaner for development while production-ready
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| config→runtime | Environment variables control production behavior |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-mqw-01 | Information Disclosure | eventKey in logs | accept | eventKey is not sensitive in production context - used for routing only |
| T-mqw-02 | Denial of Service | Missing eventKey in prod | mitigate | Conditional check ensures eventKey only used when INNGEST_ENV=production, deployment validation will catch missing env var |
</threat_model>

<verification>
1. Conditional eventKey configuration exists in lib/inngest/client.ts
2. .env.local no longer contains INNGEST_EVENT_KEY
3. TypeScript compilation successful
4. Configuration pattern follows Inngest best practices for environment-based config
</verification>

<success_criteria>
1. Inngest client only includes eventKey when INNGEST_ENV is "production"
2. Development mode works without eventKey configuration
3. .env.local is cleaned up (INNGEST_EVENT_KEY removed)
4. No TypeScript errors
5. Configuration is production-ready and cleaner for local development
</success_criteria>

<output>
After completion, create `.planning/quick/260410-mqw-remove-eventkey-from-inngest-client-in-d/260410-mqw-SUMMARY.md`
</output>
