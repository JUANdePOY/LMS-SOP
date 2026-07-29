export default function apiResponse({ data, message, success = true }) {
  return { data, message, success };
}
