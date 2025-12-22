import React from 'react';
import { User, LogOut, Trash2, ShieldCheck, RefreshCw, Palette, Sun, Moon, Sparkles, Sunset, Waves, Check, Layout } from 'lucide-react';
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
import { type VisualizerMode } from './Visualizer';

interface UserMenuProps {
  displayName: string;
  isHost: boolean;
  onRename: () => void;
  onBecomeHost?: () => void;
  onClearQueue?: () => void;
  onEndParty?: () => void;
  onPrePopulate?: () => void;
  autoAddEnabled?: boolean;
  onToggleAutoAdd?: () => void;
  visualizerMode?: VisualizerMode;
  onVisualizerChange?: (mode: VisualizerMode) => void;
  visualizerSensitivity?: number;
  onSensitivityChange?: (value: number) => void;
  isDashboardMode?: boolean;
  onDashboardChange?: (enabled: boolean) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  displayName, 
  isHost, 
  onRename, 
  onBecomeHost, 
  onClearQueue,
  onEndParty,
  onPrePopulate,
  autoAddEnabled,
  onToggleAutoAdd,
  visualizerMode = 'none',
  onVisualizerChange,
  visualizerSensitivity = 1.5,
  onSensitivityChange,
  isDashboardMode,
  onDashboardChange
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

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>Visualizer</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
            <DropdownMenuRadioGroup value={visualizerMode} onValueChange={(val) => onVisualizerChange?.(val as VisualizerMode)}>
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vj" className="font-bold text-primary">
                <Sparkles className="mr-2 h-4 w-4" /> Auto VJ Mode
              </DropdownMenuRadioItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Shader Worlds (SDF)</DropdownMenuLabel>
              <DropdownMenuRadioItem value="menger">Fractal Menger</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="city">Infinite Skyscrapers</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="matrix">Digital Matrix</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rooms">Recursive Rooms</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bulb">Mandelbulb Fractal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="landmass">Voxel Landmass</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="columns">Neon Pillars</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blob">Liquid Blob</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="gyroid">Gyroid Membrane</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tunnel">Hyper-Torus</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="lava">Lava Sea</DropdownMenuRadioItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Geometric Physics (Mesh)</DropdownMenuLabel>
              <DropdownMenuRadioItem value="shapes">3D Shape Storm</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="trees">Fractal Trees</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="platonic">Platonic Solids</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="helix">DNA Helix</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="neural">Neural Web</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rings">Audio Rings</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="core3d">Geometric Core</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vortex">Rotating Vortex</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="cloud">Hyper-Cloud</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Sensitivity</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={visualizerSensitivity.toString()} onValueChange={(val) => onSensitivityChange?.(parseFloat(val))}>
              <DropdownMenuRadioItem value="0.5">Low</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1.5">Normal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="3.0">High</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="6.0">MAX</DropdownMenuRadioItem>
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
            
            {onDashboardChange && (
              <DropdownMenuItem onClick={() => onDashboardChange(!isDashboardMode)}>
                <div className="flex items-center w-full">
                  <Layout className={`mr-2 h-4 w-4 ${isDashboardMode ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="flex-1 text-primary font-bold">Dashboard Mode</span>
                  {isDashboardMode && <Check className="h-4 w-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            )}

            {onToggleAutoAdd && (
              <DropdownMenuItem onClick={onToggleAutoAdd}>
                <div className="flex items-center w-full">
                  <RefreshCw className={`mr-2 h-4 w-4 ${autoAddEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="flex-1">Auto-play Radio</span>
                  {autoAddEnabled && <Check className="h-4 w-4 text-green-500" />}
                </div>
              </DropdownMenuItem>
            )}

            {onPrePopulate && (
              <DropdownMenuItem onClick={onPrePopulate} className="text-blue-500">
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Pre-populate Queue</span>
              </DropdownMenuItem>
            )}
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