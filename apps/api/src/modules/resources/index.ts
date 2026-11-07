/**
 * Public API boundary for resources module.
 * Only export contracts and public application services.
 */
export * from './resources.module.js';
export * from './domain/resource.entity.js';
export * from './domain/interview.entity.js';
export * from './domain/interview-report.entity.js';
export * from './domain/resource-errors.js';
export * from './application/resources.service.js';
export * from './application/ports/resource.repository.port.js';
