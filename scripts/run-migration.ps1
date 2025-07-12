# 데이터베이스 마이그레이션 실행 스크립트
Write-Host "🔄 데이터베이스 마이그레이션 실행 중..." -ForegroundColor Yellow

# 환경 변수 설정 (필요시 수정)
$env:PGPASSWORD = "your_password"
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "your_database"
$dbUser = "your_user"

# 마이그레이션 파일 경로
$migrationFile = Join-Path $PSScriptRoot "..\server\database\migrations\001_change_to_1min_interval.sql"

try {
    # PostgreSQL 명령 실행
    $command = "psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$migrationFile`""
    
    Write-Host "🔧 명령 실행: $command" -ForegroundColor Cyan
    
    # 실행
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 마이그레이션 성공!" -ForegroundColor Green
    } else {
        Write-Host "❌ 마이그레이션 실패!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 오류 발생: $_" -ForegroundColor Red
    Write-Host "💡 PostgreSQL이 설치되어 있고 psql 명령을 사용할 수 있는지 확인하세요." -ForegroundColor Yellow
    Write-Host "💡 또는 Supabase 대시보드에서 SQL 쿼리를 직접 실행하세요." -ForegroundColor Yellow
}

Write-Host "`n📋 Supabase를 사용하는 경우:" -ForegroundColor Cyan
Write-Host "1. Supabase 대시보드로 이동" -ForegroundColor White
Write-Host "2. SQL Editor 열기" -ForegroundColor White
Write-Host "3. 다음 파일의 내용을 복사하여 실행:" -ForegroundColor White
Write-Host "   $migrationFile" -ForegroundColor Yellow