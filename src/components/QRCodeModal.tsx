import React from 'react';
import { X, Copy, Smartphone } from 'lucide-react';
import QRCode from './QRCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QRCodeModalProps {
  partyCode: string;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ partyCode, onClose }) => {
  const partyUrl = `${window.location.origin}/party/${partyCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(partyUrl);
      // Could add a toast notification here
      console.log('Party URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = partyUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Join This Party
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Scan with your phone camera or share the link
            </p>
            
            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCode value={partyUrl} size={200} />
              </div>
            </div>
            
            {/* Party Code */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">Party Code</p>
              <p className="text-2xl font-bold tracking-wider">{partyCode}</p>
            </div>
            
            {/* URL */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Or share this link</p>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <code className="text-xs flex-1 truncate">{partyUrl}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-8 w-8 flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Guests can scan this QR code or visit the link to join your party
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeModal;