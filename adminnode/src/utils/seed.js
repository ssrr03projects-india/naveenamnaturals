const bcrypt = require("bcryptjs");
const { admin, category } = require("../models");

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Create default admin
    const existingAdmin = await admin.findOne({ where: { username: "admin" } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("Admin@2025", 12);
      await admin.create({
        username: "admin",
        password: hashedPassword,
        email: "admin@naveenamnaturals.com",
        firstName: "Admin",
        lastName: "User",
        role: "super_admin",
        isActive: true,
      });
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️  Admin user already exists, skipping creation");
    }

    // Create default categories
    const existingCategories = await category.count();
    if (existingCategories === 0) {
      const categories = [
        {
          name: "Face Care",
          slug: "face-care",
          description: "Products for facial care and beauty",
          sortOrder: 1,
          isActive: true,
        },
        {
          name: "Hair Care",
          slug: "hair-care",
          description: "Products for hair care and nourishment",
          sortOrder: 2,
          isActive: true,
        },
        {
          name: "Body Care",
          slug: "body-care",
          description: "Products for body care and wellness",
          sortOrder: 3,
          isActive: true,
        },
      ];

      await category.bulkCreate(categories);
      console.log("✅ Categories created:");
      console.log("   - Face Care");
      console.log("   - Hair Care");
      console.log("   - Body Care");
    } else {
      console.log("ℹ️  Categories already exist, skipping creation");
    }

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
  }
};

module.exports = seedDatabase;
