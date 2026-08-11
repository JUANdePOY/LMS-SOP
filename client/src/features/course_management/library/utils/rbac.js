export const ADMIN_ROLES = ["super_admin", "admin", "department_head"];

export function isAdminView(user) {
  return Boolean(user?.role && ADMIN_ROLES.includes(user.role));
}
