import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const coreSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const appSrc = path.resolve(process.cwd(), "src");
const exts = [".ts", ".tsx", ".js", ".mjs"];

function tryFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const e of exts) if (existsSync(base + e)) return base + e;
  for (const e of exts) if (existsSync(path.join(base, "index" + e))) return path.join(base, "index" + e);
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith("@core/")) base = path.join(coreSrc, specifier.slice(6));
  else if (specifier.startsWith("@/")) base = path.join(appSrc, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = tryFile(base);
    if (file) return next(pathToFileURL(file).href, context);
  }
  return next(specifier, context);
}
