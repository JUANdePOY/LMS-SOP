const clientModel = require('../models/clientModel');
const { validateClientPayload } = require('../validators/clientValidator');
const { parseFile } = require('../utils/taskBulkValidation');

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
      const hasManageClients = (req.user?.permissions || []).includes('manage_clients');
      const isEmployee = req.user?.role === 'employee' && !hasManageClients;
      if (isEmployee) {
        let scopedId = req.user?.business_id;
        if (!scopedId && req.user?.department_id) {
          const [[dept]] = await db.query(
            'SELECT business_id FROM departments WHERE id = ?',
            [req.user.department_id]
          );
          if (dept?.business_id) scopedId = dept.business_id;
        }
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
      console.error('[ClientController] listClients error', error);
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

  async getClientBusiness(req, res) {
    try {
      const clientId = parseInt(req.params.id, 10);
      const businessId = parseInt(req.params.businessId, 10);
      const business = await clientModel.getClientBusiness(clientId, businessId);
      if (!business) {
        return res.status(404).json({ success: false, message: 'Business not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, data: business, message: 'Business retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateBusiness(req, res) {
    try {
      const clientId = parseInt(req.params.id, 10);
      const businessId = parseInt(req.params.businessId, 10);
      const existing = await clientModel.getClientBusiness(clientId, businessId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Business not found', code: 'NOT_FOUND' });
      }

      const business_name = req.body.business_name !== undefined ? String(req.body.business_name).trim() : undefined;
      if (business_name === undefined || business_name.length < 2) {
        return res.status(400).json({ success: false, message: 'Business name must be at least 2 characters', code: 'VALIDATION_ERROR' });
      }

      await clientModel.updateBusiness(clientId, businessId, { business_name });
      const updated = await clientModel.getClientBusiness(clientId, businessId);
      res.json({ success: true, data: updated, message: 'Business updated successfully' });
    } catch (error) {
      if (/Duplicate entry/.test(error.message) && /uk_client_business/.test(error.message)) {
        return res.status(409).json({ success: false, message: 'A business with this name already exists for this client', code: 'DUPLICATE' });
      }
      handleError(res, error);
    }
  },

  async bulkUploadClients(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'File is required', code: 'VALIDATION_ERROR' });
      }

      const format = String(req.body?.format || '').trim().toLowerCase();
      if (!['csv', 'xlsx', 'xls', 'json'].includes(format)) {
        return res.status(400).json({ success: false, message: 'Invalid format. Supported: csv, xlsx, json', code: 'VALIDATION_ERROR' });
      }

      let rows;
      try {
        rows = await parseFile(file.buffer, format);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message || 'Failed to parse file', code: 'VALIDATION_ERROR' });
      }

      if (!rows.length) {
        return res.json({ success: true, data: { created: 0, failed: 0, results: [] }, message: 'No data found in file' });
      }

      const createdBy = req.user?.id || null;
      const defaultBusinessId = req.body?.business_id ? Number(req.body.business_id) : null;
      const results = [];
      let createdCount = 0;
      let failedCount = 0;

      for (const row of rows) {
        const rawIndex = row._rawIndex != null ? row._rawIndex : results.length + 2;
        const businessesRaw = row.businesses || row.Businesses || row.BUSINESSES || row.business || row.Business || row.BUSINESS || '';
        const businessList = String(businessesRaw)
          .split(/[;,]/)
          .map((b) => String(b).trim())
          .filter((b) => b.length > 0);

        const rowBusinessId = row.business_id || row.Business_ID || row.BUSINESS_ID || row.businessId || row.businessid || defaultBusinessId;

        const validation = validateClientPayload({
          client_name: row.client_name || row.Client_Name || row.Client || row.CLIENT || row.client || row.CLIENT_NAME || row['Client Name'] || row['CLIENT NAME'],
          business_id: rowBusinessId,
          businesses: businessList,
        }, false);

        if (!validation.valid) {
          failedCount++;
          results.push({
            row: rawIndex,
            status: 'failed',
            error: validation.errors.join('; '),
            data: row,
          });
          continue;
        }

        try {
          const clientId = await clientModel.createClient({
            client_name: validation.value.client_name,
            businesses: validation.value.businesses,
            created_by: createdBy,
            business_id: validation.value.business_id,
            department_id: validation.value.department_id,
          });
          createdCount++;
          results.push({
            row: rawIndex,
            status: 'created',
            client_id: clientId,
            client_name: validation.value.client_name,
            businesses: validation.value.businesses,
          });
        } catch (err) {
          failedCount++;
          const message = err.code === 'ER_DUP_ENTRY' ? 'Duplicate client name' : err.message;
          results.push({
            row: rawIndex,
            status: 'failed',
            error: message,
            data: row,
          });
        }
      }

      res.json({
        success: true,
        data: { created: createdCount, failed: failedCount, results },
        message: `Bulk upload complete. Created: ${createdCount}, Failed: ${failedCount}`,
      });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { clientController };
