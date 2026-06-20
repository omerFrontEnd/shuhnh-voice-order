import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useVoiceOrder } from './useVoiceOrder'
import type { CardData, FieldLabels, VoiceOrderProps } from './types'
import './styles.css'

// ── Default labels ────────────────────────────────────────────────
const DEFAULT_LABELS: FieldLabels = {
  sender_name: 'اسم المرسل',
  sender_phone: 'جوال المرسل',
  sender_location: 'موقع الاستلام',
  receiver_name: 'اسم المستلم',
  receiver_phone: 'جوال المستلم',
  receiver_location: 'موقع التسليم',
  goods_type: 'نوع البضاعة',
  goods_description: 'وصف البضاعة',
  goods_unit: 'وحدة البضاعة',
  goods_weight: 'وزن البضاعة',
  goods_value: 'قيمة البضاعة (ريال)',
  shipping_type: 'نوع الشحن',
  notes: 'ملاحظات',
}

// ── Google Maps loader ────────────────────────────────────────────
let mapsLoadState: 'idle' | 'loading' | 'ready' = 'idle'
const mapsReadyCallbacks: Array<() => void> = []

declare global {
  interface Window {
    __svoMapsReady?: () => void
    google?: typeof google
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise<void>(resolve => {
    if (mapsLoadState === 'ready') { resolve(); return }
    mapsReadyCallbacks.push(resolve)
    if (mapsLoadState === 'loading') return
    mapsLoadState = 'loading'

    window.__svoMapsReady = () => {
      mapsLoadState = 'ready'
      mapsReadyCallbacks.forEach(fn => fn())
      mapsReadyCallbacks.length = 0
    }

    const script = document.createElement('script')
    script.setAttribute('data-svo', '1')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__svoMapsReady&language=ar`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}

// ── SVG icons ─────────────────────────────────────────────────────
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
  </svg>
)

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
)

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.91 15.08 9.44 16.55c-.29.29-.77.29-1.06 0l-.35-.35c-.87-.87-1.63-1.83-2.28-2.86-.13-.22-.1-.5.1-.68l1.49-1.49c.38-.38.38-1 0-1.38L5.17 8.22c-.38-.38-1-.38-1.38 0l-.77.77C2.3 9.71 1.88 11.1 2.05 12.5c.55 4.45 4.46 8.09 8.94 8.43 1.36.1 2.71-.3 3.7-1.1l.74-.74c.38-.38.38-1 0-1.38l-3.14-3.14c-.36-.37-.98-.37-1.38.01zm10.06-10.1c-.38-.38-1-.38-1.38 0l-.77.77c-1.02-.2-2.07-.15-3.07.12L13.5 4.12c-.38-.38-1-.38-1.38 0L8.97 7.27c-.38.38-.38 1 0 1.38L10.42 10c-.23 1.02-.22 2.09.04 3.11l-1.31 1.31c-.38.38-.38 1 0 1.38l1.06 1.06c.38.38 1 .38 1.38 0l.77-.77c1.02.2 2.07.15 3.07-.12l1.25 1.76c.38.38 1 .38 1.38 0l3.15-3.15c.38-.38.38-1 0-1.38L19.55 11.9c.23-1.02.22-2.09-.04-3.11l1.5-1.5c.38-.37.38-1-.04-1.31z" />
  </svg>
)

// ── Map card sub-component ────────────────────────────────────────
interface MapCardProps {
  card: CardData
  googleMapsKey?: string
  onConfirm: (callId: string, field: string, address: string) => void
}

function MapCard({ card, googleMapsKey, onConfirm }: MapCardProps) {
  const mapElRef = useRef<HTMLDivElement>(null)
  const [chosenAddress, setChosenAddress] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!googleMapsKey || !mapElRef.current) return
    loadGoogleMaps(googleMapsKey).then(() => {
      if (!mapElRef.current) return
      const defaultCoords = { lat: 24.7136, lng: 46.6753 }
      const map = new window.google!.maps.Map(mapElRef.current, {
        center: defaultCoords,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      })
      mapRef.current = map

      const marker = new window.google!.maps.Marker({
        map,
        position: defaultCoords,
        draggable: true,
      })
      markerRef.current = marker

      const geocoder = new window.google!.maps.Geocoder()

      const updateFromLatLng = (latlng: google.maps.LatLng) => {
        geocoder.geocode({ location: latlng }, (results, status) => {
          const addr =
            status === 'OK' && results && results[0]
              ? results[0].formatted_address
              : `${latlng.lat().toFixed(5)}, ${latlng.lng().toFixed(5)}`
          setChosenAddress(addr)
        })
      }

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        marker.setPosition(e.latLng)
        updateFromLatLng(e.latLng)
      })
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) updateFromLatLng(e.latLng)
      })

      // Geocode the hint address
      if (card.address) {
        geocoder.geocode(
          { address: card.address + '، السعودية' },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location
              map.setCenter(loc)
              map.setZoom(15)
              marker.setPosition(loc)
              updateFromLatLng(loc)
            }
          },
        )
      }
    })
  }, [googleMapsKey, card.address])

  const handleConfirm = () => {
    if (!chosenAddress || confirmed) return
    setConfirmed(true)
    onConfirm(card.callId, card.field!, chosenAddress)
  }

  const fieldLabel = card.field === 'sender_location' ? 'موقع الاستلام' : 'موقع التسليم'

  return (
    <div className="svo-card svo-map-card">
      <div className="svo-card-label">
        {fieldLabel}: {card.address}
      </div>
      {!googleMapsKey && (
        <p className="svo-map-notice">
          Google Maps غير مفعّل. أضف googleMapsKey لتفعيل الخريطة.
        </p>
      )}
      {googleMapsKey && (
        <div ref={mapElRef} className="svo-map-container" />
      )}
      {chosenAddress && (
        <div className="svo-map-chosen-address">{chosenAddress}</div>
      )}
      <div className="svo-card-actions">
        <button
          className="svo-btn-primary"
          onClick={handleConfirm}
          disabled={!chosenAddress || confirmed}
        >
          {confirmed ? 'تم ✓' : 'تأكيد الموقع'}
        </button>
      </div>
    </div>
  )
}

// ── Unit options card ─────────────────────────────────────────────
interface UnitCardProps {
  card: CardData
  onSelect: (callId: string, unit: string) => void
}

function UnitCard({ card, onSelect }: UnitCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="svo-card">
      <div className="svo-card-label">اختر وحدة البضاعة</div>
      <div className="svo-choices">
        {(card.units || []).map(u => (
          <button
            key={u}
            className={`svo-choice-btn${selected === u ? ' svo-selected' : ''}`}
            disabled={!!selected}
            onClick={() => {
              setSelected(u)
              onSelect(card.callId, u)
            }}
          >
            <strong>{u}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Weight options card ───────────────────────────────────────────
interface WeightCardProps {
  card: CardData
  onSelect: (callId: string, weight: string) => void
}

function WeightCard({ card, onSelect }: WeightCardProps) {
  const OPTIONS = [
    { label: 'صغير',  desc: 'أقل من 5 كجم',   val: 'أقل من 5 كجم' },
    { label: 'متوسط', desc: '5 - 20 كجم',      val: '5-20 كجم' },
    { label: 'كبير',  desc: 'أكثر من 20 كجم',  val: 'أكثر من 20 كجم' },
  ]
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="svo-card">
      <div className="svo-card-label">تقدير الوزن</div>
      <div className="svo-choices">
        {OPTIONS.map(o => (
          <button
            key={o.val}
            className={`svo-choice-btn${selected === o.val ? ' svo-selected' : ''}`}
            disabled={!!selected}
            onClick={() => {
              setSelected(o.val)
              onSelect(card.callId, o.val)
            }}
          >
            <strong>{o.label}</strong>
            <span>{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Shipping options card ─────────────────────────────────────────
interface ShippingCardProps {
  card: CardData
  onSelect: (callId: string, shippingType: string) => void
  onSchedule: (baseCallId: string) => void
}

function ShippingCard({ card, onSelect, onSchedule }: ShippingCardProps) {
  const OPTIONS = [
    { label: 'سريع',  desc: 'توصيل في نفس اليوم أو اليوم التالي', val: 'سريع' },
    { label: 'مجدول', desc: 'حدد موعداً محدداً للاستلام',          val: 'مجدول' },
  ]
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="svo-card">
      <div className="svo-card-label">نوع الشحن</div>
      <div className="svo-choices">
        {OPTIONS.map(o => (
          <button
            key={o.val}
            className={`svo-choice-btn${selected === o.val ? ' svo-selected' : ''}`}
            disabled={!!selected}
            onClick={() => {
              setSelected(o.val)
              onSelect(card.callId, o.val)
              if (o.val === 'مجدول') {
                onSchedule(card.callId + '_sched')
              }
            }}
          >
            <strong>{o.label}</strong>
            <span>{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Schedule picker card ──────────────────────────────────────────
interface ScheduleCardProps {
  card: CardData
  onConfirm: (callId: string, scheduledTime: string) => void
}

function ScheduleCard({ card, onConfirm }: ScheduleCardProps) {
  const today = new Date().toISOString().split('T')[0]
  const nextHour = new Date(Date.now() + 3600_000)
  const defaultTime = `${String(nextHour.getHours()).padStart(2, '0')}:00`

  const [date, setDate] = useState(today)
  const [time, setTime] = useState(defaultTime)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (!date || !time || confirmed) return
    setConfirmed(true)
    onConfirm(card.callId, `${date} - ${time}`)
  }

  return (
    <div className="svo-card">
      <div className="svo-card-label">موعد الاستلام</div>
      <div className="svo-schedule-grid">
        <div className="svo-schedule-field">
          <label>التاريخ</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={confirmed}
          />
        </div>
        <div className="svo-schedule-field">
          <label>الوقت</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            disabled={confirmed}
          />
        </div>
      </div>
      <div className="svo-card-actions">
        <button
          className="svo-btn-primary"
          onClick={handleConfirm}
          disabled={!date || !time || confirmed}
        >
          {confirmed ? 'تم ✓' : 'تأكيد الموعد'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export function VoiceOrderButton({
  wsUrl,
  googleMapsKey,
  assistantName = 'المساعد',
  primaryColor,
  onOrderComplete,
  onOrderSaved,
}: VoiceOrderProps) {
  const {
    isCallActive,
    callStatus,
    messages,
    cards,
    startCall,
    endCall,
    sendFunctionResponse,
    removeCard,
  } = useVoiceOrder(wsUrl, onOrderComplete, onOrderSaved)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [extraCards, setExtraCards] = useState<CardData[]>([])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Apply primary color override via inline CSS variable
  const overlayStyle = primaryColor
    ? ({ '--svo-primary': primaryColor } as React.CSSProperties)
    : undefined

  // Determine wave/mic visibility from last message role
  const lastMsg = messages[messages.length - 1]
  const showWave = isCallActive && lastMsg?.role === 'ai'
  const showMic = isCallActive && lastMsg?.role === 'user'

  // ── Card handlers ───────────────────────────────────────────

  const handleMapConfirm = useCallback(
    (callId: string, field: string, address: string) => {
      sendFunctionResponse(callId, 'show_map', { field, address })
      setExtraCards(prev => prev.filter(c => c.callId !== callId || c.type !== 'map'))
    },
    [sendFunctionResponse],
  )

  const handleUnitSelect = useCallback(
    (callId: string, unit: string) => {
      sendFunctionResponse(callId, 'show_unit_options', { selected_unit: unit })
    },
    [sendFunctionResponse],
  )

  const handleWeightSelect = useCallback(
    (callId: string, weight: string) => {
      sendFunctionResponse(callId, 'show_weight_options', { selected_weight: weight })
    },
    [sendFunctionResponse],
  )

  const handleShippingSelect = useCallback(
    (callId: string, shippingType: string) => {
      sendFunctionResponse(callId, 'show_shipping_options', {
        selected_shipping: shippingType,
      })
    },
    [sendFunctionResponse],
  )

  const handleSchedule = useCallback(
    (baseCallId: string) => {
      // Inject a schedule card
      const newCard: CardData = {
        id: `schedule_inline_${Date.now()}`,
        type: 'schedule_picker',
        callId: baseCallId,
      }
      setExtraCards(prev => [...prev, newCard])
    },
    [],
  )

  const handleScheduleConfirm = useCallback(
    (callId: string, scheduledTime: string) => {
      sendFunctionResponse(callId, 'show_schedule_picker', { scheduled_time: scheduledTime })
      setExtraCards(prev => prev.filter(c => c.callId !== callId))
    },
    [sendFunctionResponse],
  )

  // Combine hook cards + inline extra cards
  const allCards: CardData[] = [...cards, ...extraCards]

  const renderCard = (card: CardData) => {
    switch (card.type) {
      case 'map':
        return (
          <MapCard
            key={card.id}
            card={card}
            googleMapsKey={googleMapsKey}
            onConfirm={handleMapConfirm}
          />
        )
      case 'unit_options':
        return (
          <UnitCard
            key={card.id}
            card={card}
            onSelect={handleUnitSelect}
          />
        )
      case 'weight_options':
        return (
          <WeightCard
            key={card.id}
            card={card}
            onSelect={handleWeightSelect}
          />
        )
      case 'shipping_options':
        return (
          <ShippingCard
            key={card.id}
            card={card}
            onSelect={handleShippingSelect}
            onSchedule={handleSchedule}
          />
        )
      case 'schedule_picker':
        return (
          <ScheduleCard
            key={card.id}
            card={card}
            onConfirm={handleScheduleConfirm}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        className={`svo-call-btn${isCallActive ? ' svo-in-call' : ''}`}
        onClick={isCallActive ? endCall : startCall}
        aria-label={isCallActive ? 'إنهاء المكالمة' : 'بدء مكالمة صوتية'}
      >
        <PhoneIcon />
        <span>{isCallActive ? 'إنهاء' : 'مكالمة'}</span>
      </button>

      {/* Call overlay */}
      <div
        className={`svo-overlay${isCallActive ? '' : ' svo-hidden'}`}
        style={overlayStyle}
        role="dialog"
        aria-modal="true"
        aria-label="مكالمة صوتية"
      >
        <div className="svo-call-screen">
          {/* Avatar */}
          <div className="svo-call-avatar-wrap">
            <div
              className={`svo-call-rings${callStatus === 'جارٍ الاتصال...' || callStatus === 'جارٍ التحضير...' ? '' : ' svo-hidden'}`}
            >
              <div className="svo-ring" />
              <div className="svo-ring" />
              <div className="svo-ring" />
            </div>
            <div className="svo-call-avatar">
              <PersonIcon />
            </div>
          </div>

          {/* Name */}
          <div className="svo-call-name">{assistantName}</div>

          {/* Status */}
          <div className="svo-call-status">{callStatus}</div>

          {/* Sound wave — AI speaking */}
          <div className={`svo-call-wave${showWave ? '' : ' svo-hidden'}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="svo-wave-bar" />
            ))}
          </div>

          {/* Mic indicator — user speaking */}
          <div className={`svo-call-mic-indicator${showMic ? '' : ' svo-hidden'}`}>
            <div className="svo-mic-pulse" />
            <span>جارٍ الاستماع...</span>
          </div>

          {/* Messages */}
          <div className="svo-call-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`svo-call-msg ${msg.role}`} data-role={msg.role}>
                <div className="svo-call-msg-label">
                  {msg.role === 'ai' ? assistantName : 'أنت'}
                </div>
                <div className="svo-call-msg-bubble">{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive cards */}
          <div className="svo-call-cards">
            {allCards.map(renderCard)}
          </div>

          {/* End call button */}
          <button className="svo-btn-end-call" onClick={endCall}>
            <PhoneOffIcon />
            <span>إنهاء المكالمة</span>
          </button>
        </div>
      </div>
    </>
  )
}
