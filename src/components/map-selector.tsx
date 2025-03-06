"use client"

import { useEffect, useState, useRef } from "react"
import { MapPin } from "lucide-react"

interface MapSelectorProps {
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void
  searchQuery?: string
}

interface SearchResult {
  lat: string
  lon: string
  display_name: string
}

export default function MapSelector({ onLocationSelect, searchQuery }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)

  // Initialize map once component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Only import and use Leaflet on the client side
    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    // Fix for Leaflet's default icon
    const icon = L.icon({
      iconUrl: '/marker-icon.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
    L.Marker.prototype.options.icon = icon

    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize the map with default location (Chicago)
      mapInstanceRef.current = L.map(mapRef.current).setView([41.8781, -87.6298], 13)

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)

      // Add click event to map
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        
        // Reverse geocode the coordinates
        reverseGeocode(lat, lng)
      })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Search for location when searchQuery changes
  useEffect(() => {
    if (searchQuery) {
      searchLocation(searchQuery)
    }
  }, [searchQuery])

  // Search for a location by query
  const searchLocation = async (query: string) => {
    if (!query) return

    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      setResults(data)

      // If results found, update map view to first result
      if (data.length > 0) {
        const firstResult = data[0]
        const lat = parseFloat(firstResult.lat)
        const lng = parseFloat(firstResult.lon)
        const address = firstResult.display_name

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 13)

          // Update marker position
          updateMarker(lat, lng, address)
        }
      }
    } catch (error) {
      console.error('Error searching location:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reverse geocode coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()
      
      if (data && data.display_name) {
        updateMarker(lat, lng, data.display_name)
      }
    } catch (error) {
      console.error('Error during reverse geocoding:', error)
    }
  }

  // Update marker position and notify parent component
  const updateMarker = (lat: number, lng: number, address: string) => {
    const L = require('leaflet')
    
    // Remove existing marker if it exists
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }

    // Add new marker
    if (mapInstanceRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
      markerRef.current.bindPopup(address).openPopup()
    }
    
    // Update selected location
    const location = { lat, lng, address }
    setSelectedLocation(location)
    onLocationSelect(location)
  }

  return (
    <div className="space-y-4">
      <div 
        ref={mapRef} 
        className="h-[300px] w-full rounded-md border border-gray-300 relative"
      >
        {loading && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-70 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="bg-primary-50 p-2 rounded-md flex items-start">
          <MapPin className="h-4 w-4 text-primary-500 mt-1 mr-2 flex-shrink-0" />
          <p className="text-sm text-gray-700">{selectedLocation.address}</p>
        </div>
      )}
    </div>
  )
} 