import fs from 'node:fs';
import path from 'node:path';

let hasError = false;

function scanFiles(dir, filter, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanFiles(fullPath, filter, callback);
    } else if (filter(entry.name)) {
      callback(fullPath);
    }
  }
}

console.log('Running architecture boundary checks for TStaff (Cross-Platform)...');

// 1. apps/web must not import from api or database
scanFiles('apps/web/src', (f) => f.endsWith('.ts') || f.endsWith('.tsx'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (/from\s+['"].*(@tstaff\/(database|api)|apps\/api|packages\/database)['"]/.test(content)) {
    console.error(`BOUNDARY ERROR: ${filePath} illegally imports from database or api!`);
    hasError = true;
  }
});

// 2. Domain layers must not import NestJS or ORMs
scanFiles('apps/api/src/modules', (f) => f.endsWith('.ts'), (filePath) => {
  if (filePath.includes(path.sep + 'domain' + path.sep)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (/from\s+['"](@nestjs|drizzle-orm|pg|@prisma\/client|prisma)['"]/.test(content)) {
      console.error(`BOUNDARY ERROR: Domain file ${filePath} illegally imports framework or ORM!`);
      hasError = true;
    }
  }
});

// 3. No cross-module deep internal imports in apps/api/src/modules
scanFiles('apps/api/src/modules', (f) => f.endsWith('.ts'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (/from\s+['"](\.\.\/)+[a-z-]+\/(infrastructure|presentation)\//.test(content)) {
    console.error(`BOUNDARY ERROR: File ${filePath} has illegal deep cross-module internal import!`);
    hasError = true;
  }
});

if (hasError) {
  console.error('\n❌ Architecture boundary checks FAILED!');
  process.exit(1);
} else {
  console.log('✅ All architecture boundary checks PASSED cleanly!');
  process.exit(0);
}
