import { Building2 } from 'lucide-react';
import BusinessAccordion from './BusinessAccordion';

// Non-mutating replacement for the old filterDepartments that mutated
// `dept.children` in place during render. Returns new arrays/objects only.
function filterDepartments(departments, query) {
  if (!query) return departments;
  const lowerQuery = query.toLowerCase();

  return departments.reduce((acc, dept) => {
    const matches = dept.name.toLowerCase().includes(lowerQuery);
    const categoryMatches = (dept.categories || []).some(
      (cat) => cat.name.toLowerCase().includes(lowerQuery)
    );
    const hasChildren = dept.children && dept.children.length > 0;
    const filteredChildren = hasChildren ? filterDepartments(dept.children, query) : dept.children;

    if (matches || categoryMatches || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({ ...dept, children: filteredChildren });
    }
    return acc;
  }, []);
}

export default function OrganizationTree({ hierarchy = [], searchQuery = '', onCreateSop }) {
  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-12 w-12 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-muted)]">No businesses found. Create a business to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hierarchy.map((business) => {
        const departments = business.departments || [];
        const filteredDepartments = searchQuery ? filterDepartments(departments, searchQuery) : departments;

        return (
          <BusinessAccordion
            key={business.id}
            business={business}
            departments={filteredDepartments}
            searchActive={Boolean(searchQuery)}
            onCreateSop={onCreateSop}
          />
        );
      })}
    </div>
  );
}