# Feature Research

**Domain:** Automated Gym Class Booking Systems
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **User Authentication** | Store credentials securely to enable automated booking | LOW | Must handle session timeout (gym APIs expire sessions after 5-60 minutes). Need secure credential storage per user. |
| **Event/Class Listing** | Users must see what classes are available to automate | LOW | Display upcoming classes in chronological order with details (name, time, date, location). Real-time availability updates. |
| **Scheduled Booking Execution** | Core automation value - book exactly when booking window opens | HIGH | Must execute at precise timestamp (e.g., exactly 7 days before at same time). Requires reliable job scheduler (cloud-based, always-on). |
| **View Scheduled Bookings** | Users need visibility into what's queued for automation | LOW | List all pending automated bookings with ability to review details before execution. |
| **Cancel Scheduled Bookings** | Users must be able to remove bookings before execution | LOW | Delete from queue before booking executes. Different from canceling actual gym bookings post-execution. |
| **Success/Failure Notifications** | Users need confirmation that automation worked (or didn't) | MEDIUM | Email/SMS/in-app notifications when booking succeeds or fails. Critical for trust in automation. |
| **Basic Error Handling** | Automation must handle transient failures gracefully | MEDIUM | Network timeouts, temporary API unavailability. Without this, users lose trust in system. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Recurring Pattern Automation** | Set-and-forget: "Pilates every Tuesday 18:00" | MEDIUM | Eliminates weekly manual selection. Matches PROJECT.md requirement. User configures pattern once, system books indefinitely. |
| **Intelligent Retry Logic** | Auto-retry failed bookings with exponential backoff | MEDIUM | Handles transient failures (API timeouts, rate limits). Max 5 retries with doubling delays. Beyond 5 attempts requires manual intervention. |
| **Session Refresh Management** | Automatically refreshes expired gym API sessions | MEDIUM | Gym APIs expire sessions (codice_sessione). System detects expiry and re-authenticates without user intervention. Critical for reliability. |
| **Multi-User Isolation** | Each user manages their own credentials and bookings independently | MEDIUM | No shared credential management. Complete isolation between users. Privacy-first approach. |
| **Precise Timing Execution** | Books at exact moment booking window opens (to the second) | HIGH | Competitive advantage when classes fill in seconds. Requires sub-minute precision scheduling. |
| **Booking Conflict Detection** | Warns if attempting to book overlapping classes | LOW | UX enhancement - prevents user from accidentally double-booking same time slot. |
| **Event Filtering/Search** | Filter classes by type, time, instructor, location | LOW | Reduces cognitive load when selecting from many classes. Nice UX improvement. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Centralized Credential Management** | Convenient for admin to manage all users | Security risk, liability, privacy violation. Single point of failure. | Each user stores their own credentials. Zero-knowledge architecture. |
| **Immediate Booking (Not Scheduled)** | "Book me into this class right now" | Defeats automation purpose. Gym API already provides this via their app. Scope creep. | Focus on scheduled automation only. Users can book immediately via gym's native app. |
| **Booking History/Analytics** | "Show me my past bookings" | Out of scope - gym's native app already provides this. Unnecessary duplication. Data sync complexity. | Direct users to gym's app for historical data. |
| **Class Waitlist Management** | "Auto-join waitlist if full" | Complex logic with low ROI. Gym API may not expose waitlist endpoints. Different timing rules. | Defer until validated need. Most value is in booking when spots open. |
| **Payment Processing** | "Pay for classes through app" | Major regulatory/security burden (PCI compliance). Gym already handles payments. Massive scope increase. | Payment happens through gym's system. Out of scope entirely. |
| **Social Features** | "See what classes my friends booked" | Privacy concerns, feature creep. Not core to automation value proposition. | Keep focused on individual automation. Users coordinate externally. |
| **Real-time Availability Polling** | "Alert me when a full class has opening" | Resource intensive. Requires constant API polling. API rate limit risks. Low value compared to scheduled booking. | Focus on scheduling when booking windows open, not monitoring for openings. |
| **Mobile Native App** | "I want iOS/Android app" | 3x development cost (web, iOS, Android). Deployment complexity. PROJECT.md explicitly excludes this. | Progressive Web App provides mobile-friendly experience without native app overhead. |

## Feature Dependencies

```
[Authentication]
    └──requires──> [Session Management]
    
[Scheduled Booking Execution]
    └──requires──> [Authentication]
    └──requires──> [Job Scheduler]
    └──requires──> [Event Selection]
    
[Recurring Pattern Automation]
    └──requires──> [Scheduled Booking Execution]
    └──enhances──> [Event Selection]
    
[Retry Logic]
    └──requires──> [Scheduled Booking Execution]
    └──enhances──> [Error Handling]
    
[Notifications]
    └──requires──> [Scheduled Booking Execution]
    └──provides feedback for──> [All booking operations]
    
[Multi-User]
    └──requires──> [Authentication]
    └──isolates──> [All user data]
    
[Cancel Scheduled Booking]
    └──requires──> [View Scheduled Bookings]
```

### Dependency Notes

- **Authentication requires Session Management:** Gym API sessions expire (codice_sessione). Cannot maintain authentication without session refresh logic.
- **Scheduled Booking requires Job Scheduler:** Need cloud-based cron/scheduler to execute bookings at exact timestamps. Cannot rely on user's device being online.
- **Recurring Patterns require Scheduled Booking:** Recurring automation builds on single booking execution. Cannot have recurring without basic scheduling.
- **Retry Logic enhances Scheduled Booking:** Failed bookings need retry capability. Improves success rate for transient failures (network timeouts, temporary API issues).
- **Multi-User isolates all data:** Each user has separate credentials, bookings, notifications. Zero shared state between users. Privacy and security requirement.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **User Authentication** — Store gym credentials per user. Essential for any automation.
- [ ] **Event Listing** — Display available classes chronologically. Users must see what they can automate.
- [ ] **Single Event Scheduling** — Select one class, schedule booking 7 days before. Core value proposition.
- [ ] **Scheduled Execution** — Reliable job scheduler executes booking at precise timestamp. The automation itself.
- [ ] **Success/Failure Notifications** — Email notification when booking completes. Trust/feedback essential.
- [ ] **View Scheduled Bookings** — See list of pending automated bookings. Visibility requirement.
- [ ] **Cancel Scheduled Booking** — Remove booking from queue before execution. Control requirement.
- [ ] **Basic Error Handling** — Log failures, show error message. Minimum reliability.
- [ ] **Multi-User Support** — Each user has separate credentials and bookings. PROJECT.md requirement.

**Rationale:** These 9 features form the minimum automation loop: authenticate → select class → schedule → execute → notify → manage queue. Validates core value: "automated booking when window opens."

### Add After Validation (v1.x)

Features to add once core is working and validated with initial users.

- [ ] **Recurring Pattern Automation** — PROJECT.md requirement. Add after single booking works. Trigger: Users manually add same class weekly (signals demand).
- [ ] **Intelligent Retry Logic** — Improves reliability. Add after observing failure patterns. Trigger: More than 10% booking failure rate due to transient errors.
- [ ] **Session Refresh Management** — Critical for long-term reliability. Add when session expiry causes failures. Trigger: First session timeout error in production.
- [ ] **Booking Conflict Detection** — UX polish. Add when users report double-booking confusion. Trigger: User feedback or observed behavior.
- [ ] **Event Filtering/Search** — UX improvement for large class lists. Trigger: Gym has >20 classes per week.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Advanced Retry Strategies** — Exponential backoff, jitter, circuit breaker. Defer until v1 retry shows need for sophistication.
- [ ] **Booking Rule Customization** — "Only book if specific instructor" or "prefer morning over evening". Defer until users request customization.
- [ ] **Batch Operations** — "Schedule all my Tuesday classes at once". Nice-to-have, not essential. Wait for user demand.
- [ ] **Analytics Dashboard** — Success rates, most popular classes, booking trends. Data-driven insights. Defer until significant user base.
- [ ] **Multiple Notification Channels** — SMS, push notifications, Slack. Email sufficient for MVP. Add based on user preference data.
- [ ] **Calendar Integration** — Export scheduled bookings to Google Calendar, iCal. Convenience feature, not core. Defer until requested.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| User Authentication | HIGH | LOW | P1 |
| Event Listing | HIGH | LOW | P1 |
| Single Event Scheduling | HIGH | MEDIUM | P1 |
| Scheduled Execution | HIGH | HIGH | P1 |
| Success/Failure Notifications | HIGH | MEDIUM | P1 |
| View Scheduled Bookings | HIGH | LOW | P1 |
| Cancel Scheduled Booking | HIGH | LOW | P1 |
| Basic Error Handling | HIGH | MEDIUM | P1 |
| Multi-User Support | HIGH | MEDIUM | P1 |
| Recurring Pattern Automation | HIGH | MEDIUM | P2 |
| Intelligent Retry Logic | MEDIUM | MEDIUM | P2 |
| Session Refresh Management | HIGH | MEDIUM | P2 |
| Booking Conflict Detection | LOW | LOW | P2 |
| Event Filtering/Search | MEDIUM | LOW | P2 |
| Advanced Retry Strategies | LOW | HIGH | P3 |
| Booking Rule Customization | LOW | HIGH | P3 |
| Batch Operations | LOW | MEDIUM | P3 |
| Analytics Dashboard | LOW | MEDIUM | P3 |
| Multiple Notification Channels | MEDIUM | MEDIUM | P3 |
| Calendar Integration | LOW | MEDIUM | P3 |

**Priority key:**
- **P1**: Must have for launch — MVP
- **P2**: Should have, add when possible — v1.x
- **P3**: Nice to have, future consideration — v2+

## Competitor Feature Analysis

| Feature | Commercial Gym Software (Glofox, Virtuagym) | DIY Booking Bots (GitHub examples) | Our Approach |
|---------|---------------------------------------------|-------------------------------------|--------------|
| **Booking Automation** | User-side self-booking with reminders. Not automated scheduling. | Automated booking via cron jobs, CLI, or API. User-facing automation. | User-facing automation like DIY bots, but with polished UI. |
| **Recurring Bookings** | Recurring class schedules (gym operator creates recurring classes). Members book individually. | JSON config for weekly patterns (classesByDay.json). Manual configuration. | UI-driven recurring pattern configuration. Set and forget. |
| **Multi-User** | Full gym membership system with roles, permissions, billing. Enterprise complexity. | Single user or manual config file per user. No multi-tenant architecture. | Lightweight multi-user: isolated credentials and bookings per user. No billing/admin. |
| **Notifications** | Automated pre-class reminders, waitlist alerts, marketing emails. Gym operator perspective. | Success/failure console logs or basic email. Minimal user feedback. | Focused notifications: booking success/failure only. User perspective. |
| **Session Management** | Not applicable (gym software is the source system). | Manual re-authentication or brittle token handling. | Automatic session refresh with error recovery. |
| **Error Handling** | Enterprise-grade with admin dashboards, retry queues, monitoring. | Basic error logs, often fails silently. No retry logic. | Intelligent retry (exponential backoff, max 5 attempts) with user notifications. |
| **Timing Precision** | Not applicable (users book manually when window opens). | Cron jobs (minute-level precision). Often 7am daily checks. | Sub-minute precision scheduling. Books at exact second booking window opens. |
| **Ease of Use** | Mobile apps, web portals. Polished UX for gym members. | CLI, JSON config files, technical setup. Developer-only. | React/Next.js/shadcn/ui. Non-technical user friendly. |

## Real-World Implementation Patterns (From Research)

### Pattern 1: Midnight Booking Rush
**Context:** Classes become bookable at midnight, 7-8 days in advance. Popular classes fill within minutes.
**User Pain:** Setting alarms for midnight to manually book is disruptive.
**Solution:** Automated cron job executes booking at exact moment window opens.
**Source:** Medium article on gym subscription bot, GitHub gymbox-bot

### Pattern 2: Session Expiry During Scheduling
**Context:** Gym API sessions (codice_sessione) expire after 5-60 minutes of inactivity.
**Problem:** Scheduled job runs hours/days after authentication. Session expired when booking executes.
**Solution:** Re-authenticate immediately before booking execution, or detect 401 errors and retry with fresh session.
**Source:** BookingCenter documentation, OWASP session management guidelines

### Pattern 3: Transient API Failures
**Context:** Gym APIs can be temporarily unavailable (5xx errors, network timeouts, rate limits 429).
**Problem:** Single failed booking attempt means user loses spot in class.
**Solution:** Retry logic with exponential backoff. Max 5 attempts. 1s → 2s → 4s → 8s → 16s delays.
**Source:** Automation error handling best practices (n8n, Azure Logic Apps, Power Automate documentation)

### Pattern 4: Recurring Weekly Classes
**Context:** Users attend same class every week (e.g., "Pilates Reformer Tuesday 18:00").
**User Pain:** Manually selecting same class every week is repetitive.
**Solution:** Recurring pattern configuration. User sets pattern once, system books indefinitely every week.
**Source:** GitHub gymbox-bot (classesByDay.json), PROJECT.md requirements

### Pattern 5: Multi-User Privacy
**Context:** Small user group (family/friends), each with separate gym accounts.
**Problem:** Centralized credentials create security risk and privacy violation.
**Solution:** Each user manages their own credentials. Zero-knowledge architecture. Complete data isolation.
**Source:** PROJECT.md constraints, security best practices

## Common Mistakes to Avoid

Based on research into fitness booking software pitfalls:

### 1. Inadequate Error Communication
**Mistake:** Silent failures. User doesn't know booking failed until class is missed.
**Prevention:** Always send notification on both success AND failure. Include error details for failures.

### 2. Ignoring Session Lifecycle
**Mistake:** Store credentials once, assume they work forever. Sessions expire.
**Prevention:** Implement session refresh logic. Detect 401 errors and re-authenticate automatically.

### 3. No Retry Logic for Transient Failures
**Mistake:** Single API call fails due to network hiccup, user loses booking opportunity.
**Prevention:** Implement exponential backoff retry for 5xx, 429, timeout errors. Max 5 attempts. Alert user after final failure.

### 4. Poor Integration Testing
**Mistake:** Not testing against real gym API. Production failures on launch day.
**Prevention:** Test with real API in controlled manner (book classes >7 days out, cancel immediately). Respect gym's systems.

### 5. Insufficient Staff/User Training
**Mistake:** Complex UI without guidance. Users confused about how to configure recurring patterns or understand scheduling.
**Prevention:** Clear onboarding flow. Tooltips, examples, confirmation messages. "This booking will execute on [exact date/time]."

### 6. Overbooking Without Conflict Detection
**Mistake:** User schedules two classes at same time. Both bookings succeed, user can only attend one.
**Prevention:** Warn when scheduling conflicts detected. "You already have Yoga 10am on Tuesday. Book anyway?"

### 7. No Visibility Into Queue
**Mistake:** User doesn't know what's scheduled until bookings execute.
**Prevention:** Dashboard showing all pending bookings with dates, times, execution timestamps. Ability to review and cancel.

### 8. Ignoring Time Zones
**Mistake:** Server in different timezone than gym. Bookings execute at wrong time.
**Prevention:** All scheduling logic uses gym's timezone (Italy timezone per PROJECT.md). Store and display times in local gym timezone.

## Confidence Assessment

| Research Area | Confidence | Reasoning |
|---------------|------------|-----------|
| **Table Stakes Features** | HIGH | Consistent across commercial software, DIY implementations, and PROJECT.md requirements. Clear pattern. |
| **Differentiators** | MEDIUM | Based on competitive analysis and real-world implementations, but limited data on what truly differentiates in this niche market. |
| **Anti-Features** | MEDIUM | Derived from general booking software pitfalls and PROJECT.md constraints, but specific to this domain via inference. |
| **Implementation Complexity** | MEDIUM | Based on general software development knowledge and similar system patterns, but not gym API-specific testing. |
| **User Priorities** | MEDIUM | Informed by real-world bot implementations and user pain points in articles, but no direct user interviews. |
| **Error Patterns** | HIGH | Well-documented in automation/booking system literature with concrete examples from multiple sources. |

## Sources

### Gym Booking Software Features & Best Practices
- [5 Best Fitness Class Booking System in 2026](https://lunacal.ai/fitness-class-booking-scheduling-software/best)
- [Best Online Booking System for Fitness Classes (2026 Guide)](https://wod.guru/blog/best-online-booking-system-for-fitness-classes/)
- [Best Fitness Class Scheduling Software - Glofox](https://www.glofox.com/blog/fitness-class-scheduling-software/)
- [Gym Booking Software - TeamUp](https://goteamup.com/features/gym-booking-software)
- [Gymdesk Booking Features](https://gymdesk.com/features/booking)

### Recurring Schedules & Notifications
- [Update: Recurring Bookings, Automation Enhancements - Gymdesk](https://gymdesk.com/blog/update-recurring-bookings-automation-enhancements)
- [Gym Booking & Scheduling System - GymMaster](https://www.gymmaster.com/booking-and-scheduling/)
- [Intuitive Fitness Scheduling Software - Virtuagym](https://business.virtuagym.com/scheduling-software/)

### User Perspective & DIY Automation
- [Creating a Subscription Bot for Gym Classes - Medium](https://medium.com/@fredrik.jacobson/creating-a-subscription-bot-for-gym-classes-f00c33958894)
- [GitHub - gymbox-bot](https://github.com/alex3165/gymbox-bot)
- [GitHub - gym-bot](https://github.com/cathy-qiu/gym-bot)

### Common Mistakes & Pitfalls
- [How To Avoid Common Mistakes When Using Fitness Scheduling Software - Dotbooker](https://www.dotbooker.com/blogs/how-to-avoid-common-mistakes-when-using-fitness-scheduling-software)
- [Common Operational Mistakes Gym Owners Make - Clubfit Software](https://www.clubfitsoftware.com.au/common-operational-mistakes-gym-owners-make-and-how-to-fix-them/)

### Error Handling & Retry Logic
- [Retry on Error - UnifyApps](https://www.unifyapps.com/docs/unify-automations/retry-on-error)
- [Full tutorial: Handling Errors and Retries in Azure Logic Apps](https://blog.habeebyakubu.com/p/full-tutorial-handling-errors-and)
- [Error Handling & Retry Logic: Guide for B2B Enrichment Workflows - Derrick](https://derrick-app.com/en/error-handling-retry-logic-2/)
- [Add Retry Logic and Error Handling in n8n Workflows - Prosperasoft](https://prosperasoft.com/blog/automation-tools/n8n/n8n-error-handling-retry/)

### Session Management & Security
- [Session Management - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Session Timeout Best Practices - Descope](https://www.descope.com/learn/post/session-timeout-best-practices)
- [Why do airline booking sites have short session timeouts? - Quora](https://www.quora.com/Why-do-airline-booking-sites-have-short-session-timeouts)

---
*Feature research for: Automated Gym Class Booking Systems*
*Researched: 2026-04-09*
