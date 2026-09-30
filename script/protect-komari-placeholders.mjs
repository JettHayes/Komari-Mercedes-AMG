import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));
const descriptionPlaceholder = "A simple server monitor tool.";
const escapedDescriptionPlaceholder = "A simple server monitor\\u0020tool.";
const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectHtmlFiles(fullPath);
      }

      return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
    })
  );

  return files.flat();
}

const htmlFiles = await collectHtmlFiles(distDir);
let updatedFiles = 0;
let protectedOccurrences = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const updated = html.replace(scriptTagPattern, (scriptTag) => {
    const protectedScriptTag = scriptTag.replaceAll(
      descriptionPlaceholder,
      escapedDescriptionPlaceholder
    );

    if (protectedScriptTag !== scriptTag) {
      protectedOccurrences +=
        scriptTag.split(descriptionPlaceholder).length - 1;
    }

    return protectedScriptTag;
  });

  if (updated !== html) {
    await writeFile(file, updated);
    updatedFiles += 1;
  }
}

console.log(
  `Protected ${protectedOccurrences} Komari description placeholder occurrence(s) in ${updatedFiles} HTML file(s).`
);
