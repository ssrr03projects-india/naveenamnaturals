const { Op } = require("sequelize");
const db = require("../models");

/**
 * Generate a clean slug from product name
 * Only uses the product name, no timestamps or IDs
 */
function generateSlugFromName(name) {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug from product name
 * If slug exists, appends a number (e.g., product-name-2)
 */
async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = generateSlugFromName(name);
  
  if (!baseSlug) {
    throw new Error("Cannot generate slug from empty name");
  }

  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const whereClause = { slug };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existing = await db.product.findOne({
      where: whereClause,
    });

    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  return slug;
}

/**
 * Clean an existing slug by removing timestamp patterns
 * Removes trailing 13+ digit numbers (timestamp pattern)
 */
function cleanSlug(slug) {
  if (!slug) return "";
  // Remove trailing timestamp pattern (13+ digits after a dash)
  return slug.replace(/-\d{13,}$/, "");
}

module.exports = {
  generateSlugFromName,
  generateUniqueSlug,
  cleanSlug,
};

