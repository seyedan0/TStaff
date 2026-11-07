/**
 * TStaff Background Worker Entry Point
 */
function logWorkerMessage(message: string, level = 'info') {
  const timestamp = new Date().toISOString();
  process.stdout.write(JSON.stringify({ timestamp, level, context: 'Worker', message }) + '\n');
}

async function startWorker() {
  logWorkerMessage('TStaff Background Worker started (Outbox processor & maintenance jobs)');
}

startWorker();

