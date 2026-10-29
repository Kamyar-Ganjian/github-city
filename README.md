# GitHub City

A practical explorer for public GitHub repositories. Browse a searchable file tree, inspect real file and directory metadata, and use a simple 3D architectural map to understand the project's structure.

The interface takes its visual direction from [nextjs.org](https://nextjs.org/): neutral surfaces, restrained borders, clear typography, and consistent spacing. Light, dark, and system themes are supported.

## Verification status

Checked in the current environment on October 29, 2026:

| Check | Result |
| --- | --- |
| TypeScript strict checking | Passed |
| ESLint | Passed without warnings |
| Unit and mocked integration tests | 87 passed |
| Production build | Blocked by sandbox subprocess restrictions |
| Playwright | Blocked because the preview server cannot bind its port |
| Live public GitHub smoke | Attempted for Hello World, React, and TypeScript; API hostname could not resolve |
| Browser inspection, lighting appearance, and actual PNG download | Unverified |
| Deployment | Not performed |

Webpack's Next build reports that it cannot parse TypeScript's configuration output. A direct subprocess diagnostic returns `spawnSync /usr/bin/node EPERM` with empty output. Preview returns `listen EPERM 0.0.0.0:3000`. These checks must be rerun outside this execution sandbox before a release.

Existing installed dependencies were used for verification. Manifest and lockfile dependency declarations match. An offline lockfile refresh could not finish because an optional Tailwind WASM package was absent from the local cache. A fresh installation requires registry access.

## Local setup

Node.js 22 or newer is recommended.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Enter a public HTTPS GitHub URL or `owner/repository`. Examples use the real API pipeline.

Optional: copy `.env.example` to `.env.local` and set `GITHUB_TOKEN` for higher API limits. The token stays on the server; the application also works without it. Private repositories are excluded.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start

# Browser tests
npx playwright install chromium
npm run test:e2e

# Optional network-dependent checks
npm run smoke
REAL_GITHUB_SMOKE=1 npm run test:e2e

# Synthetic CPU measurements
npm run benchmark
```

Share a repository with a URL such as:

```text
http://localhost:3000/?repo=facebook/react
```

Shared URLs open the repository; they do not serialize camera position or selection.

## Workspace

- **File tree:** expand folders, select files, and see descendant file counts. Rows are virtualized so large trees do not create a DOM element for every file.
- **Search:** matches file and directory paths. Duplicate filenames remain distinct through their full paths. Use arrows and Enter; Escape closes results. Press / or Ctrl/Cmd+K to focus search.
- **Inspector:** file name, path, extension/category, available size, language, parent directory, default branch, and GitHub link.
- **Directory overview:** descendant file/directory counts, known byte sizes, depth, and language distribution by file count.
- **Repository overview:** largest files, largest directories, deepest nesting, and common project filenames. Recognized filenames are conventions, not inferred architectural roles.
- **Breadcrumbs:** navigate back to any ancestor.
- **Mobile:** switch between Files, Map, and Details panels.
- **Non-3D exploration:** hide the map, or continue using the tree and inspector when WebGL is unavailable. Context loss disables 3D while preserving repository data.

Tree keyboard controls: Up/Down move focus, Right expands, Left collapses or moves to the parent, Home/End move to the first/last visible row, and Enter/Space select.

## Procedural city and visual encoding

Repository buildings are the interactive data. Their facades use language colors, and their inspector always shows the real path and metadata. Environmental objects are generated separately and never contribute to file or directory statistics.

- **File height:** `clamp(log2(1 + bytes / 256) × 1.25, 0.85, 12)`.
- **Aggregate height:** `min(22, 2.5 + log2(1 + fileCount) × 1.1)`.
- **Aggregates:** outlined podiums distinguish them from individual files. Their language tint uses the dominant language by file count.
- **Shape:** encoded height selects houses/townhouses, low-rise apartments, mid-rises, high-rises, or landmark skyscrapers. Large directory aggregates can become landmarks. File extension no longer chooses the architectural shape.
- **Variation:** a stable hash of the file/group identifier selects one of three variants at each scale. The same data and settings produce the same city.
- **Size limits:** footprints and heights remain bounded. Actual byte sizes and descendant counts remain uncapped in the inspector.

Geometry has normalized height, including roofs and mechanical structures, so architectural variation preserves the encoding. Shapes use merged reusable parts: setbacks, pilasters, cornices, entrances, flat or pitched roofs, mechanical boxes, and selected antennas. Facades use shared diffuse, emissive, and roughness atlases with window grids, mortar, glass panels, and floor divisions. There are no independent meshes or light objects per window.

Architecture describes visual scale, not literal meters or an inferred code role. A small repository containing a very large file can still have a tower. Landmarks appear when actual aggregate counts justify them; the renderer does not invent landmark metrics.

### Urban planning

The visible data is projected into directory neighborhoods. Within each neighborhood, buildings occupy deterministic lots in four-by-four blocks, separated by streets. Reserved empty lots and forecourts provide parks and plazas. Shelf packing connects neighborhoods through an avenue backbone. Roads have avenue, secondary-street, and local-lane widths.

City density uses a continuous logarithmic file-count factor rather than a list of small/medium/large city presets. Data units retain their identity and exact counts through projection. Coordinates are local to the active view; drilling into a directory recenters its neighborhood.

### Environment controls

**Environment: Minimal / Detailed** changes only environmental rendering:

- **Minimal:** repository architecture, district foundations, labels, and navigation.
- **Detailed:** road surfaces, sidewalks, markings/crosswalks, parks, plazas, trees, lamps, benches, sparse background service buildings, and a repository city sign.
- **Background buildings:** the separate checkbox hides all decorative buildings while retaining other scenery.

Decorative structures use muted neutral materials, have no data labels or window lights, and cannot intercept raycasting. Environment placement is checked against repository footprints. Decorations near a selected building are suppressed, the sign hides during inspection, and selection outlines render clearly above scenery.

Environmental detail is bounded: at most 128 neighborhoods receive full internal street detail, with an avenue backbone for all neighborhoods; 64 park/plaza plots, 128 trees, 96 lamps, 48 benches, and 24 background structures are supported. Available free space can produce fewer objects, including no background structures. This does not omit repository data.

### Navigation and presentation

The initial scene is the whole-repository overview. Select a directory or its aggregate to drill in; search or the file tree focuses a real file. Clicking a file in the canvas inspects it without moving the camera.

Drag to orbit, right-drag to pan, and scroll/pinch to zoom. The visible **Pan** control changes left-drag to pan. **Reset camera** fits the active map. Focus transitions respect reduced motion and are interrupted by manual camera input.

Lighting uses a hemisphere, directional sunlight, warm facade emission, and local shadows near the inspection target. Distant views reduce environmental detail and disable shadows. Sustained low frame rates reduce rendering resolution and decorative detail; idle demand-rendering gaps are excluded from frame-rate sampling. Roof silhouettes remain present at a distance so apparent height is preserved. No bloom, particles, traffic simulation, or free-flight controls are included.

**Export PNG** captures actual rendered WebGL content at 1920×1080 with letterboxing. Its footer identifies the repository, represented-file count, and height encodings. HTML file/district labels and surrounding UI are not part of the WebGL capture; the physical city sign uses a canvas texture and is included if visible. Browser export and visual appearance remain unverified in this environment.

## Data definitions

- **Files:** Git tree blob entries, including tracked symlinks and LFS pointer blobs.
- **Directories:** derived from included file paths; the root is excluded from descendant-directory totals.
- **Size:** sum of available GitHub blob sizes, not checkout/disk size or expanded LFS asset size.
- **Unavailable sizes:** excluded from totals and largest-file ranking; the inspector explicitly says Unavailable. Their map buildings use minimum height.
- **Directory depth:** number of directory segments below the repository root, whose depth is zero.
- **Language distribution:** counts classified by filename extension, not source parsing or GitHub Linguist.
- **Largest directories:** ranked independently by descendant file count. Entries can be nested, so those displayed counts should not be summed.

No source file contents are fetched, and no code complexity, dependency relationships, or repository activity is inferred.

## Scaling

There is no 20,000-file rejection.

### Retrieval

The API retrieves metadata and the actual default branch, then requests a recursive Git tree. A truncated result is discarded and recovered through individual tree traversal from its immutable root SHA.

Traversal uses at most four concurrent requests and a per-load SHA cache. Repeated tree objects at different paths keep their distinct file paths. Successful responses have short HTTP cache headers. Retries are limited to transient server failures.

Requests have a 25-second timeout; the full operation has a two-minute deadline and 1,500-request safety budget, including retries. Rate limits report useful messages and reset time where available. Cancellation reaches API requests and worker preparation.

Malformed entries, unknown completeness flags, duplicate paths, and truncated individual trees are rejected rather than presented as complete. Submodule references are reported separately; their external contents are not traversed.

### Index and layout

A pure directory index computes descendant totals once, bottom-up. Metadata lookup then uses Maps. The layout is a deterministic hierarchy of grids and packed district rectangles, with non-overlapping file footprints.

The same tree and view settings produce the same positions. Directory views are recentered and aggregated overviews are compacted to support predictable navigation. Coordinates can change between view modes or revisions.

Preparation runs in a module Web Worker. Measurements below justify keeping this work away from the UI thread. The worker is terminated on cancellation or replacement.

### Bounded rendering

Directory mode:

- At most 2,000 descendant files are shown directly.
- Larger scopes show child-directory aggregates and pages of up to 1,000 direct files.
- Directories are paginated in groups of up to 500 when necessary.
- The map states exactly how many files it currently represents. Paging does not remove data from the tree or search. Aggregates and files are assigned bounded lots in directory neighborhoods, so a single outlier cannot stretch a block or destroy skyline proportions.

Whole repository mode:

- Up to 8,000 files appear individually.
- Larger trees use a deterministic spatial grid with at most 8,000 visible items. Its effective budget decreases smoothly as file count grows, grouping more files into each representation at metropolitan scales.
- Singleton cells retain their real file buildings; multi-file cells become explicit aggregates.
- Every loaded file contributes to exactly one visible item. No files are sampled away.

All visible neighborhoods receive instanced district foundations. Up to 16 directory labels provide context. Environmental budgets do not reduce represented file counts.

The five architectural scales and three seeded variants use instanced body/roof batches; podiums, foundations, and environmental elements are also instanced. Instance matrices update when prepared views change, not every animation frame. The renderer uses demand rendering, a bounded device pixel ratio, and native mesh frustum culling. Camera transitions invalidate frames only while moving.

The tree mounts only the visible rows plus overscan, with keyboard row lookup indexed independently of DOM size. The complete normalized metadata and worker copies still consume memory; support is not unlimited.

## Actual CPU measurements

One synthetic whole-repository run on Linux, Node v26.12.1, Intel Core i7-1165G7 @ 2.80 GHz:

| Files represented | Preparation | Urban layout | Environment placement | Repository units | Roads | Trees | Background structures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5,000 | 11.18 ms | 7.11 ms | 7.81 ms | 5,000 | 614 | 81 | 0 |
| 25,000 | 64.08 ms | 3.10 ms | 6.65 ms | 2,906 | 614 | 128 | 24 |
| 100,000 | 247.53 ms | 2.44 ms | 7.04 ms | 1,410 | 425 | 128 | 24 |

The 100,000-file fixture produces 1,247 high-rise and 163 mid-rise representations, accounting for all 100,000 files exactly once. The fixture uses a src directory with 100 child directories and progressively increasing file sizes. This is synthetic data, not a benchmark of React or TypeScript repositories.

Reproduce with:

```sh
node node_modules/vite-node/vite-node.mjs scripts/benchmark-city.ts
```

The timings exclude networking, normalization, worker cloning, React, texture upload, shader compilation, picking, and GPU work. They are not FPS guarantees. The existing `npm run benchmark` also measures directory search/index preparation. Real-browser GPU profiling remains required.

## Structure

```text
app/
  api/repository/route.ts   Server API and cache/error boundary
  page.tsx                 Workspace, repository input, and shared navigation
  layout.tsx               Metadata and theme bootstrap
  globals.css              Neutral design system and responsive panels
components/
  FileTree.tsx             Virtualized hierarchical keyboard explorer
  Inspector.tsx            File, directory, and repository metadata
  Search.tsx               Search and command-style keyboard access
  MapPanel.tsx             Map controls, fallback, and paging
  City.tsx                 Instancing, picking, camera, and PNG capture
  building-geometry.ts      Modular scale-based architecture and facade atlases
  Environment.tsx          Batched scenery and physical city sign
  ThemeToggle.tsx          Light/dark/system preferences
hooks/
  useRepository.ts         Cancellable loading and worker lifecycle
lib/
  github.ts                Validated GitHub retrieval and traversal
  model.ts                 URL parsing, normalization, language detection
  building-style.ts        Height-based archetypes, seeded variants, facade pixels
  urban-layout.ts          District lots, blocks, roads, and reserved spaces
  environment.ts           Collision-checked secondary-object placement
  explorer.ts              Directory index, search, statistics, tree rows
  navigation.ts            Pure typed navigation reducer
  layout.ts                Pure deterministic layout
  whole-city.ts            Complete bounded spatial synopsis
  map-view.ts              Accurate data projection into the urban planner
  prepare.ts               Shared preparation pipeline
  layout.worker.ts         Worker entry point
tests/                     Unit/integration and mocked Playwright coverage
scripts/                   CPU benchmark and optional real API smoke
```

A single reducer owns selection and navigation; the tree, inspector, and canvas receive the same state. The API does not fetch or lay out data inside rendering components. No external shared-state library is needed for this workspace.

## Remaining verification and limitations

- Production build, browser journeys, visual inspection, and real PNG pixels must be verified outside this sandbox.
- No verified screenshots or deployment are included. The Manhattan-inspired visual result has not been inspected in a browser. Use Export PNG from a running application before adding a reference screenshot.
- Real-repository smoke attempts were blocked by DNS, so current performance measurements use synthetic trees.
- Search displays up to 60 results; folder navigation remains exhaustive.
- Full metadata and worker cloning can exhaust memory for exceptionally large trees.
- Individual tree truncation and GitHub rate/request/time budgets can prevent complete retrieval.
- Language classification is deliberately extension-based.
- Camera, material appearance, shadows, environment toggles, and accessibility need real-device validation. Browser journeys are authored but blocked here.
- Rendering is instanced but does not yet use chunked spatial picking or a full traffic/road simulation. Streets are a lightweight planned network, not geographic navigation data.

## Contributing and license

Run type checking, lint, unit tests, production build, and Playwright before submitting changes. Keep data/layout modules independent of React and Three.js. Mock GitHub for deterministic tests. Include actual browser captures for visual changes.

No license has been selected without owner authorization. Choose and add an appropriate license before publishing the project as open source.
