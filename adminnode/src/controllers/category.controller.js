const db = require("../models");
const { deleteFile } = require("../utils/fileHelper");
const Category = db.category;

// Helper to build category tree
const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .map((cat) => ({
      ...cat.toJSON(),
      children: buildCategoryTree(categories, cat.id),
    }));
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// Get category tree
exports.getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "image",
        "parentId",
        "sortOrder",
        "isActive",
      ],
    });

    const tree = buildCategoryTree(categories);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error("Error fetching category tree:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category tree",
      error: error.message,
    });
  }
};

// Get single category
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name", "slug"],
        },
        {
          model: Category,
          as: "children",
          attributes: ["id", "name", "slug", "sortOrder"],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, parentId, image, sortOrder, isActive } =
      req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists",
      });
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
    }

    const category = await Category.create({
      name,
      slug,
      description,
      parentId: parentId || null,
      image,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parentId, image, sortOrder, isActive } =
      req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if slug is being changed and if it already exists
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this slug already exists",
        });
      }
    }

    // Prevent setting itself as parent
    if (parentId && parseInt(parentId) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: "Category cannot be its own parent",
      });
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
    }

    const oldImage = category.image;
    await category.update({
      name: name || category.name,
      slug: slug || category.slug,
      description:
        description !== undefined ? description : category.description,
      parentId: parentId !== undefined ? parentId : category.parentId,
      image: image !== undefined ? image : category.image,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
      isActive: isActive !== undefined ? isActive : category.isActive,
    });

    // Delete old image if it was changed
    if (image !== undefined && image !== oldImage && oldImage) {
      await deleteFile(oldImage);
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has children
    const childrenCount = await Category.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with subcategories. Please delete or reassign subcategories first.",
      });
    }

    // Check if category has products
    const Product = db.product;
    const productsCount = await Product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productsCount} associated products. Please reassign products first.`,
      });
    }

    const oldImage = category.image;
    await category.destroy();

    // Delete image from disk after successful deletion
    if (oldImage) {
      await deleteFile(oldImage);
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};
