# 🚀 TradeChat - Neobrutalism DEX & Memo Chat

SOL DEX 거래와 실시간 채팅을 결합한 반응형 웹 애플리케이션입니다. Neobrutalism 디자인 시스템을 기반으로 구축되었으며, PC와 모바일 모두에서 최적화된 사용자 경험을 제공합니다.

## ✅ 최신 업데이트: 지갑연결 시스템 완전 개선 (2024년 12월)

### 🎯 해결된 주요 이슈들

1. **지갑 상태 관리 통합**
   - `useWallet` 훅 완전 재구현으로 실제 Solana 지갑 어댑터와 완전 연동
   - 연결 상태, 주소, 닉네임, 아바타 실시간 동기화
   - PC/모바일 컴포넌트 간 상태 일치 보장

2. **프로필 정보 영구 저장**
   - localStorage 기반 지갑별 프로필 관리 시스템 구축
   - 닉네임, 아바타 설정이 실제로 저장되고 로드됨
   - 다중 지갑 지원으로 지갑별 독립적 프로필 관리

3. **UI/UX 대폭 개선**
   - 에러 처리 및 로딩 상태 표시 개선
   - 이미지 업로드 기능 추가 (5MB 제한, 타입 검증)
   - 잔고 조회 및 새로고침 기능 완전 구현

### 🚀 새로운 기능들

- **🎭 지갑 프로필 시스템**: 각 지갑별 독립적인 닉네임과 아바타
- **📸 커스텀 아바타**: 이미지 파일 업로드 지원 + 기본 이모지 10종
- **💰 실시간 잔고**: SOL 잔고 자동 조회 및 수동 새로고침
- **🔄 다중 지갑**: 여러 지갑 간 전환 시 프로필 자동 로드
- **⚡ 향상된 UX**: 연결/해제 상태, 에러 메시지, 성공 피드백

---

## ✨ 주요 기능

### 🖥️ PC (≥1024px)
- **Navbar**: 로고, 채팅방 검색/선택, 지갑 연결
- **Chat Area**: 탭 형태의 채팅방 전환, 실시간 메시지, 거래 실행 버튼
- **Trade Setting Panel**: BUY/SELL 토글, 수량 입력, 프리셋, 슬리피지/프라이어리티 설정
- **팝업 채팅**: 각 채팅방을 별도 창으로 열어 항상 위에 표시

### 📱 Mobile (<1024px)  
- **Navbar**: 간소화된 상단 바
- **Chat Area**: 풀스크린 채팅 영역
- **Trade Setting Drawer**: 240px 고정 하단 패널
- **Putter**: 70px 고정 최하단 네비게이션 (explore/search/account)

## 🎨 디자인 시스템

- **Neobrutalism**: [neobrutalism.dev](https://neobrutalism.dev) 공식 컴포넌트만 사용
- **Global CSS**: 모든 스타일링은 `app/globals.css`에서 관리
- **반응형**: 완전한 모바일-퍼스트 반응형 디자인
- **다크모드**: 자동 다크모드 지원

## 🏗️ 프로젝트 구조

```
/app
  globals.css          # 전역 스타일 (Neobrutalism + 커스텀)
  layout.tsx           # 루트 레이아웃
  page.tsx             # 메인 페이지

/components
  /layout              # 레이아웃 컴포넌트
    Navbar.tsx         # 상단 네비게이션
    ChatArea.tsx       # 채팅 영역 (탭 + 메시지 + 입력)
    ChatBubble.tsx     # 메시지 버블
    ChatInput.tsx      # 메시지 입력창
    TradeSettingsPanel.tsx  # 거래 설정 패널
    MobilePutter.tsx   # 모바일 하단 네비게이션
  /ui                  # Neobrutalism UI 컴포넌트들


/hooks                 # 커스텀 훅
  useWallet.ts         # 지갑 연결/관리
  useChat.ts           # 채팅 기능
  useTrade.ts          # 거래 기능
  useChatMessages.ts   # 실시간 메시지 동기화

/types
  index.ts             # TypeScript 타입 정의
```

## 🚀 시작하기

### 웹 버전 (개발)

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### Electron 데스크탑 앱

```bash
# 의존성 설치 (아직 안 했다면)
npm install


# 또는 개별 실행
npm run dev          # 터미널 1: Next.js 개발 서버
```

### 프로덕션 빌드

```bash
# 웹 앱 빌드
npm run build

# Electron 앱 빌드 (Windows, macOS, Linux)
npm run dist
```

### 환경 설정

```bash
# .env.local 파일 생성
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_NETWORK=mainnet
```

## 📦 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: Neobrutalism Components + Tailwind CSS
- **Icons**: Lucide React
- **State**: React Hooks + Context
- **Wallet**: Solana Wallet Adapter + Custom Profile System
- **Storage**: localStorage (Profile Data)
- **Desktop**: Electron (Always on Top 지원)
- **Backend Ready**: API 연동을 위한 타입 및 훅 준비

## 🎯 사용법

### 1. 지갑 연결 및 프로필 설정
- **PC**: 우상단 "지갑 연결" 버튼 클릭
- **모바일**: 하단 "account" 버튼 클릭
- 지원 지갑: Phantom, Solflare
- **프로필 설정**: 연결된 지갑 버튼 클릭 → 프로필 편집
  - 닉네임 설정 (빈 값 시 지갑 주소 축약 표시)
  - 아바타 선택 (기본 이모지 10종 또는 이미지 업로드)
  - SOL 잔고 확인 및 새로고침
- **다중 지갑**: 각 지갑별 독립적 프로필 저장

### 2. 채팅방 이용
- 상단 탭에서 채팅방 선택
- 실시간 메시지 확인
- 하단 입력창에서 메시지 + 거래 실행

### 4. PIP 모드 (웹 브라우저)
- 채팅방 탭 우상단의 📱 아이콘 클릭
- Picture-in-Picture 오버레이로 채팅 표시
- 다른 탭이나 앱 사용 중에도 채팅 확인 가능

### 5. 거래 설정
- 우측 패널(PC) 또는 하단 드로어(Mobile)에서 설정
- BUY/SELL 모드 선택
- 수량, 슬리피지, 프라이어리티 설정
- 프리셋 버튼으로 빠른 설정

### 6. 모바일 네비게이션
- **explore**: 최근 채팅방 5개 드롭다운
- **search**: 채팅방 검색/개설 사이드바
- **account**: 지갑 연결/프로필 설정

## 🛠️ 개발 가이드

### 컴포넌트 추가 시 주의사항

1. **스타일링**: `globals.css`에만 스타일 정의
2. **컴포넌트**: Neobrutalism 공식 컴포넌트만 import
3. **반응형**: 모바일-퍼스트로 설계
4. **타입 안전성**: TypeScript 타입 정의 필수

### 백엔드 연동 시

1. `/hooks` 파일들의 TODO 주석 참고
2. Mock 데이터를 실제 API 호출로 교체
3. WebSocket 연결 활성화
4. 환경변수 설정

## 🎨 커스터마이징

### 색상 변경
`app/globals.css`의 CSS 변수 수정:

```css
:root {
  --background: oklch(95.38% 0.0357 72.89);
  --main: oklch(72.27% 0.1894 50.19);
  --border: oklch(0% 0 0);
  /* ... */
}
```

### 레이아웃 수정
`app/globals.css`의 레이아웃 클래스 수정:

```css
.desktop-chat-area {
  /* 데스크탑 채팅 영역 스타일 */
}

.mobile-putter {
  /* 모바일 하단 네비게이션 스타일 */
}
```

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Neobrutalism** 디자인 시스템으로 구축된 차세대 DEX 채팅 플랫폼 🚀
#   t e t e 
 
 #   t e t e 
 
 