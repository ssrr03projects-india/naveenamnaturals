
const nodemailer = require("nodemailer");
const { contact } = require("../models");

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/* 
  NOTE: Subscriber and Newsletter functionality has been removed 
  as the 'subscribers' table was deprecated.
*/

// Create contact form submission
const createContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required",
      });
    }

    const contactData = await contact.create({
      name,
      email,
      phone,
      subject,
      message,
      status: "new",
    });

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      data: contactData,
    });
  } catch (error) {
    console.error("Create contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit contact form",
    });
  }
};

// Get all contact form submissions
const getContacts = async (req, res) => {
  try {
    const { status, search } = req.query;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[require("sequelize").Op.or] = [
        { name: { [require("sequelize").Op.like]: `%${search}%` } },
        { email: { [require("sequelize").Op.like]: `%${search}%` } },
        { subject: { [require("sequelize").Op.like]: `%${search}%` } },
        { message: { [require("sequelize").Op.like]: `%${search}%` } },
      ];
    }

    const contacts = await contact.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    const stats = {
      total: contacts.length,
      new: contacts.filter((c) => c.status === "new").length,
      read: contacts.filter((c) => c.status === "read").length,
      replied: contacts.filter((c) => c.status === "replied").length,
      archived: contacts.filter((c) => c.status === "archived").length,
    };

    res.json({
      success: true,
      data: contacts,
      stats,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact submissions",
    });
  }
};

// Update contact status
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const contactData = await contact.findByPk(id);
    if (!contactData) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === "replied") updateData.repliedAt = new Date();

    await contactData.update(updateData);

    res.json({
      success: true,
      message: "Contact status updated successfully",
      data: contactData,
    });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact status",
    });
  }
};

// Delete contact submission
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contactData = await contact.findByPk(id);
    if (!contactData) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    await contactData.destroy();

    res.json({
      success: true,
      message: "Contact submission deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact submission",
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  updateContactStatus,
  deleteContact,
};
