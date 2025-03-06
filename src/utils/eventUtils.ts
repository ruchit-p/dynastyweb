// Event types for the application
export type EventType = 'story:liked' | 'story:unliked' | 'comment:added' | 'comment:liked';

// Event data structure
export interface EventData {
  storyId?: string;
  commentId?: string;
  liked?: boolean;
}

// Event callback function type
type EventCallback = (data: EventData) => void;

// Event manager for pub/sub pattern
class EventManager {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  // Subscribe to an event
  public subscribe(eventType: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const callbacks = this.listeners.get(eventType)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  // Publish an event
  public publish(eventType: EventType, data: EventData): void {
    const callbacks = this.listeners.get(eventType);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }
}

// Create a singleton instance
const eventManager = new EventManager();
export default eventManager; 