import archiver, { ArchiverError } from "archiver";
import fs from "fs";
import path from "path";
import { EXCLUDE_DIRS, EXCLUDE_FILES } from "@/config/file-exclusions";

/**
 * Creates a ZIP archive from a directory and writes it to the specified output path.
 *
 * Recursively traverses the entire `sourceDir`, adding all files and subdirectories
 * (except those listed in `EXCLUDE_DIRS` and `EXCLUDE_FILES`) into a ZIP file using
 * the highest compression level.
 *
 * The zipped archive is written to `outputPath`. The returned promise resolves when the
 * archive has been successfully written, or rejects if an error occurs.
 *
 * @param {string} sourceDir - The absolute or relative path to the directory to be archived.
 * @param {string} outputPath - The absolute or relative path where the ZIP file will be created.
 * @returns {Promise<void>} Resolves upon successful archive finalization, rejects on failure.
 *
 * @example
 *   await zipDirectory("./project", "./project.zip");
 */
export const createZipArchiveFromDirectory = (
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

    /**
     * Recursively adds all files and directories (excluding excluded entries) from the given directory to the archive.
     *
     * @param {string} dir - The current directory to add.
     * @param {string} basePath - The base path to prepend for each relative archive entry.
     */
    const addDirectory = (dir: string, basePath: string = "") => {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
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
