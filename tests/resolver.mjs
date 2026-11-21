import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

export async function resolve(specifier, context, defaultResolve) {
  let target = specifier;

  if (target === "server-only") {
    const stubPath = path.resolve(process.cwd(), "tests", "empty-server-only.mjs");
    return defaultResolve(pathToFileURL(stubPath).href, context);
  }

  if (target.startsWith("next/")) {
    return defaultResolve(`${target}.js`, context);
  }

  if (target.startsWith("@/")) {
    const subpath = target.slice(2);
    let fullPath = path.resolve(process.cwd(), "src", subpath);
    if (!path.extname(fullPath) && fs.existsSync(fullPath + ".ts")) {
      fullPath += ".ts";
    }
    return defaultResolve(pathToFileURL(fullPath).href, context);
  }

  if ((target.startsWith("./") || target.startsWith("../")) && !path.extname(target)) {
    if (context.parentURL) {
      const parentPath = fileURLToPath(context.parentURL);
      const parentDir = path.dirname(parentPath);
      const resolved = path.resolve(parentDir, target);
      if (fs.existsSync(resolved + ".ts")) {
        return defaultResolve(pathToFileURL(resolved + ".ts").href, context);
      }
    }
  }

  return defaultResolve(specifier, context);
}
