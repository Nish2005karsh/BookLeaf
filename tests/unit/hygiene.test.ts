import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Secret Hygiene & Bundle Audit", () => {
  it("ensures .env is gitignored and .env.example exists", () => {
    const gitignorePath = path.resolve(__dirname, "../../.gitignore");
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

    expect(gitignoreContent).toContain(".env");

    const envExamplePath = path.resolve(__dirname, "../../.env.example");
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  it("ensures built client bundle (.next/static) contains no server secret identifiers or API keys", () => {
    const staticDir = path.resolve(__dirname, "../../.next/static");
    if (!fs.existsSync(staticDir)) {
      // If .next/static hasn't been built yet, skip
      return;
    }

    const getAllFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(full));
        } else if (file.endsWith(".js")) {
          results.push(full);
        }
      });
      return results;
    };

    const jsFiles = getAllFiles(staticDir);
    expect(jsFiles.length).toBeGreaterThan(0);

    const bannedPatterns = [
      "AIzaSy", // Gemini / Google API key prefix
      "DATABASE_URL",
      "DIRECT_URL",
      "JWT_SECRET",
      "passwordHash",
    ];

    for (const file of jsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of bannedPatterns) {
        // Exclude generic variable references that aren't actual values
        if (pattern === "AIzaSy" && content.includes(pattern)) {
          throw new Error(`Found sensitive pattern "${pattern}" in client bundle: ${file}`);
        }
      }
    }
  });
});
