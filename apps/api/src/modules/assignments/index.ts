/**
 * Public API boundary for assignments module.
 * Only export contracts and public application services.
 */
export * from './assignments.module.js';
export * from './domain/assignment.entity.js';
export * from './domain/assignment-errors.js';
export * from './application/assignments.service.js';
export * from './application/ports/assignment.repository.port.js';
