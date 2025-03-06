'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import Image from 'next/image';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

const ImageCropper = ({ 
  imageSrc, 
  onCropComplete, 
  onCancel, 
  aspectRatio = 1 // Default to square crop (1:1)
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  // When the image loads, set up an initial centered crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // This creates a centered crop with the specified aspect ratio
    const initialCrop = centerAspectCrop(width, height, aspectRatio);
    setCrop(initialCrop);
  }, [aspectRatio]);

  // Handle slider change for zoom
  const handleZoomChange = (value: number[]) => {
    setScale(value[0]);
  };

  // This function draws the cropped image to a canvas and returns a Blob
  const getCroppedImg = useCallback(async (): Promise<Blob> => {
    if (!imgRef.current || !completedCrop) {
      throw new Error('Crop is not complete');
    }

    return new Promise((resolve, reject) => {
      try {
        // Create a new image element to draw from
        const image = document.createElement('img') as HTMLImageElement;
        image.crossOrigin = "anonymous"; // Handle CORS if needed
        image.src = imageSrc;
        
        // When the image is loaded, draw it to the canvas
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('No 2d context'));
            return;
          }
          
          // Calculate dimensions
          const scaleX = image.naturalWidth / imgRef.current!.width;
          const scaleY = image.naturalHeight / imgRef.current!.height;
          
          // Set canvas size to the cropped area
          const pixelRatio = window.devicePixelRatio;
          canvas.width = completedCrop.width * scaleX * pixelRatio;
          canvas.height = completedCrop.height * scaleY * pixelRatio;
          
          // Scale the context to handle device pixel ratio
          ctx.scale(pixelRatio, pixelRatio);
          ctx.imageSmoothingQuality = 'high';
          
          // Calculate source and destination values
          const sourceX = completedCrop.x * scaleX;
          const sourceY = completedCrop.y * scaleY;
          const sourceWidth = completedCrop.width * scaleX;
          const sourceHeight = completedCrop.height * scaleY;
          
          // Fill the canvas with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the cropped image to the canvas
          ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width / pixelRatio,
            canvas.height / pixelRatio
          );
          
          // Convert to blob with high quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.error('Canvas is empty');
                reject(new Error('Canvas is empty'));
                return;
              }
              
              console.log('Blob created:', blob.size, 'bytes');
              resolve(blob);
            },
            'image/jpeg',
            0.95  // High quality
          );
        };
        
        image.onerror = (error: unknown) => {
          console.error('Error loading image for cropping:', error);
          reject(new Error('Failed to load image for cropping'));
        };
      } catch (error) {
        console.error('Error in getCroppedImg:', error);
        reject(error);
      }
    });
  }, [completedCrop, imageSrc]);

  // Handle the crop completion
  const handleComplete = async () => {
    try {
      if (!completedCrop) {
        console.error('No crop data available');
        return;
      }
      
      const croppedBlob = await getCroppedImg();
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Error creating cropped image:', error);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Crop Cover Photo</h3>
      
      <div className="mb-4 relative overflow-hidden" style={{ maxWidth: '100%', maxHeight: '70vh' }}>
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          className="max-w-full max-h-full"
        >
          <Image
            ref={imgRef}
            src={imageSrc}
            alt="Crop me"
            style={{ 
              transform: `scale(${scale})`,
              maxWidth: '100%',
              maxHeight: '70vh'
            }}
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>

      <div className="w-full max-w-md flex items-center gap-4 mb-4">
        <ZoomOut className="h-4 w-4 text-gray-500" />
        <Slider
          defaultValue={[1]}
          min={0.5}
          max={3}
          step={0.1}
          value={[scale]}
          onValueChange={handleZoomChange}
          className="flex-1"
        />
        <ZoomIn className="h-4 w-4 text-gray-500" />
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button
          onClick={handleComplete}
          className="flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> Apply
        </Button>
      </div>
    </div>
  );
};

export default ImageCropper; 