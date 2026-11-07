/**
 * Test utilities and mock builders for TStaff tests
 */
export function createMockTraceId(): string {
  return '01JTESTTRACEID' + Math.random().toString(36).substring(2, 9);
}

export function createMockIdempotencyKey(): string {
  return 'idemp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

