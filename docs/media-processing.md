# Media Processing with Supabase Edge Functions

DynastyWeb includes built-in media processing capabilities powered by Supabase Edge Functions. This feature enables WhatsApp-style compression for images, videos, and audio files, optimizing storage usage while maintaining high quality.

## Features

- **Image Processing**: Uses Squoosh for efficient image compression, resizing, and format conversion
- **Video Processing**: Uses FFmpeg.wasm for video compression, resizing, and format conversion
- **Audio Processing**: Uses FFmpeg.wasm for audio compression and format conversion
- **WhatsApp-style compression**: Similar to WhatsApp's approach to media compression
- **Progress tracking**: UI feedback for file upload and processing
- **Error handling**: Graceful fallbacks for unsupported formats

## Supported File Types

### Images
- PNG
- JPEG/JPG
- WebP
- GIF
- AVIF

### Videos
- MP4
- WebM
- MOV
- AVI
- MKV

### Audio
- MP3
- WAV
- M4A
- AAC
- OGG
- FLAC

## Using the MediaUpload Component

The `MediaUpload` component provides a complete UI for uploading and processing media:

```tsx
import MediaUpload from '@/components/MediaUpload';

export default function Page() {
  return (
    <MediaUpload
      type="image" // 'image', 'video', 'audio', or 'all'
      onFileSelect={(url) => console.log('File uploaded:', url)}
      bucket="media" // Optional, defaults to 'media'
      processMedia={true} // Optional, defaults to true
      quality="medium" // 'high', 'medium', 'low', defaults to 'medium'
      maxWidth={1600} // Optional, max width for resizing
      maxHeight={1200} // Optional, max height for resizing
    />
  );
}
```

## Using the useMediaProcessor Hook

For more direct control, use the `useMediaProcessor` hook:

```tsx
import { useMediaProcessor } from '@/hooks/useMediaProcessor';

export default function Page() {
  const { processMedia, isProcessing, progress } = useMediaProcessor();
  
  const handleProcess = async () => {
    // Process an already uploaded file
    const result = await processMedia('https://example.com/image.jpg', {
      type: 'image',
      quality: 'medium',
      maxWidth: 1600,
      format: 'webp',
      stripMetadata: true
    });
    
    console.log('Processed URL:', result.processedUrl);
    console.log('Compression ratio:', result.compressionRatio);
  };
  
  return (
    <div>
      <button onClick={handleProcess} disabled={isProcessing}>
        Process Media
      </button>
      {isProcessing && <div>Processing: {progress}%</div>}
    </div>
  );
}
```

## Edge Function API

### Calling the API Directly

You can call the API directly for more control:

```typescript
const response = await fetch('/api/process-media', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com/image.jpg',
    options: {
      type: 'image',
      params: {
        format: 'webp',
        quality: 75,
        width: 1600,
        stripMetadata: true
      }
    }
  })
});

const { data, error } = await response.json();
```

### Image Processing Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| format | string | 'webp' | Output format ('webp', 'jpeg', 'png', 'avif') |
| quality | number | 75 | Quality (0-100) |
| width | number | 1600 | Maximum width |
| height | number | auto | Maximum height |
| fit | string | 'contain' | Resize mode ('contain', 'cover', 'fill') |
| progressiveLoad | boolean | true | Enable progressive loading |
| stripMetadata | boolean | true | Strip metadata from image |

### Video Processing Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| videoBitrate | string | '1500k' | Video bitrate |
| audioBitrate | string | '128k' | Audio bitrate |
| fps | number | 30 | Frames per second |
| scale | string | '1280:720' | Resolution (width:height) |
| format | string | 'mp4' | Output format ('mp4', 'webm') |
| stripMetadata | boolean | true | Strip metadata |

### Audio Processing Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| audioBitrate | string | '128k' | Audio bitrate |
| format | string | 'mp3' | Output format ('mp3', 'aac', 'ogg') |
| stripMetadata | boolean | true | Strip metadata |

## Performance Considerations

- **Memory Usage**: The Edge Function is configured with 3072 MB of memory
- **Timeout**: The function has a 90-second timeout
- **File Size Limits**: 
  - Images: Up to 10 MB
  - Videos: Up to 100 MB
  - Audio: Up to 50 MB

## Technical Details

- **Squoosh**: A highly efficient image compression library
- **FFmpeg.wasm**: WebAssembly port of FFmpeg for video/audio processing
- **Multi-threading**: Enabled for improved performance on compatible browsers
- **Caching**: FFmpeg instances are cached for better performance

## Error Handling

If media processing fails for any reason, the original file URL is returned as a fallback. Errors are logged and returned in the response for debugging. 