import React, { useState } from 'react';
import { User, Settings, LogOut, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from './ui/toast';

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
  const toast = useToast();

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
