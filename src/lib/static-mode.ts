/**
 * Showcase build flags. `npm run build:static` sets NEXT_PUBLIC_STATIC_DEMO=1
 * and produces a database-free export for GitHub Pages.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
