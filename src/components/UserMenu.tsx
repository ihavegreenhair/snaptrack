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
  maxEntities?: number;
  onMaxEntitiesChange?: (value: number) => void;
  rotationSpeed?: number;
  onRotationSpeedChange?: (value: number) => void;
  crazyFactor?: number;
  onCrazyFactorChange?: (value: number) => void;
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
  maxEntities = 60,
  onMaxEntitiesChange,
  rotationSpeed = 1.0,
  onRotationSpeedChange,
  crazyFactor = 1.0,
  onCrazyFactorChange,
  isDashboardMode,
  onDashboardChange
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
// ... (existing menu trigger)
      <DropdownMenuContent align="end" className="w-56">
// ... (existing header and theme menu)
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>Visualizer</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[500px] overflow-y-auto">
            <DropdownMenuRadioGroup value={visualizerMode} onValueChange={(val) => onVisualizerChange?.(val as VisualizerMode)}>
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vj" className="font-bold text-primary">
                <Sparkles className="mr-2 h-4 w-4" /> Auto VJ Mode
              </DropdownMenuRadioItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Type A: Geometry Versions</DropdownMenuLabel>
              <DropdownMenuRadioItem value="menger_sponge">Menger Sponge</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="neon_pillars">Neon Pillars</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="liquid_blob">Liquid Blob</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="the_matrix_v2">The Matrix v2</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="fractal_landmass">Fractal Landmass</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="hyper_torus">Hyper-Torus</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="recursive_rooms">Recursive Rooms</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="gyroid_membrane">Gyroid Membrane</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="neon_ribbons">Neon Ribbons</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="crystal_growth">Crystal Growth</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="void_vortex">Void Vortex</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="digital_clouds">Digital Clouds</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="hexagonal_hive">Hexagonal Hive</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mandelbulb">Mandelbulb</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="lava_sea">Lava Sea</DropdownMenuRadioItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Type B: Geometry & Mesh</DropdownMenuLabel>
              <DropdownMenuRadioItem value="shape_storm">Shape Storm</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="neural_web">Neural Web</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vinyl_rain">Vinyl Rain</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="boids_swarm">Boids Swarm</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="audio_rings_v2">Audio Rings v2</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="jellyfish">Jellyfish</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="voxelizer">Voxelizer</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="spring_field">Spring Field</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="particle_fountain">Particle Fountain</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="floating_islands">Floating Islands</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light_trails">Light Trails</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="physics_pile">Physics Pile</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="string_theory">String Theory</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="geometric_core">Geometric Core</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mirror_prism">Mirror Prism</DropdownMenuRadioItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Classic & Games</DropdownMenuLabel>
              <DropdownMenuRadioItem value="pong">Pong AI</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="invaders">Space Invaders</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pacman">Pacman 3D</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="snake">Viper 3D</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tetris">3D Tetris</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="puzzle">Sliding Puzzle</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Audio Sensitivity</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={visualizerSensitivity.toString()} onValueChange={(val) => onSensitivityChange?.(parseFloat(val))}>
              <DropdownMenuRadioItem value="0.5">Low</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1.5">Normal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="3.0">High</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="6.0">MAX</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Max Entities</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={maxEntities.toString()} onValueChange={(val) => onMaxEntitiesChange?.(parseInt(val))}>
              <DropdownMenuRadioItem value="20">20 (Mobile)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="60">60 (Normal)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="150">150 (High)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="300">300 (Ultra)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Rotation Speed</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={rotationSpeed.toString()} onValueChange={(val) => onRotationSpeedChange?.(parseFloat(val))}>
              <DropdownMenuRadioItem value="0.2">Chill</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1.0">Normal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="2.5">Fast</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="5.0">HYPER</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">Crazy Factor</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={crazyFactor.toString()} onValueChange={(val) => onCrazyFactorChange?.(parseFloat(val))}>
              <DropdownMenuRadioItem value="0.5">Subtle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1.0">Normal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="2.0">Wild</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="4.0">INSANE</DropdownMenuRadioItem>
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