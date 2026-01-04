import archiver, { ArchiverError } from "archiver";
import fs from "fs";
import path from "path";
import { EXCLUDE_DIRS, EXCLUDE_FILES } from "@/config/file-exclusions";

/**
 * Creates a zip archive of a directory.
 *
 * @param sourceDir - The directory to zip.
 * @param outputPath - The path where the zip file should be created.
 * @returns Promise that resolves when the zip is created.
 */
export const zipDirectory = (
  sourceDir: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      resolve();
    });

    archive.on("error", (error: ArchiverError) => {
      reject(error);
    });

    archive.pipe(output);

    const addDirectory = (dir: string, basePath: string = "") => {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        // Skip excluded directories and files
        if (EXCLUDE_DIRS.includes(file) || EXCLUDE_FILES.includes(file)) {
          return;
        }

        const filePath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          addDirectory(filePath, relativePath);
        } else {
          archive.file(filePath, { name: relativePath });
        }
      });
    };

    addDirectory(sourceDir);

    archive.finalize();
  });
};
