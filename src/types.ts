export interface Order {
  sender_name: string | null
  sender_phone: string | null
  sender_location: string | null
  receiver_name: string | null
  receiver_phone: string | null
  receiver_location: string | null
  goods_type: string | null
  goods_description: string | null
  goods_unit: string | null
  goods_weight: string | null
  goods_value: number | null
  shipping_type: string | null
  notes: string | null
}

export interface FieldLabels {
  sender_name: string
  sender_phone: string
  sender_location: string
  receiver_name: string
  receiver_phone: string
  receiver_location: string
  goods_type: string
  goods_description: string
  goods_unit: string
  goods_weight: string
  goods_value: string
  shipping_type: string
  notes: string
}

export interface VoiceOrderProps {
  /** WebSocket base URL, e.g. "ws://localhost:8000" */
  wsUrl: string
  /** Google Maps JavaScript API key — enables interactive map cards */
  googleMapsKey?: string
  /** Display name shown in the call overlay. Default: "المساعد" */
  assistantName?: string
  /** Primary brand color. Default: "#1a7a4a" */
  primaryColor?: string
  /** Called with all completed orders when the final order is done */
  onOrderComplete?: (orders: Order[]) => void
  /** Called when a partial (first of two) order is saved */
  onOrderSaved?: (order: Order) => void
  /** Override any of the default Arabic field labels */
  fieldLabels?: Partial<FieldLabels>
  /** Label shown on the trigger button. Default: "مكالمة" */
  buttonLabel?: string
}

// ── Internal message types from the backend ────────────────────────

export interface CallMessage {
  text: string
  role: 'ai' | 'user'
}

export interface CardData {
  id: string
  type: 'map' | 'unit_options' | 'weight_options' | 'shipping_options' | 'schedule_picker'
  callId: string
  // map specific
  field?: 'sender_location' | 'receiver_location'
  address?: string
  hintText?: string
  // unit options specific
  goodsType?: string
  units?: string[]
}

export interface UseVoiceOrderReturn {
  isCallActive: boolean
  callStatus: string
  messages: CallMessage[]
  cards: CardData[]
  savedOrders: Order[]
  startCall: () => void
  endCall: () => void
  sendFunctionResponse: (callId: string, name: string, result: unknown) => void
  removeCard: (id: string) => void
}
