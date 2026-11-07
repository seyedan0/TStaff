# Boundary Enforcement Script (PowerShell)
# Enforces architecture rules defined in Technical Proposal Section 5.1 & 5.2

Write-Host "Running architecture boundary checks for TStaff..." -ForegroundColor Cyan

$hasError = $false

# 1. apps/web must not import from apps/api or packages/database
$webViolations = Get-ChildItem -Path "apps/web/src" -Recurse -Filter "*.ts*" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "from\s+['\""].*(@tstaff/(database|api)|apps/api|packages/database)['\""]") {
        Write-Host "BOUNDARY ERROR: File $($_.FullName) imports from apps/api or packages/database!" -ForegroundColor Red
        $hasError = $true
    }
}

# 2. Domain layers must not import NestJS or ORMs
$domainViolations = Get-ChildItem -Path "apps/api/src/modules" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue | Where-Object {
    $_.FullName -match "\\domain\\"
} | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "from\s+['\""](@nestjs|@prisma/client|prisma|pg)['\""]") {
        Write-Host "BOUNDARY ERROR: Domain file $($_.FullName) imports framework/ORM!" -ForegroundColor Red
        $hasError = $true
    }
}

# 3. No cross-module deep internal imports in apps/api
$moduleViolations = Get-ChildItem -Path "apps/api/src/modules" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "from\s+['\""](\.\./)+[a-z-]+/(infrastructure|presentation)/") {
        Write-Host "BOUNDARY ERROR: File $($_.FullName) has illegal internal cross-module import!" -ForegroundColor Red
        $hasError = $true
    }
}

if ($hasError) {
    Write-Host "Boundary check FAILED! Please fix architecture boundary violations." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All architecture boundary checks PASSED cleanly!" -ForegroundColor Green
    exit 0
}

