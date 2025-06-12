# 15분마다 자동 가격 수집 스케줄러
param(
    [switch]$Stop,
    [switch]$Status
)

$jobName = "TokenPriceCollector"
$scriptPath = Join-Path $PSScriptRoot "collect-prices.ps1"

if ($Stop) {
    Write-Host "🛑 자동 가격 수집 스케줄러 중지 중..." -ForegroundColor Yellow
    
    # 기존 스케줄된 작업 제거
    $task = Get-ScheduledTask -TaskName $jobName -ErrorAction SilentlyContinue
    if ($task) {
        Unregister-ScheduledTask -TaskName $jobName -Confirm:$false
        Write-Host "✅ 스케줄러가 중지되었습니다." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ 실행 중인 스케줄러가 없습니다." -ForegroundColor Blue
    }
    exit
}

if ($Status) {
    Write-Host "📊 스케줄러 상태 확인 중..." -ForegroundColor Cyan
    
    $task = Get-ScheduledTask -TaskName $jobName -ErrorAction SilentlyContinue
    if ($task) {
        $taskInfo = Get-ScheduledTaskInfo -TaskName $jobName
        Write-Host "✅ 스케줄러 실행 중" -ForegroundColor Green
        Write-Host "  - 상태: $($task.State)" -ForegroundColor White
        Write-Host "  - 마지막 실행: $($taskInfo.LastRunTime)" -ForegroundColor White
        Write-Host "  - 다음 실행: $($taskInfo.NextRunTime)" -ForegroundColor White
        Write-Host "  - 마지막 결과: $($taskInfo.LastTaskResult)" -ForegroundColor White
    } else {
        Write-Host "❌ 스케줄러가 실행되지 않고 있습니다." -ForegroundColor Red
        Write-Host "💡 다음 명령으로 시작: .\schedule-price-collection.ps1" -ForegroundColor Yellow
    }
    exit
}

# 기존 작업이 있다면 제거
$existingTask = Get-ScheduledTask -TaskName $jobName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "🔄 기존 스케줄러 업데이트 중..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $jobName -Confirm:$false
}

Write-Host "⏰ 15분마다 자동 가격 수집 스케줄러 설정 중..." -ForegroundColor Yellow

try {
    # 스케줄된 작업 액션 생성
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""
    
    # 15분마다 실행되는 트리거 생성
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration ([TimeSpan]::MaxValue)
    
    # 작업 설정
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # 작업 등록
    Register-ScheduledTask -TaskName $jobName -Action $action -Trigger $trigger -Settings $settings -Description "15분마다 토큰 가격 데이터를 수집합니다" -Force
    
    Write-Host "✅ 자동 가격 수집 스케줄러가 설정되었습니다!" -ForegroundColor Green
    Write-Host "📅 15분마다 자동으로 가격이 수집됩니다." -ForegroundColor Cyan
    Write-Host "💡 상태 확인: .\schedule-price-collection.ps1 -Status" -ForegroundColor Blue
    Write-Host "🛑 중지: .\schedule-price-collection.ps1 -Stop" -ForegroundColor Blue
    
    # 즉시 한 번 실행
    Write-Host "🚀 즉시 첫 수집을 실행합니다..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $jobName
    
} catch {
    Write-Host "❌ 스케줄러 설정 오류: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 관리자 권한으로 실행해보세요." -ForegroundColor Yellow
} 