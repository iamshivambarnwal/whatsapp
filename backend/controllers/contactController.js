const Contact = require('../models/Contact');

// Get all contacts
exports.getAll = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create contact
exports.create = async (req, res) => {
  try {
    const { name, number, tags } = req.body;
    
    const contact = new Contact({ name, number, tags });
    await contact.save();
    
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update contact
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, tags } = req.body;
    
    const contact = await Contact.findByIdAndUpdate(
      id,
      { name, number, tags },
      { new: true }
    );
    
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete contact
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
