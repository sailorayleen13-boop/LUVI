import type { NextConfig } from "next";

// Static export is only for the GitHub Pages CI build — it serves this repo
// at /LUVI/ (project site, not a custom domain), so that build also needs a
// basePath. Local `next dev`/`next build`/`next start` stay a normal server
// build at root, since Supabase will eventually need dynamic server features.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages ? { output: "export" as const } : {}),
  trailingSlash: true,
  basePath: isGithubPages ? "/LUVI" : undefined,
  assetPrefix: isGithubPages ? "/LUVI/" : undefined,
};

export default nextConfig;
