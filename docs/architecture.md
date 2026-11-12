# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the page components responsible for presentation and loading, empty, success, and error states. Use the shared API client for relative `/api` requests; do not duplicate URL construction or business rules in the browser.
- Logic tier decision: Keep route handlers thin and implement validation and business behavior in service functions. Return deliberate 4xx responses for invalid input or missing records, and keep the API unauthenticated for this exercise.
- Data tier decision: Enforce required fields and sensible defaults in Mongoose schemas. Keep seed records stable and idempotent with upserts; do not clear application data, and remove a seeded user's membership from a previous team when that fixture moves.
- Activity tracking approach: Validate activity type and positive minutes, then validate that both supplied IDs are well-formed and refer to existing records. Persist the user's and team's IDs, compute points server-side using the existing one-point-per-minute seed convention, and set `occurredAt` on creation.
- Team management approach: Require a non-empty name, preserve the submitted name and mascot, and default omitted members to an empty array. Validate supplied member IDs before creating the team.
- Leaderboard approach: Aggregate activity points by team, include teams with no activity at zero points, sort descending by total, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email and use their goal and recent activity to prioritize matching existing workouts. Include an explanatory reason with each recommendation and return a deliberate 4xx when no user matches.

## Test plan

Run the focused contract suites in dependency order (data, API, then presentation), followed by both builds. A failing data test points to schema or seed behavior; a failing API test points to route/service behavior or its data assumptions; a failing frontend test points to API consumption or UI states. A build failure indicates a TypeScript or bundling issue.

Baseline run before implementation:

- `npm run test:data --prefix octofit-tracker/backend` — failed: 4 of 5 tests. User, team, activity, and workout schemas are missing required-field validation; the idempotent seed test passed.
- `npm run test:api --prefix octofit-tracker/backend` — failed: 4 of 4 tests. Activity/team creation returns the unimplemented `501`, the leaderboard is empty, and workout suggestions do not provide the expected activity-based reason.
- `npm test --prefix octofit-tracker/frontend -- --run` — failed: 15 of 15 tests. The pages still render the pending placeholder rather than API data and the required loading, empty, and error states.
- `npm run build --prefix octofit-tracker/backend` — passed.
- `npm run build --prefix octofit-tracker/frontend` — passed.

After implementation, rerun these same commands; all contract suites and builds should pass.
