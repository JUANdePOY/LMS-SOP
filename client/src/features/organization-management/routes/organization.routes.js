import { lazy } from 'react';

const HierarchyOverviewPage = lazy(() => import('../pages/HierarchyOverviewPage'));
const BusinessPage = lazy(() => import('../pages/BusinessPage'));
const DepartmentPage = lazy(() => import('../pages/DepartmentPage'));

const organizationRoutes = [
  {
    path: 'admin/organization',
    children: [
      {
        index: true,
        element: HierarchyOverviewPage,
        handle: { title: 'Organization Hierarchy' },
      },
      {
        path: 'hierarchy',
        element: HierarchyOverviewPage,
        handle: { title: 'Hierarchy Overview' },
      },
      {
        path: 'businesses',
        element: BusinessPage,
        handle: { title: 'Businesses' },
      },
      {
        path: 'departments',
        element: DepartmentPage,
        handle: { title: 'Departments' },
      },
    ],
  },
];

export default organizationRoutes;

