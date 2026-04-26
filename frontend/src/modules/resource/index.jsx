/**
 * Resource Module — public entry point.
 *
 * Usage in DesktopRoutes.jsx:
 *   import ResourceRoutes from '@/modules/resource';
 *   ...
 *   <Route path="resource/*" element={<ResourceRoutes projectId={projectId} />} />
 */
export { default } from './routes/ResourceRoutes';
export { ResourceProvider, useResource } from './context/ResourceContext';
export { default as resourceApi } from './services/resourceApi';
