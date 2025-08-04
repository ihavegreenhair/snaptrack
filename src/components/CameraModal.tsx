import { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (file: File) => void;
}

export default function CameraModal({ isOpen, onClose, onPhotoTaken }: CameraModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCameraError(null);
    }
    
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    console.log('CameraModal: Starting camera...');
    setIsLoading(true);
    setCameraError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        },
        audio: false
      };

      console.log('CameraModal: Requesting user media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('CameraModal: Got media stream:', stream);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('CameraModal: Setting video source');
        videoRef.current.srcObject = stream;
        
        // Wait for the video to load
        const videoElement = videoRef.current;
        videoElement.onloadedmetadata = () => {
          console.log('CameraModal: Video metadata loaded, playing video');
          videoElement.play().then(() => {
            console.log('CameraModal: Video playing successfully');
            setVideoReady(true);
            // Auto-start countdown after video is ready
            setTimeout(() => {
              if (!countdown) {
                startCountdown();
              }
            }, 1000); // Give user 1 second to prepare
          }).catch(console.error);
        };
        
        videoElement.oncanplay = () => {
          console.log('CameraModal: Video can play');
        };
        
        videoElement.onerror = (e) => {
          console.error('CameraModal: Video error:', e);
        };
      } else {
        console.error('CameraModal: Video ref is null');
      }
    } catch (err: any) {
      console.error('CameraModal: Error accessing camera:', err);
      let errorMessage = 'Could not access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else {
        errorMessage += 'Please check your camera permissions.';
      }
      
      setCameraError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    setVideoReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          takePictureNow();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const takePictureNow = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 200);

        // Set canvas dimensions to match video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        // Draw the video frame (flip horizontally for selfie)
        context.scale(-1, 1);
        context.drawImage(
          videoRef.current, 
          -canvasRef.current.width, 
          0, 
          canvasRef.current.width, 
          canvasRef.current.height
        );
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

        // Convert to blob and automatically confirm
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            onPhotoTaken(file);
            onClose();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Take Your Selfie
          </DialogTitle>
          <DialogDescription>
            Take a photo to add your song to the queue
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Flash overlay */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-50 animate-pulse" />
          )}

          {/* Countdown overlay */}
          {countdown && (
            <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center">
              <div className="text-6xl font-bold text-white animate-ping">
                {countdown}
              </div>
            </div>
          )}

          {/* Main camera/preview area - always rendered */}
          <div className="relative aspect-[4/3] bg-gray-800">
            {/* Always-present video element */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                videoReady && !cameraError ? 'block' : 'hidden'
              }`}
            />
            
            {/* Error state overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                <div className="text-center p-6">
                  <div className="text-red-600 mb-4">{cameraError}</div>
                  <Button onClick={startCamera} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center text-white">
                  <div className="text-lg mb-2">Starting camera...</div>
                  <div className="text-sm opacity-75">Please wait</div>
                </div>
              </div>
            )}

            
            {/* Camera not ready overlay */}
            {!videoReady && !isLoading && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
                <div className="text-center">
                  <div className="text-lg mb-2">Preparing camera...</div>
                  <div className="text-sm opacity-75">Please wait</div>
                </div>
              </div>
            )}
            
            {/* Camera overlay elements - only show when video is ready */}
            {videoReady && !cameraError && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {/* Corner frames */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/50" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/50" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/50" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/50" />
                
                {/* Info text */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                  {countdown ? `Photo in ${countdown}...` : 'Get ready! Photo starting soon... 📸'}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {!cameraError && !isLoading && (
            <div className="p-6">
              <div className="text-center space-y-4">
                {!countdown && (
                  <div className="text-sm text-muted-foreground">
                    Get ready! Photo will be taken automatically...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Close button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50"
        >
          <X className="w-4 h-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}