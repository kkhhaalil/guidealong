# Architecture decisions

## 2026-07-02 — R1: gluestack-ui v2 + NativeWind v4 on Vite (WP0 gate)

**Decision:** Fall back to **plain React + Tailwind** components that preserve the gluestack v2 file layout and API surface (`Button`, `Box`, `Text`, `Progress`, `Actionsheet`, `Badge`, `Switch`, `Spinner`, `GluestackUIProvider` under `app/src/components/ui/`).

**What we tried**

1. Vendored gluestack-ui **v2.0.10** nativewind copy-paste components + `@gluestack-ui/*` runtime packages, `react-native-web` alias, NativeWind v4, `@vitejs/plugin-react@4` with `nativewind` / `react-native-css-interop` Babel plugins, `jsxImportSource: nativewind`.
2. Downgraded **Vite 8 → 6** after Rolldown JSX parse failures; added `optimizeDeps` / `esbuild` `.js → jsx` loaders for RN packages.
3. Stubbed `nativewind/dist/doctor` to work around production bundling of `react-native-css-interop/dist/doctor.js` (contains inline JSX for install verification).

**Evidence of failure**

- `npm run build` consistently failed with:
  ```
  ERROR: The JSX syntax extension is not currently enabled
  file: node_modules/nativewind/node_modules/react-native-css-interop/dist/doctor.js:10:11
  ```
  Vite/Rollup could not transform nested `doctor.js` even with resolve aliases (nested duplicate under `nativewind/node_modules`).
- Vite 8 `@vitejs/plugin-react` no longer exposes a `babel` option (OXC-only), forcing a plugin downgrade.
- TypeScript required relaxing `verbatimModuleSyntax` and adding `nativewind/types` for `className` on RN primitives; build still blocked before runtime smoke.

**Fallback chosen (owner-approved per PLAN §8 WP0 / §9 R1)**

- Removed `react-native`, `react-native-web`, `nativewind`, and all `@gluestack-ui/*` runtime dependencies.
- Reimplemented UI primitives as semantic-token-styled React + Tailwind (`cn()` helper, same export names).
- **Unchanged:** three-layer token architecture (`tokens.ts` + CSS variables + `tailwind.config.ts`), hash router, zustand, PWA injectManifest SW, vitest/Playwright/budget CI wiring.

**Follow-up**

- Revisit only if NativeWind ships a Vite-compatible web path or gluestack publishes a maintained web+Vite starter; until then downstream WPs should import from `components/ui/*` without assuming RN primitives.
