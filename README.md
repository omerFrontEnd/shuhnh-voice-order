# shuhnh-voice-order

React component + FastAPI backend for voice-based shipping order creation using the Gemini Live API.

The user speaks naturally in Arabic and the AI assistant (in Saudi dialect) gathers all shipping details through a natural conversation — collecting sender/receiver information, goods details, and delivery type — with interactive map cards, unit selection, and schedule pickers.

## Features

- Real-time voice conversation via Gemini Live API (WebSocket)
- PCM audio capture at 16 kHz and playback at 24 kHz
- Interactive cards: Google Maps location picker, unit selection, weight options, shipping type, schedule picker
- Supports multi-order calls (partial orders for split shipments)
- RTL Arabic UI with Saudi dialect
- Fully scoped CSS (`.svo-` prefix) — no style conflicts in your app
- TypeScript types included

## Installation

```bash
npm install shuhnh-voice-order
```

## Quick start

### 1. Start the backend

```bash
cd node_modules/shuhnh-voice-order/backend
python -m venv venv && venv/Scripts/activate   # Windows
pip install -r requirements.txt
echo GEMINI_API_KEY=your_key > .env
uvicorn main:app --reload
```

### 2. Use the component

```tsx
import { VoiceOrderButton } from 'shuhnh-voice-order'
import type { Order } from 'shuhnh-voice-order'

export default function Page() {
  const handleComplete = (orders: Order[]) => {
    console.log('Orders completed:', orders)
    // Send to your API
  }

  return (
    <VoiceOrderButton
      wsUrl="ws://localhost:8000"
      googleMapsKey="YOUR_GOOGLE_MAPS_KEY"
      assistantName="شحني"
      primaryColor="#1a7a4a"
      onOrderComplete={handleComplete}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `wsUrl` | `string` | required | WebSocket base URL, e.g. `"ws://localhost:8000"` |
| `googleMapsKey` | `string` | — | Google Maps JS API key. Enables the interactive map card. |
| `assistantName` | `string` | `"المساعد"` | Name displayed in the call overlay |
| `primaryColor` | `string` | `"#1a7a4a"` | Brand color (CSS custom property override) |
| `onOrderComplete` | `(orders: Order[]) => void` | — | Called with all completed orders when the call ends |
| `onOrderSaved` | `(order: Order) => void` | — | Called for each partial (first of two) order saved mid-call |
| `fieldLabels` | `Partial<FieldLabels>` | — | Override any of the default Arabic field labels |

## Order type

```typescript
interface Order {
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
```

## Using just the hook

If you want to build your own UI, use the hook directly:

```tsx
import { useVoiceOrder } from 'shuhnh-voice-order'

function MyUI() {
  const {
    isCallActive,
    callStatus,
    messages,
    cards,
    startCall,
    endCall,
    sendFunctionResponse,
    removeCard,
  } = useVoiceOrder('ws://localhost:8000', onOrderComplete, onOrderSaved)

  // Render your own UI using these values
}
```

## CSS customization

All CSS custom properties use the `--svo-` prefix. Override them in your stylesheet:

```css
:root {
  --svo-primary:       #0d5e38;
  --svo-primary-light: #d4f0e4;
  --svo-primary-dark:  #084025;
  --svo-danger:        #e53e3e;
}
```

Or pass `primaryColor` as a prop to change the primary color at runtime.

## Backend

See [backend/README.md](./backend/README.md) for full setup and production notes.

## Supported regions

The AI assistant only accepts shipments within GCC countries:
Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman.

## License

MIT
