import React, { useEffect, useRef } from 'react';
import QRCodeGenerator from 'qrcode-generator';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCode: React.FC<QRCodeProps> = ({ value, size = 200, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    try {
      // Create QR code
      const qr = QRCodeGenerator(0, 'M');
      qr.addData(value);
      qr.make();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = size;
      canvas.height = size;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Get QR code modules
      const moduleCount = qr.getModuleCount();
      const cellSize = size / moduleCount;

      // Draw QR code
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
    />
  );
};

export default QRCode;