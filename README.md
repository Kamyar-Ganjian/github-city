# GitHub City

A practical explorer for public GitHub repositories. Browse a searchable file tree, inspect real file and directory metadata, and use a simple 3D architectural map to understand the project's structure.

The interface takes its visual direction from [nextjs.org](https://nextjs.org/): neutral surfaces, restrained borders, clear typography, and consistent spacing. Light, dark, and system themes are supported.

## Verification status

Checked in the current environment on October 29, 2026:

| Check | Result |
| --- | --- |
| TypeScript strict checking | Passed |
| ESLint | Passed without warnings |
| Unit and mocked integration tests | 82 passed |
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

## Reading and navigating the map

Colored boxes represent individual files:

- Height is `clamp(log2(1 + bytes / 256) × 1.25, 0.85, 12)`. Large files cannot grow beyond the cap; their actual size remains visible in the inspector.
- Color is the extension-based language/category.
- Position comes from deterministic directory packing. Directory views use local coordinates and compact aggregate spacing; Whole repository mode retains the full spatial synopsis.

Gray boxes on square bases represent aggregates:

- Height is `min(22, 2.5 + log2(1 + fileCount) × 1.1)`. Directory aggregate footprints are standardized to 7×7 units; whole-repository aggregate footprints are capped at 9×9. A single oversized module cannot create an unbounded block.
- Hover shows the represented file count.
- Directory aggregates open their actual directory.
- Spatial aggregates in Whole repository mode may combine files across directories; their inspector identifies them as a subset and links to their deepest common directory.

File categories have distinct, restrained silhouettes: stepped source towers, test buildings, compact configuration towers, thin documentation slabs, asset pavilions, and general boxes. Classification uses explicit filename, path, and extension rules; it does not analyze file contents. The inspector identifies each file's building style. Every geometry has the same normalized height envelope, so shape changes do not change the file-size encoding.

Warm window lights use one shared 64×128 emissive texture with mipmaps. They are subtle in light mode and more visible in dark mode. Windows are decorative and do not represent activity, lines of code, or file counts. Geometry is instanced by category, with no individual window meshes or per-building light objects.

Orbit by dragging, pan with right-drag, and zoom with the wheel or pinch. The visible **Pan** control makes left-drag pan instead. **Reset camera** fits the visible map. A folder click drills in and frames it; file clicks inspect and highlight without moving the camera. Tree and search selections focus the selected item.

Focus transitions respect reduced-motion preferences. Manual camera input interrupts a transition. The map has no free-flight or cinematic modes.

**Export PNG** captures the actual rendered WebGL map at 1920×1080 with letterboxing to preserve composition. The footer identifies the repository/scope, represented file count, and height encodings. HTML labels and the surrounding interface are not part of the WebGL capture. Browser export remains unverified in this environment.

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
- The map states exactly how many files it currently represents. Paging does not remove data from the tree or search. Aggregated views use evenly spaced directory tiles, so an unusually large subtree cannot stretch its neighbors out of view.

Whole repository mode:

- Up to 8,000 files appear individually.
- Larger trees use a deterministic spatial grid with at most 8,000 visible items.
- Singleton cells retain their real file buildings; multi-file cells become explicit aggregates.
- Every loaded file contributes to exactly one visible item. No files are sampled away.

Up to 200 district foundations and 16 labels provide context. Those visual-detail limits do not reduce file counts.

File categories, aggregates, aggregate bases, and district foundations use instanced meshes. Instance matrices update when prepared views change, not every animation frame. The renderer uses demand rendering, a bounded device pixel ratio, and native mesh frustum culling. Camera transitions invalidate frames only while moving.

The tree mounts only the visible rows plus overscan, with keyboard row lookup indexed independently of DOM size. The complete normalized metadata and worker copies still consume memory; support is not unlimited.

## Actual CPU measurements

One synthetic run on Linux, Node v26.12.1, Intel Core i7-1165G7 @ 2.80 GHz:

| Files | Preparation | Root map | Path search | Flatten fully expanded tree |
| ---: | ---: | ---: | ---: | ---: |
| 5,000 | 12.13 ms | 0.40 ms | 0.48 ms | 0.78 ms |
| 25,000 | 67.72 ms | 0.07 ms | 1.77 ms | 1.52 ms |
| 100,000 | 259.27 ms | 0.06 ms | 8.12 ms | 5.70 ms |

Preparation includes indexing, layout, lookup maps, and the whole-repository synopsis. Input normalization happens before timing. The fixture contains a src directory with 100 child directories; its root map has one aggregate.

These single-run CPU measurements exclude networking, worker structured cloning, React row-position indexing, DOM rendering, shader compilation, picking, and GPU work. They are not navigation FPS guarantees. Use `npm run benchmark` to reproduce and profile representative real repositories separately.

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
  building-geometry.ts      Shared silhouettes and window texture
  ThemeToggle.tsx          Light/dark/system preferences
hooks/
  useRepository.ts         Cancellable loading and worker lifecycle
lib/
  github.ts                Validated GitHub retrieval and traversal
  model.ts                 URL parsing, normalization, language detection
  building-style.ts        Filename categories, footprints, and window pixels
  explorer.ts              Directory index, search, statistics, tree rows
  navigation.ts            Pure typed navigation reducer
  layout.ts                Pure deterministic layout
  whole-city.ts            Complete bounded spatial synopsis
  map-view.ts              Directory and whole-map projection
  prepare.ts               Shared preparation pipeline
  layout.worker.ts         Worker entry point
tests/                     Unit/integration and mocked Playwright coverage
scripts/                   CPU benchmark and optional real API smoke
```

A single reducer owns selection and navigation; the tree, inspector, and canvas receive the same state. The API does not fetch or lay out data inside rendering components. No external shared-state library is needed for this workspace.

## Remaining verification and limitations

- Production build, browser journeys, visual inspection, and real PNG pixels must be verified outside this sandbox.
- No verified screenshots or deployment are included. Use Export PNG from a running application before adding a reference screenshot.
- Real-repository smoke attempts were blocked by DNS, so current performance measurements use synthetic trees.
- Search displays up to 60 results; folder navigation remains exhaustive.
- Full metadata and worker cloning can exhaust memory for exceptionally large trees.
- Individual tree truncation and GitHub rate/request/time budgets can prevent complete retrieval.
- Language classification is deliberately extension-based.
- Camera and accessibility behavior have unit coverage and authored browser tests, but need real-device validation.

## Contributing and license

Run type checking, lint, unit tests, production build, and Playwright before submitting changes. Keep data/layout modules independent of React and Three.js. Mock GitHub for deterministic tests. Include actual browser captures for visual changes.

No license has been selected without owner authorization. Choose and add an appropriate license before publishing the project as open source.
