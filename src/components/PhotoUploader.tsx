
import React, { useState, useRef } from 'react';
import { Camera, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CameraModal from './CameraModal';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File | null) => void;
  autoStart?: boolean;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onPhotoSelected, autoStart = false }) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(autoStart);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-start camera if autoStart is true
  React.useEffect(() => {
    if (autoStart) {
      setIsCameraModalOpen(true);
    }
  }, [autoStart]);

  const handleCameraPhotoTaken = (file: File) => {
    onPhotoSelected(file);
    setPhoto(URL.createObjectURL(file));
    setCameraError(null);
    setIsCameraModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setCameraError('Please select a valid image file.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setCameraError('File too large. Please select an image under 5MB.');
        return;
      }
      
      onPhotoSelected(file);
      setPhoto(URL.createObjectURL(file));
      setCameraError(null);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    onPhotoSelected(null);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {cameraError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-700 text-sm">{cameraError}</div>
            <Button 
              onClick={() => setCameraError(null)} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {!photo && (
        <div className="space-y-3">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">Add Your Photo</h3>
            <p className="text-sm text-muted-foreground">Take a selfie or upload a photo to add your song</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => setIsCameraModalOpen(true)}
              className="h-14 text-base font-semibold"
              variant="default"
            >
              <Camera className="w-5 h-5 mr-3" />
              Take Selfie
            </Button>
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="user"
              onChange={handleFileChange} 
              className="hidden" 
              id="file-upload" 
            />
            <Button asChild variant="outline" className="h-14 text-base font-semibold">
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-5 h-5 mr-3" />
                Upload Photo
              </label>
            </Button>
          </div>
        </div>
      )}

      {photo && (
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Photo Ready!</h3>
          <div className="flex justify-center">
            <img 
              src={photo} 
              alt="Preview" 
              className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-full border-4 border-primary shadow-lg" 
            />
          </div>
          <Button
            onClick={retakePhoto}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
            Change Photo
          </Button>
        </div>
      )}

      {/* Camera Modal - only render when open to avoid conflicts */}
      {isCameraModalOpen && (
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onPhotoTaken={handleCameraPhotoTaken}
        />
      )}
    </div>
  );
};

export default PhotoUploader;
