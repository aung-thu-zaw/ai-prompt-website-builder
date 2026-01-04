/**
 * File and directory exclusion patterns for file system operations.
 *
 * These patterns define which files and directories should be excluded
 * when copying or processing file system operations, such as copying
 * template scaffolds to output directories.
 */
export const EXCLUDE_DIRS: readonly string[] = [
  "node_modules",
  ".next",
  ".git",
];

export const EXCLUDE_FILES: readonly string[] = ["package-lock.json"];

