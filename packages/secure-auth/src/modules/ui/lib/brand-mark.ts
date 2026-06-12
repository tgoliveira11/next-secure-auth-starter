/** Generic starter brand mark SVG builder for consuming apps. */
export function buildBrandMarkSvg(appName: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="${appName}">
  <rect width="32" height="32" rx="8" fill="#1e3a5f"/>
  <path d="M16 8l7 4v8l-7 4-7-4v-8l7-4z" fill="#faf8f5"/>
  <circle cx="16" cy="16" r="3" fill="#3b82f6"/>
</svg>`;
}

export function buildBrandMarkDataUrl(appName: string): string {
  return `data:image/svg+xml,${encodeURIComponent(buildBrandMarkSvg(appName))}`;
}