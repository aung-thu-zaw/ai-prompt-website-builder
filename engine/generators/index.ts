import fs from "fs";
import path from "path";
import { generate } from "@/engine/generators/project-generator";

const specPath = path.join(process.cwd(), "engine/specs/example.json");

const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

(async () => {
  await generate(spec);

  const projectSlug = spec.project?.slug || "generated-project";
  console.log(`✅ Project generated successfully in output/${projectSlug}/`);
})();

