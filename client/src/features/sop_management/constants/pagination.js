export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Standard query params expected on every list endpoint (sop.api.js, and any future list route)
// GET /api/sops?page=1&limit=20&sort=-created_at&search=text&status=draft&department_id=3
export const LIST_QUERY_PARAMS = Object.freeze({
  PAGE: 'page',
  LIMIT: 'limit',
  SORT: 'sort',       // prefix "-" for descending, e.g. "-created_at"
  SEARCH: 'search',    // free-text, matched against idx_sop_code / idx_sop_title
});