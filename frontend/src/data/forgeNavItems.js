import { ROUTES } from './routes';

/** Menu sidebar layout Forge (chat) — tách file để tránh export không phải component trong layout. */
export const FORGE_NAV_ITEMS = [
  { id: 'general', label: 'GENERAL', to: ROUTES.CHAT },
  { id: 'guild', label: 'GUILD HALL', to: null },
  { id: 'workshop', label: 'ARTISAN WORKSHOP', to: null },
  { id: 'market', label: 'MARKETPLACE', to: null },
  { id: 'zen', label: 'ZEN GARDEN', to: null },
];
