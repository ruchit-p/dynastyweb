"use client"

import { useEffect, useState, useRef } from "react"
import { Map as LeafletMap, Marker, LatLng, Icon } from "leaflet"
import "leaflet/dist/leaflet.css"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin } from "lucide-react"

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
  defaultLocation?: { lat: number; lng: number; address: string }
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  lat: string
  lon: string
  display_name: string
}

// Chicago coordinates
const CHICAGO_LOCATION = {
  lat: 41.8781,
  lng: -87.6298
}

// Fix for Leaflet's default icon
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function LocationPicker({ onLocationSelect, defaultLocation, isOpen, onClose }: LocationPickerProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation)
  const [isDraggingPin, setIsDraggingPin] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<Marker | null>(null)
  const dragPinRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get user's location or fall back to Chicago
  const getUserLocation = () => {
    setIsLoadingLocation(true)
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          
          // Update map with user's location
          if (map) {
            map.setView([userLocation.lat, userLocation.lng], 13)
            import("leaflet").then((L) => {
              updateMarker(L, userLocation)
              reverseGeocode(userLocation.lat, userLocation.lng)
            })
          }
          setIsLoadingLocation(false)
        },
        (error) => {
          console.log("Geolocation error or denied:", error)
          // Fall back to Chicago if there's an error or permission denied
          if (map) {
            map.setView([CHICAGO_LOCATION.lat, CHICAGO_LOCATION.lng], 13)
            import("leaflet").then((L) => {
              updateMarker(L, CHICAGO_LOCATION)
              reverseGeocode(CHICAGO_LOCATION.lat, CHICAGO_LOCATION.lng)
            })
          }
          setIsLoadingLocation(false)
        }
      )
    } else {
      // Fall back to Chicago if geolocation is not supported
      if (map) {
        map.setView([CHICAGO_LOCATION.lat, CHICAGO_LOCATION.lng], 13)
        import("leaflet").then((L) => {
          updateMarker(L, CHICAGO_LOCATION)
          reverseGeocode(CHICAGO_LOCATION.lat, CHICAGO_LOCATION.lng)
        })
      }
      setIsLoadingLocation(false)
    }
  }

  useEffect(() => {
    // Handle clicks outside the component
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!mapRef.current || !isOpen) return

    // Clean up existing map instance
    if (map) {
      map.remove()
      setMap(null)
    }

    // Import Leaflet dynamically to avoid SSR issues
    import("leaflet").then((L) => {
      // Start with Chicago as initial location
      const initialLocation = selectedLocation || CHICAGO_LOCATION
      const newMap = L.map(mapRef.current!).setView([initialLocation.lat, initialLocation.lng], 13)
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(newMap)

      // Add marker if location is selected
      if (selectedLocation) {
        markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { icon: customIcon }).addTo(newMap)
      }

      // Handle map clicks
      newMap.on("click", (e: { latlng: LatLng }) => {
        const { lat, lng } = e.latlng
        updateMarker(L, { lat, lng })
        reverseGeocode(lat, lng)
      })

      setMap(newMap)

      // Try to get user's location after map is initialized
      if (!selectedLocation) {
        getUserLocation()
      }
    })

    // Cleanup function
    return () => {
      if (map) {
        map.remove()
        setMap(null)
      }
    }
  }, [isOpen]) // Only re-initialize when isOpen changes

  const updateMarker = (L: typeof import("leaflet"), location: { lat: number; lng: number }) => {
    if (markerRef.current && map) {
      markerRef.current.remove()
      markerRef.current = L.marker([location.lat, location.lng], { icon: customIcon }).addTo(map)
      map.setView([location.lat, location.lng], 13)
    }
  }

  const searchAddress = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching address:", error)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()
      const address = data.display_name
      setSelectedLocation({ lat, lng, address })
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
  }

  const handleAddressSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    
    import("leaflet").then((L) => {
      updateMarker(L, { lat, lng })
    })
    
    setSelectedLocation({ lat, lng, address: result.display_name })
    onLocationSelect({ lat, lng, address: result.display_name })
    setSearchResults([])
    setSearchQuery("")
  }

  const handleDragStart = (e: React.DragEvent) => {
    setIsDraggingPin(true)
    e.dataTransfer.setData("text/plain", "pin")
    if (e.dataTransfer.setDragImage && dragPinRef.current) {
      e.dataTransfer.setDragImage(dragPinRef.current, 15, 30)
    }
  }

  const handleDragEnd = () => {
    setIsDraggingPin(false)
  }

  const handleMapDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const mapRect = mapRef.current?.getBoundingClientRect()
    if (!mapRect || !map) return

    const x = e.clientX - mapRect.left
    const y = e.clientY - mapRect.top
    const point = map.containerPointToLatLng([x, y])
    
    import("leaflet").then((L) => {
      updateMarker(L, { lat: point.lat, lng: point.lng })
      reverseGeocode(point.lat, point.lng)
    })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault() // Prevent form submission
      searchAddress()
    }
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="relative">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button type="button" variant="outline" onClick={searchAddress}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          {isLoadingLocation && (
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-lg">
                <div className="h-4 w-4 border-2 border-[#0A5C36] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Getting location...</span>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="h-[300px] rounded-lg border"
            onDragOver={handleMapDragOver}
            onDrop={handleMapDrop}
          />
          
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto z-20">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => handleAddressSelect(result)}
                >
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-12 flex flex-col items-center">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-move"
            title="Drag to map"
          >
            <svg
              ref={dragPinRef}
              width="30"
              height="40"
              viewBox="0 0 30 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isDraggingPin ? 'scale-150' : 'hover:scale-110'}`}
            >
              <path
                d="M15 0C6.71573 0 0 6.71573 0 15C0 23.2843 15 40 15 40C15 40 30 23.2843 30 15C30 6.71573 23.2843 0 15 0ZM15 20C12.2386 20 10 17.7614 10 15C10 12.2386 12.2386 10 15 10C17.7614 10 20 12.2386 20 15C20 17.7614 17.7614 20 15 20Z"
                fill="#0A5C36"
              />
            </svg>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">Drag pin to map</p>
        </div>
      </div>

      {selectedLocation && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm text-gray-600 line-clamp-3 hover:line-clamp-none transition-all">
            Selected: {selectedLocation.address}
          </p>
        </div>
      )}
    </div>
  )
} 