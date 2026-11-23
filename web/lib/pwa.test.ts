import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(webRoot, "public");
const manifest = JSON.parse(
  readFileSync(path.join(publicDir, "manifest.webmanifest"), "utf8"),
) as {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  icons?: { src: string; sizes: string; type?: string; purpose?: string }[];
};

function iconFile(src: string) {
  return path.join(publicDir, src.replace(/^\//, ""));
}

describe("PWA manifest (FR-26)", () => {
  it("has the required installability fields", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("ships loadable 192px, 512px and maskable PNG icons", () => {
    const icons = manifest.icons ?? [];
    for (const size of ["192x192", "512x512"]) {
      const icon = icons.find(
        (entry) => entry.sizes === size && (entry.purpose ?? "any").includes("any"),
      );
      expect(icon, `missing ${size} any icon`).toBeDefined();
      expect(icon?.type ?? path.extname(icon?.src ?? "")).toMatch(/png/);
      expect(() => statSync(iconFile(icon!.src)).size).not.toThrow();
      expect(statSync(iconFile(icon!.src)).size).toBeGreaterThan(0);
      expect(readFileSync(iconFile(icon!.src)).subarray(1, 4).toString()).toBe("PNG");
    }
    expect(
      icons.some((entry) => (entry.purpose ?? "").includes("maskable")),
    ).toBe(true);
  });
});

describe("PWA integration (FR-26)", () => {
  it("links the manifest from the root layout", () => {
    const layout = readFileSync(path.join(webRoot, "app/layout.tsx"), "utf8");
    expect(layout).toContain('manifest: "/manifest.webmanifest"');
  });

  it("keeps the service worker push-only so authenticated pages are never cached", () => {
    const sw = readFileSync(path.join(publicDir, "sw.js"), "utf8");
    expect(sw).toContain('addEventListener("push"');
    expect(sw).toContain('addEventListener("notificationclick"');
    expect(sw).not.toMatch(/addEventListener\(\s*["']fetch["']/);
    expect(sw).not.toMatch(/\bcaches\./);
  });
});
