/**
 * Backward-compatible barrel.
 * All existing imports of this file continue to work unchanged.
 * New code should import directly from the domain file, e.g.:
 *   import { dashboardService } from '@/services/dashboardService';
 */
export { default, attachResponseInterceptor, getMediaUrl } from './client';
export { dashboardService } from './dashboardService';
export { accountingService } from './accountingService';
export { constructionService, calculatorService } from './constructionService';
export { estimateService } from './estimateService';
export { permitService, permitCopilotService } from './permitService';
export { importService, dataTransferService } from './dataTransferService';
export { accountsService } from './accountsService';
export { photoIntelService } from './photoIntelService';
export { analyticsService } from './analyticsService';
export { boqService } from './boqService';
export { assistantService } from './assistantService';
