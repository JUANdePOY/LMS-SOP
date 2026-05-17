const squadronLookupModel = require('../models/squadronLookupModel');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  return res.status(code).json({ success: false, message });
}

function listSquadrons(req, res) {
  const search = req.query.search ? String(req.query.search) : '';
  const limit = req.query.limit;
  squadronLookupModel
    .searchSquadrons({ search, limit })
    .then((rows) => res.json({ success: true, message: 'OK', data: { squadrons: rows } }))
    .catch((err) => sendError(res, err, 'Failed to list squadrons'));
}

function listSquadronReservists(req, res) {
  const search = req.query.search ? String(req.query.search) : '';
  const limit = req.query.limit;
  squadronLookupModel
    .searchReservistsForSquadron({
      squadronId: req.params.id,
      search,
      limit,
    })
    .then((rows) => res.json({ success: true, message: 'OK', data: { reservists: rows } }))
    .catch((err) => sendError(res, err, 'Failed to list reservists'));
}

module.exports = {
  listSquadrons,
  listSquadronReservists,
};
