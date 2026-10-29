# GitHub City

An architectural atlas of public GitHub repositories. Files become buildings, directories become nested districts, and language colors reveal the shape of a codebase.

**Delivery status:** implementation is present, but this environment could not resolve registry.npmjs.org. Dependencies, type checking, lint, automated tests, production build, browser inspection, screenshots, and deployment remain unverified. Do not treat this checkout as a verified production release.

## Run locally

Node.js 22+ recommended.

```sh
npm install
npx playwright install chromium
npm run dev
```

Open http://localhost:3000. Paste a full HTTPS GitHub repository URL or owner/repository. Examples use the same server API as custom input.

Optional: copy .env.example to .env.local and add GITHUB_TOKEN to raise GitHub API limits. The token stays on the server. Never commit .env.local.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
REAL_GITHUB_SMOKE=1 npm run test:e2e
npm start
```

## Experience

- Deterministic recursive district packing and logarithmic building heights.
- Language palette, instanced buildings, atmospheric scene, and construction reveal.
- Orbit, zoom, pan, double-click focus, overview reset, and skip introduction.
- Keyboard search (arrows, Enter, Escape), file inspector, default-branch GitHub links.
- District labels, language legend, and accessible non-3D file browser.
- Composition mode exports the current rendered canvas as a 1920×1080 PNG, letterboxed when needed to preserve composition.
- Reduced-motion handling and responsive controls.

## Project structure

```text
app/
  api/repository/route.ts  Validated server API
  page.tsx                Product UI and loading workflow
  layout.tsx              Metadata and global shell
  globals.css             Visual system and responsive layout
components/City.tsx        Instancing, camera, interaction and capture
lib/
  github.ts               GitHub fetches and actionable errors
  model.ts                Normalization, classification, URLs, search
  layout.ts               Pure deterministic hierarchical layout
  store.ts                Shared selection and focus
tests/
  core.test.ts            Unit and mocked GitHub integration tests
  e2e/city.spec.ts         Mocked user journeys and opt-in real smoke
```

## Architecture decisions

The App Router API first retrieves metadata, then requests the default branch's recursive Git tree. Credentials are server-only. Successful responses have short cache headers; failures are not cached.

The pure layout engine sorts paths and constructs a hierarchy. Each node reserves a grid for its direct files and packs child rectangles into deterministic shelves. A parent foundation contains its descendants. The approach prevents footprint collisions and makes nested structure legible, at the cost of unused space and layout shifts when the tree changes. It does not promise stable positions across different revisions.

Heights follow a bounded logarithmic scale: max(0.7, min(19, log2(1 + bytes/180) × 1.7)). File language comes from extension classification, not content analysis.

Buildings share an InstancedMesh and material. Instance IDs map to prepared metadata. Selection is in Zustand; repository UI state stays local. Animation updates instance matrices rather than React state per building. Labels are restricted to first-level districts. Search scans normalized paths and caps displayed results at 60; duplicate filenames retain distinct paths.

Screenshot capture renders the real WebGL canvas before copying to a PNG canvas. No repository content or source text is fetched.

## GitHub API and limits

Unauthenticated requests are subject to GitHub's shared public API rate limits. Private and nonexistent repositories both return a useful not-found message. Requests time out after 25 seconds. Truncated trees, empty repositories, submodules, and trees above 20,000 files are rejected explicitly; no partial city is presented as complete. Submodule contents and Git LFS object contents are not traversed. API blob sizes determine heights.

## Performance and verification

No performance benchmarks have been collected. Target hardware and representative-repository timings must be measured after dependency installation and browser availability. The 20,000-file limit is a safety bound, not an FPS guarantee. Layout runs synchronously; construction and color updates currently traverse all instances each frame. Raycasting is Three.js instanced picking. Very large directory counts and the full file-browser DOM can be costly.

Tests are authored but have not been executed in this environment. Browser screenshots are intentionally absent because no verified rendered application was available. Capture an actual overview PNG after running locally and add it here before public release.

## Known limitations and roadmap

- Runtime behavior and package compatibility require the full validation commands above.
- Dependency versions are not locked yet because installation failed.
- No deployment has been performed.
- Deep directories have foundation boundaries but only first-level labels.
- No Web Worker, spatial picking acceleration, virtualized browser, or adaptive LOD yet.
- Extension classification is intentionally limited; unfamiliar formats use Other.
- Camera transitions and construction are implemented but need visual QA on desktop and mobile.
- Next priorities: worker layout, animation upload reduction, browser virtualization, real-device accessibility and performance audits.

## Contributing

Open an issue describing a reproducible problem or a scoped proposal. Keep layout and classification independent of React. Add meaningful coverage for algorithm changes, run all checks, and include real screenshots for visual changes. Mock GitHub for deterministic tests; the real smoke test is optional.

## License

No open-source license has been selected because the owner has not authorized one. Before public release, choose an appropriate license (for example MIT, Apache-2.0, or GPL-3.0) and add its complete text. Until then, this project does not grant an open-source license.
