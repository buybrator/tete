# 1분 간격 가격 수집 설정 가이드

## Supabase Edge Function 배포 완료 ✅

Edge Function URL:
```
https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices
```

## 1분 간격 실행을 위한 옵션들:

### 옵션 1: Uptime Robot (무료, 5분 간격)
1. https://uptimerobot.com 가입
2. "Add New Monitor" 클릭
3. 설정:
   - Monitor Type: HTTP(s)
   - URL: `https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices`
   - Monitoring Interval: 5 minutes (무료 플랜 최소값)

### 옵션 2: Cron-job.org (무료, 1분 간격 가능)
1. https://cron-job.org 가입
2. "Create Cronjob" 클릭
3. 설정:
   ```
   Title: Collect Token Prices
   URL: https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices
   Schedule: Every minute
   Request Method: POST
   Headers:
   - Authorization: Bearer YOUR_CRON_SECRET
   - Content-Type: application/json
   ```

### 옵션 3: EasyCron (유료, 1분 간격)
1. https://www.easycron.com 가입
2. Cron Job 생성:
   ```
   URL: https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices
   Cron Expression: * * * * *
   HTTP Method: POST
   HTTP Headers: Authorization: Bearer YOUR_CRON_SECRET
   ```

### 옵션 4: Railway/Render (백엔드 서버)
백엔드 서버가 있다면 다음 코드 추가:

```javascript
// server/cron/priceCollector.js
const cron = require('node-cron');
const fetch = require('node-fetch');

// 1분마다 실행
cron.schedule('* * * * *', async () => {
  try {
    const response = await fetch(
      'https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    console.log('Price collection:', result);
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
```

## 환경 변수 설정 필요:

GitHub Secrets 또는 호스팅 플랫폼에 추가:
- `SUPABASE_URL`: https://ozeooonqxrjvdoajgvnz.supabase.co
- `SUPABASE_ANON_KEY`: (Supabase 대시보드에서 확인)
- `CRON_SECRET`: (보안을 위한 비밀 키)

## 테스트 방법:

```bash
# Edge Function 직접 테스트
curl -X POST https://ozeooonqxrjvdoajgvnz.supabase.co/functions/v1/collect-prices \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## 모니터링:

Supabase 대시보드 > Edge Functions > Logs에서 실행 로그 확인 가능