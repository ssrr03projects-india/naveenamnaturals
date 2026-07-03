const fs = require("fs");
const path = require("path");

/**
 * Delete a file from the disk
 * @param {string|string[]} filePaths - The public path(s) of the file (e.g. '/uploads/image.jpg')
 * @returns {Promise<void>}
 */
const deleteFile = async (filePaths) => {
  if (!filePaths) return;

  const pathsToDelete = Array.isArray(filePaths) ? filePaths : [filePaths];

  pathsToDelete.forEach((filePath) => {
    try {
      if (!filePath || typeof filePath !== "string") return;

      // Remove leading slash if present
      const cleanPath = filePath.startsWith("/")
        ? filePath.substring(1)
        : filePath;

      // Resolve the full path on the disk
      // Assuming this file is in src/utils/fileHelper.js
      // and uploads is in the root (../../uploads)
      const fullPath = path.resolve(__dirname, "../../", cleanPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Successfully deleted file: ${fullPath}`);
      } else {
        console.warn(`File not found, skipping deletion: ${fullPath}`);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error.message);
    }
  });
};

module.exports = {
  deleteFile,
};
