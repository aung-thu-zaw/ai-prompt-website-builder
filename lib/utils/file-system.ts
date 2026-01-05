import fs from "fs";
import path from "path";
import { EXCLUDE_DIRS, EXCLUDE_FILES } from "@/config/file-exclusions";

/**
 * Recursively copies the contents of a source directory to a destination directory.
 *
 * Traverses all files and subdirectories within `srcDir`, replicating the directory
 * structure and files at the target location `destDir`. Files and directories listed in
 * `EXCLUDE_DIRS` and `EXCLUDE_FILES` are automatically skipped, ensuring exclusions
 * commonly used for build or metadata artifacts (e.g., .git, node_modules, etc).
 *
 * Existing destination files will be overwritten as needed. Parent directories are created
 * if they do not exist, preserving the structure of the source.
 *
 * @param {string} srcDir - The absolute or relative path to the directory to copy from.
 * @param {string} destDir - The absolute or relative path to the directory to copy to.
 *
 * @example
 *   copyDir("./project", "./project-copy");
 */
export const copyDir = (srcDir: string, destDir: string): void => {
  fs.mkdirSync(destDir, { recursive: true });

  fs.readdirSync(srcDir).forEach((file) => {
    if (EXCLUDE_DIRS.includes(file) || EXCLUDE_FILES.includes(file)) {
      return;
    }

    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};
