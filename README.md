# GitHub City

An interactive architectural atlas of public GitHub repositories. Files become windowed towers, directories become neighborhoods, and code becomes a place to explore.

The redesign uses a mineral blue environment, warm limestone accents, compact exhibition controls, procedural window facades and landmark roofs. The city remains central; information appears through search, district navigation and a contextual inspector.

## Delivery and verification status

Implemented and locally checked on October 29, 2026:

- TypeScript check: passed.
- ESLint: passed without warnings.
- Vitest: 44 tests passed, including mocked API integration and 25,000-file cases.
- Production build: attempted with Turbopack and webpack; **blocked by the execution sandbox**. Turbopack cannot bind its internal socket (EPERM). Webpack cannot spawn TypeScript's configuration subprocess (spawnSync EPERM).
- Playwright: attempted; preview server cannot bind 0.0.0.0:3000 (EPERM). Chromium installation also failed because cdn.playwright.dev cannot resolve.
- Real GitHub smoke: unavailable; api.github.com cannot resolve.
- Browser visual inspection, actual PNG export, camera feel, GPU FPS and deployment: **unverified**.

This checkout is not a verified production release. There are no fabricated browser screenshots. Add an actual exported city image here after completing browser QA.

## Local setup

Use Node.js 22+.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Visit http://localhost:3000. Enter a public HTTPS GitHub repository URL or owner/repository, or use an example. To open a repository directly:

```text
http://localhost:3000/?repo=facebook/react
```

Optionally copy .env.example to .env.local and supply GITHUB_TOKEN to increase API capacity. Tokens stay server-side. Private metadata is explicitly rejected even when a configured token could access it.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
REAL_GITHUB_SMOKE=1 npm run test:e2e
npm run benchmark
npm start
```

The build script uses Next's webpack build path; both bundlers were attempted in the restricted environment. A successful unrestricted production build is still required before release.

## Exploration

- Drag to orbit; scroll/pinch to zoom; right-drag or two-finger pan.
- Click a file building to focus it and inspect its real metadata.
- Click a district foundation or label to enter it. The navigator exposes all child directories.
- Breadcrumbs provide parent navigation; Overview or H returns to the city.
- Search by path or filename. Use arrows, Enter and Escape. Press / or Ctrl/Cmd+K to open search.
- The inspector links to the actual default branch and encoded file path on GitHub.
- Gold roofs identify README variants, package.json and Dockerfile using transparent filename rules.
- Present hides the interface, offers a slow cinematic orbit, and downloads an actual rendered 1920×1080 PNG. The current composition is preserved with letterboxing where needed; aggregate views are identified in the PNG.
- Share copies the current repository URL. It does not serialize the camera or file selection.
- A paginated file browser remains usable when WebGL is unavailable or loses its context.
- Reduced motion skips construction and animated focus and disables automatic orbit.

## Scaling without a fixed file-count rejection

There is no 20,000-file gate.

### Retrieval

The server reads metadata and the actual default branch, then requests the recursive tree. If truncated, it discards that partial result and traverses individual trees from the returned immutable root SHA. Traversal uses batches of at most four requests and a per-load SHA promise cache, preserving distinct paths when directories share a tree object.

Transient server errors get up to two short exponential retries. Rate limits stop traversal with an actionable message and reset time where GitHub provides it. Request cancellation propagates to GitHub. Individual requests have a 25-second timeout; the operation has a two-minute deadline and a 1,500-request budget. These are operational constraints, not file-count limits. A failure never returns a supposedly complete partial city.

An individually truncated nonrecursive directory cannot be recovered with this endpoint and produces an explicit error. Successful responses use short HTTP cache headers. Submodules are identified as external content and excluded with a visible disclosure; their referenced repositories are not traversed.

### Layout

The pure TypeScript engine constructs a path-indexed hierarchy and deterministic shelf packing. Direct files occupy grids; child rectangles reserve non-overlapping footprints. It uses a Map for directory lookup and avoids spreading arbitrarily large child arrays into function arguments. A module Web Worker performs planning away from the UI thread and is terminated on cancellation or replacement.

The layout is reproducible for identical trees. It does not guarantee unchanged coordinates between revisions. Sorting and complete in-memory metadata remain necessary; memory is not unbounded.

### Progressive rendering

Views containing more than 3,000 descendant files show child-directory architectural aggregates plus paginated blocks of up to 1,000 direct files. Entering a sufficiently small district reveals individual file buildings. Large flat directories can be explored block by block, and search goes directly to the relevant file block. No file is discarded from the loaded model.

Aggregate foundations are explicitly labelled with represented file counts. Their height encodes logarithmic file count; individual file height uses the original bounded logarithmic byte scale. Never interpret an aggregate as one file building.

At most 512 child-district foundations and 40 district labels appear in one scene. A visible message discloses the foundation limit; the paginated navigator exposes every child. The file browser and district navigator each mount at most 100 rows per page.

Bodies, roof accents and district foundations use three instanced meshes; whole-city aggregate blocks add one instanced mesh. The construction sequence updates only the currently visible buildings and stops uploading matrices afterward. Selection uses a separate highlight instead of recoloring all buildings each frame. Window patterns use a material shader without extra per-window geometry. Picking is restricted to the active scene representation.

## Whole-city view

Use **Whole city** beside **Districts** in the upper-left controls to see the complete repository footprint at once. District exploration remains available. Clicking a file, using search, or entering a district returns to detailed district navigation.

Up to 8,000 files appear as individual buildings. Beyond that, a deterministic spatial grid produces at most 8,000 visible items: singleton cells retain their actual file buildings, while cells containing multiple files become clearly disclosed aggregate blocks. Every loaded file contributes exactly once. No sampling or pagination removes files from this view.

Blocks preserve spatial location and show the dominant language by file count, with alphabetical tie-breaking. Block height uses the average file's byte size through the same bounded logarithmic scale as individual buildings. Hover shows the count and dominant language; click enters the deepest directory shared by the block's files. This may be the repository root for blocks spanning multiple directories. Search always provides direct access to individual files.

Preparation runs in the existing Web Worker when the repository loads. The result is reused when switching views. Aggregate instance buffers initialize once, without per-frame updates. Screenshot export identifies whole-city mode and its aggregate block count. Existing retrieval deadlines and API rate limits still apply; there is no new repository file-count rejection. The item budget bounds rendering work, not total repository memory.

Additional synthetic preparation measurements on the same machine (single run, excluding layout, worker transfer, browser and GPU):

| Files represented | Individual buildings | Aggregate blocks | Whole-city preparation |
| ---: | ---: | ---: | ---: |
| 5,000 | 5,000 | 0 | 0.18 ms |
| 25,000 | 69 | 4,820 | 28.98 ms |
| 100,000 | 42 | 6,614 | 81.46 ms |

Reproduce with `node node_modules/vite-node/vite-node.mjs scripts/benchmark-whole.ts`. These are CPU preparation timings, not navigation FPS guarantees. Visual and browser interaction checks remain blocked by the environment described above.

## CPU measurements

One synthetic run on Linux, Node v26.12.1, Intel Core i7-1165G7 @ 2.80 GHz:

| Files | Directories including root | Layout | Overview preparation + ancestor counts | Search |
| ---: | ---: | ---: | ---: | ---: |
| 5,000 | 202 | 7.11 ms | 3.44 ms | 0.61 ms |
| 25,000 | 202 | 28.12 ms | 11.78 ms | 1.77 ms |
| 100,000 | 202 | 104.95 ms | 71.41 ms | 7.35 ms |

Run npm run benchmark to reproduce. The dataset has 100 repeated nested directory groups and deterministic file sizes. These single-run CPU timings exclude fetching, normalization, worker structured cloning, browser rendering, picking and GPU work. They are not representative-repository FPS guarantees. Real repositories and mobile hardware still need profiling.

## Structure

```text
app/
  api/repository/route.ts   Server boundary, cache headers and cancellation
  page.tsx                 Repository workflow and exhibition interface
  globals.css              Responsive visual system
  layout.tsx               Document metadata
components/
  City.tsx                 Instanced architecture, shader, camera and PNG capture
  CityBlocks.tsx           Static instanced whole-city aggregates
  DistrictList.tsx         Paginated district navigation
  FileBrowser.tsx          Paginated accessible file list
lib/
  github.ts                Bounded traversal, retries and GitHub errors
  model.ts                 Classification, normalization, search and links
  layout.ts                Pure deterministic hierarchy and packing
  layout.worker.ts         Background layout and whole-city preparation
  view.ts                  Progressive district representation and ancestor counts
  whole-city.ts            Bounded spatial synopsis accounting for every file
  store.ts                 Selection, district navigation and file blocks
scripts/benchmark.ts        Reproducible synthetic CPU measurement
tests/
  core.test.ts             Existing parsing, classification and geometry coverage
  scalability.test.ts      Large trees, traversal and progressive detail
  e2e/city.spec.ts          Mocked journeys and optional live API smoke
```

## Architecture decisions

React owns interface state; Zustand coordinates district, selection, repeated focus requests and file blocks. Rendering consumes prepared data. API, normalization and layout remain independently testable.

Camera framing derives from district bounds, viewport aspect and field of view. Transitions use exponential, frame-rate-independent damping. Controls constrain polar angles and distance to avoid flips and below-ground orbiting. Manual control interrupts focus transitions. Cinematic orbit starts from the current composition and disables conflicting manual input while active.

Instancing and progressive detail were chosen over a massive always-visible scene. Decorative window geometry is shader-only, and roofs remain attached accents rather than additional file markers. Aggregates are a different, explicitly described representation.

A Web Worker was chosen instead of incremental React scheduling for layout. Full metadata is retained so search and the non-3D browser remain complete.

## Remaining limitations and release checklist

- Run production build and all Playwright journeys outside this sandbox; inspect desktop and mobile in a real browser.
- Verify PNG pixels, procedural shader output, camera framing and context-loss recovery visually.
- Profile real repositories and GPU behavior; no FPS measurement has been made.
- The complete tree and worker copies consume memory. Extremely large trees can exceed browser memory; there is no promise of unlimited capacity.
- Ancestor counting and view filtering run on the main thread; benchmark their worst-case directory shapes.
- Search returns at most 60 matching paths. The directory file browser provides exhaustive access.
- First 512 scene foundations and first 40 labels are intentionally bounded; the navigator is exhaustive.
- No spatial picking acceleration, worker streaming, distance-driven LOD, free-flight mode or actual cast/contact shadows yet.
- The cinematic feature is an orbit, not an automated multi-district tour.
- Language detection is extension-based, not GitHub Linguist or content analysis.
- API traversal is subject to GitHub limits and may require a server token for deeply fragmented trees.
- No deployment or browser screenshot has been produced.

Next improvements should focus on real-device visual QA, memory profiling, streaming worker results, cached spatial indexes, and context-aware label culling.

## Contributing and license

Keep data and layout independent of React. Include deterministic tests for algorithm changes, mocked GitHub responses for API behavior, and real browser captures for visual changes. Run all checks above before submitting.

No license has been selected without owner authorization. Before public open-source release, choose an appropriate license and include its full text.
