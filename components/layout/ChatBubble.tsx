import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type Props = {
  side: 'buy' | 'sell';
  avatar: string;
  amount: string;
  message: string;
  userAddress?: string;
  timestamp?: Date;
};

export default function ChatBubble({ 
  side, 
  avatar, 
  amount, 
  message, 
  userAddress,
  timestamp 
}: Props) {
  const bubbleClass = `max-w-fit px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
    side === 'buy' 
      ? 'bg-green-50 border-green-200 text-green-900' 
      : 'bg-red-50 border-red-200 text-red-900'
  }`;
  
  return (
    <div className={bubbleClass} style={{ boxShadow: 'none' }}>
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 border-2 border-gray-300" style={{ boxShadow: 'none' }}>
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">
            {userAddress ? userAddress.slice(2, 4).toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge 
              variant={side === 'buy' ? 'default' : 'neutral'} 
              className={`font-bold border-2 transition-colors ${
                side === 'buy' 
                  ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                  : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
              }`}
              style={{ boxShadow: 'none' }}
            >
              {side === 'buy' ? '+' : '-'}{amount}
            </Badge>
            {timestamp && (
              <span className="text-xs text-gray-500">
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className="text-sm break-words max-w-xs leading-relaxed">{message}</p>
        </div>

      </div>
    </div>
  );
} 