
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => setIsCameraModalOpen(true)}
            className="h-12"
            variant="default"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Selfie
          </Button>
          
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload" 
          />
          <Button asChild variant="outline" className="h-12">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </label>
          </Button>
        </div>
      )}

      {photo && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-lg font-medium">Your Selected Photo</h3>
            <div className="relative">
              <img 
                src={photo} 
                alt="Preview" 
                className="w-48 h-48 object-cover rounded-lg border-2 border-border shadow-lg" 
              />
            </div>
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retake / Change Photo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoTaken={handleCameraPhotoTaken}
      />
    </div>
  );
};

export default PhotoUploader;
