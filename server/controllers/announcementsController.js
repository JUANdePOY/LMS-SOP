const announcementModel = require('../models/announcementModel');

const announcementsController = {
  async getAll(req, res) {
    try {
      const announcements = await announcementModel.findAll();
      res.json({ success: true, data: announcements });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getById(req, res) {
    try {
      const announcement = await announcementModel.findById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Announcement not found' });
      }
      res.json({ success: true, data: announcement });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async create(req, res) {
    try {
      const announcement = await announcementModel.create(req.body);
      res.status(201).json({ success: true, data: announcement, message: 'Announcement created successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async update(req, res) {
    try {
      const announcement = await announcementModel.update(req.params.id, req.body);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Announcement not found' });
      }
      res.json({ success: true, data: announcement, message: 'Announcement updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async delete(req, res) {
    try {
      await announcementModel.delete(req.params.id);
      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = announcementsController;