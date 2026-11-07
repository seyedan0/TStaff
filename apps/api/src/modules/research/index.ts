/**
 * Public API boundary for research module.
 * Only export contracts and public application services.
 */
export * from './research.module.js';
export * from './domain/research-case.entity.js';
export * from './domain/stage-instance.entity.js';
export * from './domain/research-errors.js';
export * from './application/research.service.js';
export * from './application/ports/research.repository.port.js';
