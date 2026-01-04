import fs from "fs";
import path from "path";
import { generate as generatePage } from "@/engine/generators/page-generator";
import { generate as generateTheme } from "@/engine/generators/theme-generator";

const specPath = path.join(process.cwd(), "engine/specs/example.json");

const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

generatePage(spec);
generateTheme(spec);

console.log("✅ app/page.tsx generated from WebsiteSpec");
console.log("✅ Theme configuration applied to globals.css and layout.tsx");
