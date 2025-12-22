import React from 'react';
import { User, LogOut, Trash2, ShieldCheck, RefreshCw, Palette, Sun, Moon, Sparkles, Sunset, Waves } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '../lib/ThemeContext';

interface UserMenuProps {
  displayName: string;
  isHost: boolean;
  onRename: () => void;
  onBecomeHost?: () => void;
  onClearQueue?: () => void;
  onEndParty?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  displayName, 
  isHost, 
  onRename, 
  onBecomeHost, 
  onClearQueue,
  onEndParty 
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full bg-muted">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-bold">{displayName}</span>
            <span className="text-xs text-muted-foreground">{isHost ? 'Host' : 'Guest'}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onRename}>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Change Name</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(val) => setTheme(val as Theme)}>
              <DropdownMenuRadioItem value="light">
                <Sun className="mr-2 h-4 w-4" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="mr-2 h-4 w-4" /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="neon">
                <Sparkles className="mr-2 h-4 w-4" /> Neon
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sunset">
                <Sunset className="mr-2 h-4 w-4" /> Sunset
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ocean">
                <Waves className="mr-2 h-4 w-4" /> Ocean
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {!isHost && onBecomeHost && (
          <DropdownMenuItem onClick={onBecomeHost}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>Become Host</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        
        {isHost && (
          <>
            <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">Host Actions</DropdownMenuLabel>
            {onClearQueue && (
              <DropdownMenuItem onClick={onClearQueue} className="text-amber-600">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Clear Queue</span>
              </DropdownMenuItem>
            )}
            {onEndParty && (
              <DropdownMenuItem onClick={onEndParty} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>End Party</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
