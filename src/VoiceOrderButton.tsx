import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { VoiceOrderProps } from './types'
import './styles.css'

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SMART_URL = 'https://ops.shuhnh.com/voice/app/index.html'

export function VoiceOrderButton({
  buttonLabel = 'مساعد ذكي',
  primaryColor,
  assistantName = 'مساعد ذكي',
}: VoiceOrderProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const btnStyle = primaryColor
    ? ({ '--svo-primary': primaryColor } as React.CSSProperties)
    : undefined

  const modal = (
    <div className="svo-modal-backdrop" onClick={() => setOpen(false)}>
      <div
        className="svo-modal"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={assistantName}
      >
        <div className="svo-modal-header" style={btnStyle}>
          <span className="svo-modal-title">{assistantName}</span>
          <button
            className="svo-modal-close"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          >
            <CloseIcon />
          </button>
        </div>
        <iframe
          src={SMART_URL}
          className="svo-modal-iframe"
          title={assistantName}
          allow="microphone"
        />
      </div>
    </div>
  )

  return (
    <>
      <button
        className="svo-call-btn"
        style={btnStyle}
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
      >
        <PhoneIcon />
        <span>{buttonLabel}</span>
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
