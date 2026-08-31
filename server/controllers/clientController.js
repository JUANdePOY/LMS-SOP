const clientModel = require('../models/clientModel');
const { validateClientPayload } = require('../validators/clientValidator');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status =
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'DUPLICATE' ? 409 :
    500;

  if (status === 500) console.error('[ClientController Error]', error);
  return res.status(status).json({ success: false, message: error.message, code });
}

const clientController = {
  async listClients(req, res) {
    try {
      // Admins (super admin, admin, department head) see every client, optionally
      // filtered by ?business_id. Employees are scoped to the single SOP business
      // linked to their account so the secondary panel only surfaces their own
      // clients — and never the rest of the org. An employee with no business
      // linked sees nothing rather than the full client list.
      const isEmployee = req.user?.role === 'employee';
      if (isEmployee) {
        const scopedId = req.user?.business_id;
        if (!scopedId) {
          return res.json({ success: true, data: [], message: 'No clients for this account' });
        }
        const clients = await clientModel.listClients(scopedId);
        return res.json({ success: true, data: clients, message: 'Clients retrieved successfully' });
      }
      const businessId = req.query.business_id;
      const clients = await clientModel.listClients(businessId);
      res.json({ success: true, data: clients, message: 'Clients retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listClientOptions(req, res) {
    try {
      const options = await clientModel.listClientOptions();
      res.json({ success: true, data: options, message: 'Client options retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getClient(req, res) {
    try {
      const client = await clientModel.getClient(parseInt(req.params.id, 10));
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, data: client, message: 'Client retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createClient(req, res) {
    try {
      const validation = validateClientPayload(req.body, true);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }

      const clientId = await clientModel.createClient({
        ...validation.value,
        created_by: req.user.id,
      });
      const client = await clientModel.getClient(clientId);
      res.status(201).json({ success: true, data: client, message: 'Client created successfully' });
    } catch (error) {
      if (/Duplicate entry/.test(error.message) && /uk_clients_name/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A client with this name already exists', code: 'DUPLICATE' });
      }
      if (/Duplicate entry/.test(error.message) && /uk_client_business/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A business with this name already exists for this client', code: 'DUPLICATE' });
      }
      handleError(res, error);
    }
  },

  async updateClient(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await clientModel.getClient(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Client not found', code: 'NOT_FOUND' });
      }

      const validation = validateClientPayload(req.body, false);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }

      await clientModel.updateClient(id, validation.value);
      const client = await clientModel.getClient(id);
      res.json({ success: true, data: client, message: 'Client updated successfully' });
    } catch (error) {
      if (/Duplicate entry/.test(error.message) && /uk_clients_name/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A client with this name already exists', code: 'DUPLICATE' });
      }
      if (/Duplicate entry/.test(error.message) && /uk_client_business/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A business with this name already exists for this client', code: 'DUPLICATE' });
      }
      handleError(res, error);
    }
  },

  async deleteClient(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const affected = await clientModel.remove(id);
      if (affected === 0) {
        return res.status(404).json({ success: false, message: 'Client not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deleteBusiness(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      const affected = await clientModel.removeBusiness(businessId);
      if (affected === 0) {
        return res.status(404).json({ success: false, message: 'Business not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, message: 'Business deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async addBusiness(req, res) {
    try {
      const clientId = parseInt(req.params.id, 10);
      const name = (req.body.business_name || '').toString().trim();
      if (!name) {
        return res.status(400).json({ success: false, message: 'Business name is required', code: 'VALIDATION_ERROR' });
      }
      const existing = await clientModel.getClient(clientId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Client not found', code: 'NOT_FOUND' });
      }
      const id = await clientModel.addBusiness(clientId, name);
      res.status(201).json({
        success: true,
        data: { id, client_id: clientId, business_name: name, project_count: 0 },
        message: 'Business created successfully',
      });
    } catch (error) {
      if (/Duplicate entry/.test(error.message) && /uk_client_business/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A business with this name already exists for this client', code: 'DUPLICATE' });
      }
      handleError(res, error);
    }
  },
};

module.exports = { clientController };
