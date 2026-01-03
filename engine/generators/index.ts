import fs from "fs";
import path from "path";
import { generate } from "./page-generator";

const specPath = path.join(process.cwd(), "engine/specs/example.json");

const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

generate(spec);

console.log("✅ app/page.tsx generated from WebsiteSpec");
