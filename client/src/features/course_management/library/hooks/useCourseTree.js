import { useEffect, useState, useMemo } from "react";
import { getPublishedCourses } from "../services/library.api";
import { getDepartments } from "@/features/organization-management/api/department.api";

export function useCourseTree() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([
      getPublishedCourses({ limit: 500, page: 1, status: "published" }),
      getDepartments({ limit: 500, status: "active" }),
    ])
      .then(([courseRes, deptRes]) => {
        if (cancel) return;
        const rows = courseRes.data?.rows || courseRes.data || [];
        setCourses(Array.isArray(rows) ? rows : []);
        const dRows = deptRes.data?.rows || deptRes.data || [];
        setDepartments(Array.isArray(dRows) ? dRows : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const tree = useMemo(() => {
    const deptMap = new Map();
    departments.forEach((d) => {
      deptMap.set(d.id, { id: d.id, name: d.name, categories: new Map() });
    });

    const general = { id: null, name: "General / All Departments", categories: new Map() };

    courses.forEach((c) => {
      const dept = c.department_id != null && deptMap.has(c.department_id) ? deptMap.get(c.department_id) : general;
      const catName = c.category || "Uncategorized";
      if (!dept.categories.has(catName)) {
        dept.categories.set(catName, { name: catName, difficulties: new Set(), count: 0 });
      }
      const cat = dept.categories.get(catName);
      if (c.difficulty) cat.difficulties.add(c.difficulty);
      cat.count += 1;
    });

    const toNode = (dept) => ({
      id: dept.id,
      name: dept.name,
      categories: Array.from(dept.categories.values()).map((cat) => ({
        name: cat.name,
        difficulties: Array.from(cat.difficulties),
        count: cat.count,
      })),
    });

    const deptNodes = Array.from(deptMap.values()).map(toNode).filter((d) => d.categories.length);
    const generalNode = toNode(general);
    return generalNode.categories.length ? [generalNode, ...deptNodes] : deptNodes;
  }, [courses, departments]);

  return { tree, loading };
}

export default useCourseTree;
