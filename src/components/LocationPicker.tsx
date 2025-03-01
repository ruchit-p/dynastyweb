"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)

  // Cleanup function to properly remove map and marker instances
  const cleanupMap = useCallback(() => {
    if (markerRef.current) {
      try {
        markerRef.current.remove();
      } catch (error) {
        console.error("Error removing marker:", error);
      }
      markerRef.current = null;
    }
    
    if (mapInstanceRef.current) {
      try {
        // Remove all event listeners
        mapInstanceRef.current.off();
        // Remove the map instance
        mapInstanceRef.current.remove();
      } catch (error) {
        console.error("Error removing map:", error);
      }
      mapInstanceRef.current = null;
      setMap(null);
    }
  }, []);

  const updateMarker = useCallback((L: typeof import("leaflet"), location: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    } else {
      markerRef.current = L.marker([location.lat, location.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current);
    }
    mapInstanceRef.current.setView([location.lat, location.lng], 13);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
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
  }, [onLocationSelect]);

  // Get user's location or fall back to Chicago
  const getUserLocation = useCallback(() => {
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
  }, [map, updateMarker, reverseGeocode]);

  // Update selected location when defaultLocation changes
  useEffect(() => {
    if (!defaultLocation || !mapInstanceRef.current) return;
    
    setSelectedLocation(defaultLocation);
    mapInstanceRef.current.setView([defaultLocation.lat, defaultLocation.lng], 13);
    
    if (markerRef.current) {
      markerRef.current.setLatLng([defaultLocation.lat, defaultLocation.lng]);
    } else {
      import("leaflet").then((L) => {
        if (mapInstanceRef.current) {
          markerRef.current = L.marker([defaultLocation.lat, defaultLocation.lng], { icon: customIcon })
            .addTo(mapInstanceRef.current);
        }
      });
    }
  }, [defaultLocation]);

  // Check location permission status
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setHasLocationPermission(result.state === "granted");
        
        // If permission is already granted, get location immediately
        if (result.state === "granted" && !selectedLocation) {
          getUserLocation();
        }
        
        // Listen for permission changes
        result.addEventListener("change", () => {
          setHasLocationPermission(result.state === "granted");
        });
      });
    }
  }, [selectedLocation, getUserLocation]);

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
      cleanupMap()
    }
  }, [isOpen, onClose, cleanupMap]);

  // Initialize map when component is mounted and visible
  useEffect(() => {
    if (!mapRef.current || !isOpen) {
      cleanupMap();
      return;
    }

    // Prevent multiple initializations
    if (mapInstanceRef.current) {
      return;
    }

    // Add a small delay to ensure the container is fully rendered
    const timer = setTimeout(() => {
      // Import Leaflet dynamically to avoid SSR issues
      import("leaflet").then((L) => {
        if (!mapRef.current || !isOpen) return;

        // Ensure the container has dimensions and is visible in the DOM
        const container = mapRef.current;
        if (container.clientHeight === 0 || container.clientWidth === 0) {
          console.warn("Map container has zero dimensions");
          return;
        }

        // Make sure container is properly in the DOM
        if (!document.body.contains(container)) {
          console.warn("Map container is not in the DOM");
          return;
        }

        // Use defaultLocation if available, otherwise use selectedLocation or fall back to Chicago
        const initialLocation = defaultLocation || selectedLocation || CHICAGO_LOCATION;
        
        try {
          // Initialize map with no animation during setup
          const newMap = L.map(container, {
            fadeAnimation: false,
            zoomAnimation: false
          }).setView([initialLocation.lat, initialLocation.lng], 13);
          
          mapInstanceRef.current = newMap;
          setMap(newMap);
          
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(newMap);

          // Add marker for the initial location
          markerRef.current = L.marker([initialLocation.lat, initialLocation.lng], { icon: customIcon })
            .addTo(newMap);

          // Handle map clicks
          newMap.on("click", (e: { latlng: LatLng }) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            }
            reverseGeocode(lat, lng);
          });

          // Only get user location if we don't have a default or selected location
          if (hasLocationPermission && !defaultLocation && !selectedLocation) {
            getUserLocation();
          }
          
          // Add resize handler
          const handleResize = () => {
            if (newMap && document.body.contains(container)) {
              // Only call invalidateSize if the map container is still in the DOM
              newMap.invalidateSize({ animate: false });
            }
          };
          
          window.addEventListener('resize', handleResize);
          
          // Wait until the next frame to invalidate size
          requestAnimationFrame(() => {
            if (newMap && document.body.contains(container)) {
              newMap.invalidateSize({ animate: false });
            }
          });
          
          // Return cleanup for resize handler in this nested effect
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        } catch (error) {
          console.error("Error initializing Leaflet map:", error);
        }
      });
    }, 100); // Small delay to ensure container is ready

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (!isOpen) {
        cleanupMap();
      }
    };
  }, [isOpen, cleanupMap, defaultLocation, selectedLocation, hasLocationPermission, getUserLocation, reverseGeocode]);

  // Add a separate effect for handling location updates
  useEffect(() => {
    if (defaultLocation && !selectedLocation) {
      setSelectedLocation(defaultLocation);
    }

    if (!selectedLocation && hasLocationPermission) {
      getUserLocation();
    }

    if (selectedLocation) {
      reverseGeocode(selectedLocation.lat, selectedLocation.lng);
    }
  }, [defaultLocation, selectedLocation, hasLocationPermission, getUserLocation, reverseGeocode]);

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
            className="h-[300px] w-full rounded-lg border"
            style={{ 
              minHeight: "300px", 
              width: "100%", 
              position: "relative", 
              display: "block", 
              overflow: "hidden" 
            }}
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