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
    setIsLoading(true);
    setCameraError(null);
    
    // Detailed device detection (outside try block for error handling access)
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isAndroidChrome = isAndroid && /Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent);
    const isAndroidWebView = isAndroid && /wv|WebView/i.test(userAgent);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Check if we're on HTTPS (required for camera access on most browsers)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera requires HTTPS connection (except on localhost)');
      }

      // Android-specific constraints (ultra-minimal)
      let constraints;
      if (isAndroid) {
        // Android often fails with ANY constraints, try ultra-basic first
        constraints = {
          video: true,  // No constraints at all for Android
          audio: false
        };
      } else if (isMobile) {
        constraints = {
          video: {
            facingMode: 'user'
          },
          audio: false
        };
      } else {
        constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          },
          audio: false
        };
      }
      
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for the video to load
        const videoElement = videoRef.current;
        
        videoElement.onloadedmetadata = () => {
          if (isAndroid) {
            // Android sometimes needs extra time
            setTimeout(() => {
              videoElement.play().then(() => {
                setVideoReady(true);
                setTimeout(() => {
                  if (!countdown) {
                    startCountdown();
                  }
                }, 1500);
              }).catch((playError) => {
                console.error('Android video play failed:', playError);
                setCameraError('Android video playback failed: ' + playError.message);
              });
            }, 500);
          } else {
            videoElement.play().then(() => {
              setVideoReady(true);
              setTimeout(() => {
                if (!countdown) {
                  startCountdown();
                }
              }, 1000);
            }).catch((playError) => {
              console.error('Video play failed:', playError);
              setCameraError('Video playback failed: ' + playError.message);
            });
          }
        };
        
        videoElement.oncanplay = () => {
        };
        
        videoElement.onerror = (e) => {
          console.error('CameraModal: Video error:', e);
          setCameraError('Video element error occurred');
        };
        
        // Force load metadata in case it doesn't auto-load
        setTimeout(() => {
          if (!videoReady) {
            videoElement.load();
          }
        }, 2000);
      } else {
        console.error('CameraModal: Video ref is null');
      }
    } catch (err: any) {
      console.error('CameraModal: Error accessing camera:', err);
      console.log('Error details:', { name: err.name, message: err.message, code: err.code });
      
      const userAgent = navigator.userAgent;
      const isAndroid = /Android/i.test(userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      console.log('❌ CAMERA ERROR DETAILS:');
      console.log('- Error name:', err.name);
      console.log('- Error message:', err.message);
      console.log('- Error code:', err.code);
      console.log('- Is Android:', isAndroid);
      
      let errorMessage = 'Camera access failed. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (isAndroid) {
          // Android-specific permission instructions
          console.log('🤖 ANDROID PERMISSION DENIED - providing specific instructions');
          const isAndroidChrome = /Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent);
          
          if (isAndroidChrome) {
            errorMessage = '🤖 Android Chrome camera blocked:\n\n1. Tap the lock icon 🔒 in address bar\n2. Tap "Permissions"\n3. Change Camera to "Allow"\n4. Refresh page\n\nOR:\n• Chrome menu > Settings > Site settings > Camera > Allow';
          } else {
            errorMessage = '🤖 Android camera blocked:\n\n1. Tap address bar info icon\n2. Allow Camera permission\n3. Refresh page\n\nOR:\n• Long-press this tab > Site settings > Camera';
          }
        } else if (isMobile) {
          // Other mobile instructions
          const isIOS = /iPad|iPhone|iPod/.test(userAgent);
          
          if (isIOS) {
            errorMessage = '📱 Camera blocked on iPhone/iPad:\n\n1. Tap "aA" in address bar\n2. Tap "Website Settings"\n3. Allow Camera\n4. Refresh page\n\nOR go to Settings > Safari > Camera > Allow';
          } else if (isAndroid) {
            errorMessage = '📱 Camera blocked on Android:\n\n1. Tap lock/info icon in address bar\n2. Tap "Permissions"\n3. Allow Camera\n4. Refresh page\n\nOR long-press this tab > Site settings > Camera > Allow';
          } else {
            errorMessage = '📱 Camera permission denied:\n\n1. Look for camera icon 📷 in address bar\n2. Tap it and select "Allow"\n3. Refresh the page\n\nIf no icon, try Settings > Site permissions';
          }
        } else {
          // Desktop instructions
          const isChrome = /Chrome/.test(navigator.userAgent);
          const isFirefox = /Firefox/.test(navigator.userAgent);
          const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
          
          if (isChrome) {
            errorMessage = '🎥 Camera blocked in Chrome:\n\n1. Click the camera icon 📷 in address bar\n2. Select "Always allow"\n3. Refresh page\n\nOR go to chrome://settings/content/camera';
          } else if (isFirefox) {
            errorMessage = '🎥 Camera blocked in Firefox:\n\n1. Click the shield icon in address bar\n2. Turn off "Blocked" for Camera\n3. Refresh page\n\nOR go to about:preferences#privacy';
          } else if (isSafari) {
            errorMessage = '🎥 Camera blocked in Safari:\n\n1. Safari menu > Settings for This Website\n2. Change Camera to "Allow"\n3. Refresh page\n\nOR Safari > Preferences > Websites > Camera';
          } else {
            errorMessage = '🎥 Camera permission denied:\n\n1. Look for camera icon 📷 in address bar\n2. Click it and allow access\n3. Refresh the page';
          }
        }
      } else if (err.name === 'NotFoundError') {
        errorMessage = '📷 No camera found on this device. Please use the "Upload Photo" option instead.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '🔒 Camera is being used by another app. Please close other camera apps and try again.';
      } else if (err.name === 'OverconstrainedError') {
        console.log('🤖 OverconstrainedError - trying even more basic constraints...');
        
        if (isAndroid) {
          console.log('🤖 ANDROID FALLBACK: Constraints too specific, trying absolute minimum...');
        }
        
        errorMessage = '⚙️ Trying simpler camera settings...';
        // Try ultra-basic constraints
        try {
          console.log('Trying ultra-basic camera access (video: true only)...');
          const basicStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
          
          streamRef.current = basicStream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            const videoElement = videoRef.current;
            videoElement.onloadedmetadata = () => {
              console.log('Fallback video metadata loaded');
              videoElement.play().then(() => {
                console.log('Fallback video playing');
                setVideoReady(true);
                setTimeout(() => {
                  if (!countdown) {
                    startCountdown();
                  }
                }, 1000);
              }).catch(console.error);
            };
          }
          setIsLoading(false);
          return; // Exit early if successful
        } catch (basicErr: any) {
          console.error('Basic camera access also failed:', basicErr);
          if (isAndroid) {
            console.log('🤖 ANDROID: Even ultra-basic constraints failed!');
            errorMessage = '❌ Android camera not accessible. This might be:\n\n• Camera in use by another app\n• Chrome needs to be updated\n• Try closing other apps and restart Chrome';
          } else {
            errorMessage = '❌ Camera constraints not supported on this device. Please use "Upload Photo" instead.';
          }
        }
      } else if (err.name === 'AbortError') {
        errorMessage = '⏹️ Camera access was cancelled. Please try again.';
      } else {
        if (err.message?.includes('HTTPS')) {
          errorMessage = '🔒 Camera requires secure connection:\n\n• Camera only works on HTTPS sites\n• Use "Upload Photo" for now\n• Ask site admin to enable HTTPS';
        } else if (isAndroid) {
          errorMessage = '🤖 Android camera failed:\n\n• Camera might be used by another app\n• Try closing other camera apps\n• Restart Chrome browser\n• Use "Upload Photo" instead';
        } else if (isMobile) {
          errorMessage = '📱 Camera not working. This might be because:\n\n• You\'re using private/incognito mode\n• Camera permissions are blocked\n• Try using "Upload Photo" instead';
        } else {
          errorMessage = '🎥 Camera access failed. Please check your camera permissions and try again.';
        }
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
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden mx-auto">
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
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4">
                <div className="text-center max-w-sm">
                  <div className="text-red-700 mb-4 text-sm leading-relaxed whitespace-pre-line">{cameraError}</div>
                  <div className="flex flex-col gap-2 mt-4">
                    <Button onClick={startCamera} variant="outline" size="sm">
                      🔄 Try Again
                    </Button>
                    <Button 
                      onClick={() => {
                        // Try to help user with browser settings
                        const userAgent = navigator.userAgent;
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
                        
                        if (!isMobile) {
                          // For desktop, try to open camera settings
                          let settingsUrl = '';
                          
                          if (/Chrome/.test(userAgent)) {
                            settingsUrl = 'chrome://settings/content/camera';
                          } else if (/Firefox/.test(userAgent)) {
                            settingsUrl = 'about:preferences#privacy';
                          }
                          
                          if (settingsUrl) {
                            try {
                              window.open(settingsUrl, '_blank');
                            } catch (e) {
                              console.log('Could not open settings:', e);
                              // Fallback: show alert with manual instructions
                              alert('Please manually go to your browser settings and allow camera access for this site, then refresh the page.');
                            }
                          } else {
                            alert('Please check your browser camera settings and allow access for this site, then refresh the page.');
                          }
                        } else {
                          // For mobile, show alert with instructions
                          alert('Please allow camera access in your browser settings, then refresh the page and try again.');
                        }
                      }}
                      variant="secondary" 
                      size="sm"
                    >
                      ⚙️ Help Fix This
                    </Button>
                    <Button onClick={onClose} variant="default" size="sm">
                      📤 Use Photo Upload Instead
                    </Button>
                  </div>
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

            
            {/* Camera not ready overlay - requires user gesture */}
            {!videoReady && !isLoading && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center p-6">
                  <div className="text-6xl mb-4">📷</div>
                  <div className="text-lg mb-4">Ready to take your selfie?</div>
                  <button 
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors mb-3"
                  >
                    🚀 Start Camera
                  </button>
                  <div className="text-sm opacity-75">This will request camera permission</div>
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