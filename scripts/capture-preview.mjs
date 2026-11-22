import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("public/previews");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const artifactDir = "C:/Users/Raika/.gemini/antigravity/brain/eb172dbd-4c01-4c91-857c-51a5374c409f";

async function capture() {
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : "chrome",
  });

  // 1. Desktop Viewport (1440 x 900)
  const desktopPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await desktopPage.goto("http://localhost:3000/admin");
  await desktopPage.waitForLoadState("networkidle");
  const desktopPath1 = path.join(targetDir, "admin-dashboard-desktop.png");
  const desktopPath2 = path.join(artifactDir, "admin-dashboard-desktop.png");
  await desktopPage.screenshot({ path: desktopPath1, fullPage: true });
  try {
    await desktopPage.screenshot({ path: desktopPath2, fullPage: true });
  } catch {}
  console.log("Desktop preview captured:", desktopPath1);

  // 2. Mobile Viewport (375 x 812)
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 812 },
  });
  await mobilePage.goto("http://localhost:3000/admin");
  await mobilePage.waitForLoadState("networkidle");
  const mobilePath1 = path.join(targetDir, "admin-dashboard-mobile.png");
  const mobilePath2 = path.join(artifactDir, "admin-dashboard-mobile.png");
  await mobilePage.screenshot({ path: mobilePath1, fullPage: true });
  try {
    await mobilePage.screenshot({ path: mobilePath2, fullPage: true });
  } catch {}
  console.log("Mobile preview captured:", mobilePath1);

  await browser.close();
}

capture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
