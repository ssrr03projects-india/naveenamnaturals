
const express = require("express");
const router = express.Router();
const emailController = require("../controllers/email.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public routes
router.post("/contact", emailController.createContact);

// Protected routes (admin only)
router.use(authMiddleware.authenticateToken);

// Contact form management
router.get("/contacts", emailController.getContacts);
router.patch("/contacts/:id", emailController.updateContactStatus);
router.delete("/contacts/:id", emailController.deleteContact);



module.exports = router;
