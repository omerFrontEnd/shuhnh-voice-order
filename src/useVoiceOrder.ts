import { useState, useRef, useCallback } from 'react'
import type { CallMessage, CardData, Order, UseVoiceOrderReturn } from './types'

export function useVoiceOrder(
  wsUrl: string,
  onOrderComplete?: (orders: Order[]) => void,
  onOrderSaved?: (order: Order) => void,
): UseVoiceOrderReturn {
  const [isCallActive, setIsCallActive] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [messages, setMessages] = useState<CallMessage[]>([])
  const [cards, setCards] = useState<CardData[]>([])
  const [savedOrders, setSavedOrders] = useState<Order[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string>('')
  const savedOrdersRef = useRef<Order[]>([])

  // Audio capture state
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null)

  // Audio playback state
  const playCtxRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────

  const appendMsg = useCallback((text: string, role: 'ai' | 'user') => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { text, role }]
      }
      return [...prev, { text, role }]
    })
  }, [])

  const addCard = useCallback((card: CardData) => {
    setCards(prev => [...prev, card])
  }, [])

  const removeCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── PCM helpers ────────────────────────────────────────────────

  function float32ToInt16(buffer: Float32Array): Int16Array {
    const out = new Int16Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return out
  }

  // ── Audio playback (24kHz PCM from Gemini) ────────────────────

  function drainAudioQueue() {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }
    isPlayingRef.current = true
    const buf = audioQueueRef.current.shift()!
    const src = playCtxRef.current!.createBufferSource()
    src.buffer = buf
    src.connect(playCtxRef.current!.destination)
    src.onended = drainAudioQueue
    src.start()
  }

  function playPcmChunk(arrayBuffer: ArrayBuffer) {
    if (!playCtxRef.current) {
      playCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    if (playCtxRef.current.state === 'suspended') {
      playCtxRef.current.resume()
    }
    try {
      const int16 = new Int16Array(arrayBuffer)
      const float32 = new Float32Array(int16.length)
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0
      }
      const audioBuffer = playCtxRef.current.createBuffer(1, float32.length, 24000)
      audioBuffer.copyToChannel(float32, 0)
      audioQueueRef.current.push(audioBuffer)
      if (!isPlayingRef.current) drainAudioQueue()
    } catch (err) {
      console.error('[useVoiceOrder] playPcmChunk error:', err)
    }
  }

  // ── Microphone capture → WebSocket ───────────────────────────

  async function startMic() {
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      audioCtxRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioCtxRef.current.createMediaStreamSource(micStreamRef.current)

      const bufferSize = 4096
      scriptProcRef.current = audioCtxRef.current.createScriptProcessor(bufferSize, 1, 1)

      scriptProcRef.current.onaudioprocess = (e: AudioProcessingEvent) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const float32 = e.inputBuffer.getChannelData(0)
        const int16 = float32ToInt16(float32)
        ws.send(int16.buffer)
      }

      source.connect(scriptProcRef.current)
      scriptProcRef.current.connect(audioCtxRef.current.destination)
    } catch (err) {
      setCallStatus('تعذّر الوصول للميكروفون')
      console.error('[useVoiceOrder] mic error:', err)
    }
  }

  function stopMic() {
    if (scriptProcRef.current) {
      scriptProcRef.current.disconnect()
      scriptProcRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
  }

  // ── WebSocket message handler ─────────────────────────────────

  function handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'connected':
        break

      case 'ready':
        setCallStatus('قل "مرحبا" للبدء')
        setTimeout(() => {
          setCallStatus('متصل — شحني معك')
        }, 3000)
        break

      case 'transcript':
        appendMsg(msg.text as string, 'ai')
        break

      case 'user_transcript':
        appendMsg(msg.text as string, 'user')
        break

      case 'show_map':
        addCard({
          id: `map_${Date.now()}`,
          type: 'map',
          callId: msg.call_id as string,
          field: msg.field as 'sender_location' | 'receiver_location',
          address: msg.address as string,
          hintText: msg.hint_text as string,
        })
        if (msg.hint_text) appendMsg(msg.hint_text as string, 'ai')
        break

      case 'show_unit_options':
        addCard({
          id: `unit_${Date.now()}`,
          type: 'unit_options',
          callId: msg.call_id as string,
          goodsType: msg.goods_type as string,
          units: msg.units as string[],
        })
        break

      case 'show_weight_options':
        addCard({
          id: `weight_${Date.now()}`,
          type: 'weight_options',
          callId: msg.call_id as string,
        })
        break

      case 'show_shipping_options':
        addCard({
          id: `shipping_${Date.now()}`,
          type: 'shipping_options',
          callId: msg.call_id as string,
        })
        break

      case 'show_schedule_picker':
        addCard({
          id: `schedule_${Date.now()}`,
          type: 'schedule_picker',
          callId: msg.call_id as string,
        })
        break

      case 'complete_order': {
        const order = msg.order as Order
        const callId = msg.call_id as string
        // ACK back to backend
        sendFunctionResponse(callId, 'complete_order', { result: 'done' })
        setTimeout(() => {
          const all = [...savedOrdersRef.current, order].filter(
            o => o && Object.keys(o).length > 0,
          )
          savedOrdersRef.current = []
          setSavedOrders([])
          endCall()
          if (onOrderComplete) onOrderComplete(all)
        }, 3000)
        break
      }

      case 'order_saved': {
        const order = msg.order as Order
        savedOrdersRef.current = [...savedOrdersRef.current, order]
        setSavedOrders(prev => [...prev, order])
        appendMsg('تم حفظ الطلب الأول ✓ الآن نكمّل الطلب الثاني...', 'ai')
        if (onOrderSaved) onOrderSaved(order)
        break
      }

      case 'error':
        setCallStatus('خطأ: ' + (msg.message as string))
        break
    }
  }

  // ── Public API ────────────────────────────────────────────────

  const sendFunctionResponse = useCallback(
    (callId: string, name: string, result: unknown) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'function_response',
            call_id: callId,
            name,
            result,
          }),
        )
      }
    },
    [],
  )

  const startCall = useCallback(() => {
    sessionIdRef.current = 'call_' + Date.now()

    setIsCallActive(true)
    setCallStatus('جارٍ الاتصال...')
    setMessages([])
    setCards([])
    setSavedOrders([])
    savedOrdersRef.current = []
    isPlayingRef.current = false
    audioQueueRef.current = []

    const ws = new WebSocket(`${wsUrl}/ws/call/${sessionIdRef.current}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setCallStatus('جارٍ التحضير...')
      startMic()
    }

    ws.onmessage = (evt: MessageEvent) => {
      if (evt.data instanceof ArrayBuffer) {
        playPcmChunk(evt.data)
      } else {
        try {
          const msg = JSON.parse(evt.data as string)
          handleMessage(msg)
        } catch (e) {
          console.error('[useVoiceOrder] parse error:', e)
        }
      }
    }

    ws.onerror = (e) => {
      console.error('[useVoiceOrder] ws error:', e)
      setCallStatus('خطأ في الاتصال')
    }

    ws.onclose = () => {
      setCallStatus('انتهت المكالمة')
      stopMic()
    }
  }, [wsUrl])

  const endCall = useCallback(() => {
    const ws = wsRef.current
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end_call' }))
        ws.close()
      }
      wsRef.current = null
    }
    stopMic()
    setIsCallActive(false)
    setCallStatus('')
    setCards([])
  }, [])

  return {
    isCallActive,
    callStatus,
    messages,
    cards,
    savedOrders,
    startCall,
    endCall,
    sendFunctionResponse,
    removeCard,
  }
}
