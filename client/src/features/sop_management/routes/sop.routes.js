import { lazy } from 'react';

const SOPListPage = lazy(() => import('../pages/SOPListPage'));
const SOPDetailsPage = lazy(() => import('../pages/SOPDetailsPage'));

/**
 * SOP Management route configuration.
 *
 * Each entry: { path, Component, handle: { title } }
 * - index route uses path: ''
 *
 * Usage in router:
 *   import { sopRouteConfig } from './routes/sop.routes';
 *   ...sopRouteConfig.map(({ path, Component, handle }) => (
 *     <Route key={`sop-${path}`} path={path} element={<Component />} handle={handle} />
 *   ))
 */
const sopRouteConfig = [
  {
    path: '',
    Component: SOPListPage,
    handle: { title: 'SOP Library' },
  },
  {
    path: ':id',
    Component: SOPDetailsPage,
    handle: { title: 'SOP Details' },
  },
];

export default sopRouteConfig;
