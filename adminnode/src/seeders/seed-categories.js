const db = require("../models");
const Category = db.category;

async function seedCategories() {
    try {
        console.log("🌱 Starting category seeding...");

        // Check if categories already exist
        const existingCount = await Category.count();
        if (existingCount > 0) {
            console.log("ℹ️  Categories already exist, skipping creation");
            return;
        }

        // Create basic categories
        const categories = [
            {
                name: "Face",
                slug: "face",
                description: "Products for facial care and beauty",
                sortOrder: 1,
                isActive: true,
            },
            {
                name: "Hair",
                slug: "hair",
                description: "Products for hair care and nourishment",
                sortOrder: 2,
                isActive: true,
            },
            {
                name: "Body",
                slug: "body",
                description: "Products for body care and wellness",
                sortOrder: 3,
                isActive: true,
            },
        ];

        await Category.bulkCreate(categories);
        console.log("✅ Categories seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        throw error;
    }
}

module.exports = seedCategories;
