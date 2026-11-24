import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

test("ThemeProvider and ThemeToggle components exist and are correctly structured", () => {
  const providerPath = join(rootDir, "src/components/theme/ThemeProvider.tsx");
  const togglePath = join(rootDir, "src/components/theme/ThemeToggle.tsx");

  assert.ok(existsSync(providerPath), "ThemeProvider.tsx should exist");
  assert.ok(existsSync(togglePath), "ThemeToggle.tsx should exist");

  const providerContent = readFileSync(providerPath, "utf-8");
  assert.match(providerContent, /next-themes/, "ThemeProvider must use next-themes");
  assert.match(providerContent, /NextThemesProvider/, "ThemeProvider must wrap next-themes ThemeProvider");

  const toggleContent = readFileSync(togglePath, "utf-8");
  assert.match(toggleContent, /useTheme/, "ThemeToggle must consume useTheme hook");
  assert.match(toggleContent, /Sun.*Moon.*Monitor/, "ThemeToggle must include Sun, Moon, and Monitor icons");
  assert.match(toggleContent, /aria-haspopup="menu"/, "ThemeToggle trigger must indicate popup menu");
  assert.match(toggleContent, /role="menu"/, "ThemeToggle dropdown must have menu role");
  assert.match(toggleContent, /role="menuitem"/, "ThemeToggle options must have menuitem role");
});

test("Root layout integrates ThemeProvider with suppressHydrationWarning and class attribute", () => {
  const layoutPath = join(rootDir, "src/app/layout.tsx");
  const layoutContent = readFileSync(layoutPath, "utf-8");

  assert.match(layoutContent, /suppressHydrationWarning/, "Root html must include suppressHydrationWarning");
  assert.match(layoutContent, /<ThemeProvider/, "Root layout must render ThemeProvider");
  assert.match(layoutContent, /attribute="class"/, "ThemeProvider must use class attribute for Tailwind dark mode");
  assert.match(layoutContent, /defaultTheme="system"/, "ThemeProvider default theme must be system");
  assert.match(layoutContent, /enableSystem/, "ThemeProvider must enable system theme preference");
});

test("globals.css defines comprehensive Dark Mode color tokens and midnight-navy palette", () => {
  const cssPath = join(rootDir, "src/app/globals.css");
  const cssContent = readFileSync(cssPath, "utf-8");

  assert.match(cssContent, /\.dark\s*\{/, "globals.css must have .dark selector");
  assert.match(cssContent, /--background:\s*#020617;/, "Dark background must be midnight navy #020617");
  assert.match(cssContent, /--card:\s*#0f172a;/, "Dark card surface must be #0f172a");
  assert.match(cssContent, /--popover:\s*#1e293b;/, "Dark elevated popover must be #1e293b");
  assert.match(cssContent, /--foreground:\s*#f8fafc;/, "Dark primary text must be #f8fafc");
  assert.match(cssContent, /--muted-foreground:\s*#94a3b8;/, "Dark muted text must be #94a3b8");
  assert.match(cssContent, /--border:\s*#334155;/, "Dark border must be #334155");
  assert.match(cssContent, /--primary:\s*#2563eb;/, "Dark primary button must be #2563eb");
});

test("Leaflet map dark mode preserves standard OSM tiles without inversion", () => {
  const cssPath = join(rootDir, "src/app/globals.css");
  const cssContent = readFileSync(cssPath, "utf-8");

  // Ensure blind CSS filter inversion is NOT present
  assert.doesNotMatch(cssContent, /\.leaflet-tile-pane\s*\{[^}]*filter:\s*invert/, "Map tiles must not be inverted");
  assert.match(cssContent, /\.dark \.leaflet-popup-content-wrapper/, "Leaflet popup wrappers must have dark styling");
  assert.match(cssContent, /\.dark \.leaflet-bar a/, "Leaflet zoom controls must have dark styling");
});

test("ThemeToggle is integrated across all primary navigation surfaces", () => {
  const navbarPath = join(rootDir, "src/components/layout/Navbar.tsx");
  const citizenTopbarPath = join(rootDir, "src/components/layout/CitizenTopbar.tsx");
  const adminTopbarPath = join(rootDir, "src/components/admin/AdminTopbar.tsx");
  const footerPath = join(rootDir, "src/components/layout/Footer.tsx");

  assert.match(readFileSync(navbarPath, "utf-8"), /<ThemeToggle/, "Navbar must render ThemeToggle");
  assert.match(readFileSync(citizenTopbarPath, "utf-8"), /<ThemeToggle/, "CitizenTopbar must render ThemeToggle");
  assert.match(readFileSync(adminTopbarPath, "utf-8"), /<ThemeToggle/, "AdminTopbar must render ThemeToggle");
  assert.match(readFileSync(footerPath, "utf-8"), /<ThemeToggle/, "Footer must render ThemeToggle");
});
