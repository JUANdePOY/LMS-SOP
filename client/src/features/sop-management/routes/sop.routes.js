import { lazy } from 'react';

const SOPListPage = lazy(() => import('../pages/SOPListPage'));
const SOPWorkspacePage = lazy(() => import('../pages/SOPWorkspacePage'));
const SOPVersionPage = lazy(() => import('../pages/SOPVersionPage'));

const sopRouteConfig = [
  {
    path: '',
    Component: SOPListPage,
    handle: { title: 'SOP Library' },
  },
  {
    path: ':id',
    Component: SOPWorkspacePage,
    handle: { title: 'SOP Workspace' },
  },
  {
    path: ':id/versions/:versionId',
    Component: SOPVersionPage,
    handle: { title: 'SOP Version' },
  },
];

export default sopRouteConfig;