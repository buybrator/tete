# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TradeChat is a decentralized trading platform that combines Solana blockchain with real-time chat functionality. The frontend UI/UX is complete with mock data, and the project is transitioning to real backend integration with Supabase and Solana blockchain.

## Tech Stack

- **Frontend**: Next.js 15.3.2 (Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Radix UI
- **Backend**: Node.js, Express 5, Socket.IO with Redis adapter, PostgreSQL, PM2
- **Blockchain**: Solana Web3.js, SPL Token, Metaplex, Phantom/Solflare wallet adapters
- **Database**: PostgreSQL (via Supabase in production, local pg for development)
- **Real-time**: Socket.IO with Redis for scalability

## Development Commands

```bash
# Install dependencies
npm install

# Development with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Start backend server separately (if needed)
cd server && node index.js
```

## Architecture Overview

### Directory Structure
- `/app/api/` - Next.js API routes following App Router pattern
- `/components/` - React components with `/ui/` for Radix UI-based components
- `/hooks/` - Custom React hooks (useSolana, useWallet, useChat, etc.)
- `/lib/` - Utility functions and service layers
- `/server/` - Express + Socket.IO backend server
- `/contexts/` - React Context providers for global state

### Key Patterns

**API Routes**: Export named HTTP methods (GET, POST, etc.) returning NextResponse
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Custom Hooks**: Return object with states, actions, and helpers
```typescript
return { state, loading, error, action, isReady: !loading && !error };
```

**Database**: Uses connection pooling with Redis caching layer (`server/database/connection.ts`)

### Environment Variables

Required in `server.env`:
- `PORT` (default: 3001)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL` (for Socket.IO scaling)
- `FRONTEND_URL` (for CORS)

### Real-time Architecture

1. **Main Server** (`server/index.ts`): Full-featured with Redis adapter for clustering
2. **Simple Server** (`server/index-simple.ts`): Lightweight alternative with direct Supabase integration
3. **PM2 Config** (`ecosystem.config.js`): Cluster mode with auto-restart at 500MB

### Trading Message Format

Messages follow pattern: `ACTION:TOKEN:AMOUNT@PRICE[:PROTOCOL]`
- Example: `BUY:SOL:100@1.5` or `SELL:BONK:1000000@0.000045:RAYDIUM`

### Database Schema

Key tables:
- `chat_rooms` - Chat room metadata with wallet-based permissions
- `profiles` - User profiles linked to wallet addresses
- `chat_messages` - Messages with trade information
- `token_price_history` - 15-minute interval price data (max 48 points per token)

### Development Scripts

PowerShell scripts in `/scripts/`:
- `collect-prices.ps1` - Manual price collection
- `auto-collect-every-15min.ps1` - Scheduled price collection
- `check-stored-data.ps1` - Verify stored price data

### Important Notes

1. **No test framework** is currently configured - consider adding Jest or Vitest
2. **Wallet Authentication**: Uses Solana wallet signatures for auth instead of traditional login
3. **Rate Limiting**: Implemented in `middleware.ts` with different limits per endpoint type
4. **Neobrutalism Design**: Custom UI system with distinctive visual style
5. **Mock to Real Transition**: Many features currently use mock data that need Supabase/blockchain integration

### Common Tasks

To add a new API endpoint:
1. Create `/app/api/[endpoint]/route.ts`
2. Export named HTTP method functions
3. Follow consistent error handling pattern
4. Add rate limiting in `middleware.ts` if needed

To add a new hook:
1. Create `/hooks/use[Feature].ts`
2. Include loading and error states
3. Return object with states and actions
4. Add TypeScript types

To modify database:
1. Update schema in `server/database/schema.sql`
2. Create migration file if modifying existing tables
3. Update TypeScript types in `server/types/database.ts`