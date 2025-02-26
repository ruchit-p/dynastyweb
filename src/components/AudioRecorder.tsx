"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Upload } from "lucide-react"
import { createLogger } from "@/lib/client/logger"

// Create component-specific logger
const logger = createLogger('AudioRecorder')

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState<number[]>([])
  const [playbackPosition, setPlaybackPosition] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [audioUrl])

  // Set up audio visualization
  const setupAudioVisualization = (stream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      
      const audioContext = audioContextRef.current
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      const updateWaveform = () => {
        if (!isRecording) return
        
        analyser.getByteTimeDomainData(dataArray)
        
        // Calculate audio level (simplified RMS)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128
          sum += value * value
        }
        const rms = Math.sqrt(sum / bufferLength)
        
        // Keep the last 50 levels for visualization
        setAudioLevel(prev => {
          const newLevels = [...prev, rms]
          return newLevels.slice(-50)
        })
        
        animationFrameRef.current = requestAnimationFrame(updateWaveform)
      }
      
      updateWaveform()
    } catch (error) {
      logger.error('Error setting up audio visualization', {
        error: error instanceof Error ? { message: error.message, name: error.name } : String(error)
      })
    }
  }
  
  // Set up playback visualization
  const setupPlaybackVisualization = () => {
    try {
      if (!audioRef.current || !audioUrl) return
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      
      const audioContext = audioContextRef.current
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const source = audioContext.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      
      const updatePlaybackWaveform = () => {
        if (!isPlaying) return
        
        analyser.getByteTimeDomainData(dataArray)
        
        // Calculate audio level (simplified RMS)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128
          sum += value * value
        }
        const rms = Math.sqrt(sum / bufferLength)
        
        // Keep the last 50 levels for visualization
        setAudioLevel(prev => {
          const newLevels = [...prev, rms]
          return newLevels.slice(-50)
        })
        
        // Update playback position for progress indicator
        if (audioRef.current) {
          const position = audioRef.current.currentTime / audioRef.current.duration
          setPlaybackPosition(position || 0)
        }
        
        animationFrameRef.current = requestAnimationFrame(updatePlaybackWaveform)
      }
      
      updatePlaybackWaveform()
    } catch (error) {
      logger.error('Error setting up playback visualization', {
        error: error instanceof Error ? { message: error.message, name: error.name } : String(error)
      })
    }
  }

  const startRecording = async () => {
    try {
      logger.info('Starting audio recording')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setAudioLevel([])

      // Set up audio visualization
      setupAudioVisualization(stream)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        onRecordingComplete(audioBlob)
        stream.getTracks().forEach(track => track.stop())
        logger.info('Audio recording completed', { durationSeconds: recordingTime, sizeBytes: audioBlob.size })
      }

      mediaRecorder.start()
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      logger.error('Error accessing microphone', { 
        error: error instanceof Error ? { message: error.message, name: error.name } : String(error)
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      logger.info('Stopping audio recording', { durationSeconds: recordingTime })
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      logger.debug('Pausing audio playback')
      audioRef.current.pause()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    } else {
      logger.debug('Starting audio playback')
      audioRef.current.play()
      setupPlaybackVisualization()
    }
    setIsPlaying(!isPlaying)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      onRecordingComplete(file)
      logger.info('Audio file uploaded', { filename: file.name, sizeBytes: file.size })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg w-full">
      {!isRecording && !audioUrl && (
        <div className="grid grid-cols-2 w-full gap-2">
          <Button onClick={startRecording} variant="outline" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Record Audio</span>
          </Button>
          <div>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              className="flex items-center gap-2 w-full"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Audio</span>
            </Button>
          </div>
        </div>
      )}
      
      {isRecording && (
        <div className="w-full space-y-4">
          <div className="relative h-16 bg-gray-100 rounded-md overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-full items-end space-x-1 px-2">
                {audioLevel.map((level, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[#0A5C36] rounded-t-sm animate-pulse"
                    style={{ 
                      height: `${Math.max(3, Math.min(100, level * 100))}%`,
                      opacity: i / audioLevel.length
                    }}
                  />
                ))}
                {/* Fill with empty bars if we don't have enough data points */}
                {Array.from({ length: Math.max(0, 50 - audioLevel.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-1 bg-gray-200 rounded-t-sm" style={{ height: '3%' }} />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Recording: {formatTime(recordingTime)}</span>
            <Button onClick={stopRecording} variant="destructive" size="sm">
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          </div>
        </div>
      )}
      
      {audioUrl && (
        <div className="w-full space-y-4">
          <div className="relative h-16 bg-gray-100 rounded-md overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-full items-end space-x-1 px-2">
                {audioLevel.length > 0 ? (
                  audioLevel.map((level, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#0A5C36] rounded-t-sm"
                      style={{ 
                        height: `${Math.max(3, Math.min(100, level * 100))}%`,
                        opacity: isPlaying ? (i / audioLevel.length) : 0.7
                      }}
                    />
                  ))
                ) : (
                  // Default visualization when no audio data is available
                  Array.from({ length: 50 }).map((_, i) => (
                    <div 
                      key={`default-${i}`} 
                      className="w-1 bg-[#0A5C36] rounded-t-sm"
                      style={{ 
                        height: `${5 + Math.sin(i/2) * 20}%`,
                        opacity: 0.7
                      }} 
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* Playback position indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[#0A5C36] z-10 transition-all duration-100"
              style={{ left: `${playbackPosition * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              className="hidden"
              onEnded={() => {
                setIsPlaying(false);
                logger.debug('Audio playback ended');
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
              }} 
            />
            
            <Button onClick={togglePlayback} variant="outline" size="sm" className="flex items-center gap-2">
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Play
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => {
                setAudioUrl(null);
                setAudioLevel([]);
                setRecordingTime(0);
                setPlaybackPosition(0);
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
              }} 
              variant="ghost" 
              size="sm"
            >
              Record new
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 