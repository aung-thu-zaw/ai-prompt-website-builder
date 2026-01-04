import fs from "fs";
import path from "path";
import { EXCLUDE_DIRS, EXCLUDE_FILES } from "@/config/file-exclusions";

export const copyDir = (sourceFolder: string, destinationFolder: string) => {
  fs.mkdirSync(destinationFolder, { recursive: true });

  fs.readdirSync(sourceFolder).forEach((file) => {
    if (EXCLUDE_DIRS.includes(file) || EXCLUDE_FILES.includes(file)) {
      return;
    }

    const sourcePath = path.join(sourceFolder, file);
    const destinationPath = path.join(destinationFolder, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  });
};
