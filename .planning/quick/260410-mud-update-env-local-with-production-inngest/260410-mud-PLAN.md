---
type: quick
phase: quick-260410-mud
plan: 01
wave: 1
depends_on: []
autonomous: true
files_modified:
  - .env.local
must_haves:
  truths:
    - "Local dev server can authenticate with production Inngest environment"
  artifacts:
    - path: ".env.local"
      provides: "Production Inngest credentials for local development"
      contains: "INNGEST_EVENT_KEY=1cntQ-"
  key_links: []
---

<objective>
Update .env.local with production Inngest keys from Vercel deployment.

Purpose: Replace placeholder "local-dev-key" with actual production keys to enable local dev server to communicate with production Inngest environment.

Output: .env.local configured with production INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.env.local

User provided production Inngest keys from Vercel:
- INNGEST_EVENT_KEY: 1cntQ-JOdz62FA2eL14BRWVH76P8M-5d6pw_kgpVCoCiLefC9HSey3Alm4_VTzcOlwKIu0nQXY0X6dsWIRSSOA
- INNGEST_SIGNING_KEY: signkey-branch-2893c8823a2c05818eaea739153808c95b4745b334f467b569ec8dee1da7ff59
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Inngest environment variables</name>
  <files>.env.local</files>
  <action>
Replace the current Inngest configuration in .env.local:

Current values:
```
INNGEST_ENV=development
INNGEST_EVENT_KEY=local-dev-key
# INNGEST_SIGNING_KEY will be added when deploying to Inngest Cloud
```

New values:
```
INNGEST_ENV=development
INNGEST_EVENT_KEY=1cntQ-JOdz62FA2eL14BRWVH76P8M-5d6pw_kgpVCoCiLefC9HSey3Alm4_VTzcOlwKIu0nQXY0X6dsWIRSSOA
INNGEST_SIGNING_KEY=signkey-branch-2893c8823a2c05818eaea739153808c95b4745b334f467b569ec8dee1da7ff59
```

Keep INNGEST_ENV=development (local dev environment). Replace placeholder INNGEST_EVENT_KEY with production key. Add INNGEST_SIGNING_KEY (uncomment and set value).

Do NOT commit .env.local (gitignored file with secrets).
  </action>
  <verify>
    <automated>grep -E "INNGEST_(EVENT_KEY|SIGNING_KEY)" .env.local | grep -v "local-dev-key"</automated>
  </verify>
  <done>
.env.local contains production INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY values. File shows both keys set with production values (not placeholder). Ready for local dev server to connect to production Inngest environment.
  </done>
</task>

</tasks>

<verification>
After task completion:
1. .env.local file exists with updated Inngest keys
2. INNGEST_EVENT_KEY is set to production value (starts with "1cntQ-")
3. INNGEST_SIGNING_KEY is set to production value (starts with "signkey-branch-")
4. INNGEST_ENV remains "development"
5. File is NOT staged for git commit (gitignored)
</verification>

<success_criteria>
- .env.local updated with production Inngest keys
- Local dev server can authenticate with production Inngest environment
- No secrets committed to git repository
</success_criteria>

<output>
After completion, create `.planning/quick/260410-mud-update-env-local-with-production-inngest/260410-mud-SUMMARY.md`
</output>
