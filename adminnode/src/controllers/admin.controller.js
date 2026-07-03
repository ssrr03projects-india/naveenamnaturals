const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { admin } = require("../models");

// Generate JWT token
const generateToken = (adminData) => {
  return jwt.sign(
    {
      id: adminData.id,
      username: adminData.username,
      email: adminData.email,
      role: adminData.role,
    },
    process.env.JWT_SECRET || "your_jwt_secret_key_here",
    { expiresIn: "24h" }
  );
};

// Admin Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Get remaining attempts from rate limiter
    // The rate limiter sets req.rateLimit with remaining count
    // Since skipSuccessfulRequests is true, failed attempts count
    // So remainingAttempts is the count AFTER this failed attempt
    const maxAttempts = 8;
    let remainingAttempts = undefined;
    
    // Try to get from req.rateLimit (set by express-rate-limit middleware)
    if (req.rateLimit && typeof req.rateLimit.remaining === 'number') {
      // This is the count AFTER this request (since it's a failed attempt, it's already decremented)
      remainingAttempts = req.rateLimit.remaining;
    }

    // Find admin by username or email
    const adminUser = await admin.findOne({
      where: {
        [Op.or]: [{ username: username }, { email: username }],
        isActive: true,
      },
    });

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        remainingAttempts: remainingAttempts !== undefined ? remainingAttempts : undefined,
        maxAttempts: maxAttempts,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        remainingAttempts: remainingAttempts !== undefined ? remainingAttempts : undefined,
        maxAttempts: maxAttempts,
      });
    }

    // Update last login
    await adminUser.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(adminUser);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Verify Token
const verifyToken = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Token is valid",
      data: {
        admin: req.user,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get Admin Profile
const getProfile = async (req, res) => {
  try {
    const adminUser = await admin.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.json({
      success: true,
      data: adminUser,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const adminUser = await admin.findByPk(req.user.id);

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== adminUser.email) {
      const existingAdmin = await admin.findOne({
        where: { email: email },
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    await adminUser.update({
      firstName: firstName || adminUser.firstName,
      lastName: lastName || adminUser.lastName,
      email: email || adminUser.email,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const adminUser = await admin.findByPk(req.user.id);

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      adminUser.password
    );
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await adminUser.update({ password: hashedPassword });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  login,
  verifyToken,
  getProfile,
  updateProfile,
  changePassword,
};
