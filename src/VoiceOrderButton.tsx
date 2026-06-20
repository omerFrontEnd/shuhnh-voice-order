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
  primaryColor = '#1a7a4a',
  assistantName = 'مساعد ذكي',
}: VoiceOrderProps) {
  const [open, setOpen] = useState(false)
  const portalRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Create a dedicated top-level div, appended directly to <html>
    // to escape any overflow:hidden or transform on body/app containers
    const el = document.createElement('div')
    el.id = 'svo-portal-root'
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:2147483647',
    ].join(';')
    document.documentElement.appendChild(el)
    portalRef.current = el
    setMounted(true)
    return () => {
      document.documentElement.removeChild(el)
    }
  }, [])

  const color = primaryColor || '#1a7a4a'

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    pointerEvents: 'all',
    zIndex: 2147483647,
  }

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '860px',
    height: 'calc(100vh - 48px)',
    maxHeight: '860px',
    background: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 32px 100px rgba(0,0,0,0.35)',
    boxSizing: 'border-box',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: color,
    color: '#fff',
    direction: 'rtl',
    flexShrink: 0,
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  }

  const closeBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'rgba(255,255,255,0.18)',
    border: 'none',
    borderRadius: '50%',
    color: '#fff',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  }

  const iframeStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    border: 'none',
    display: 'block',
    minHeight: 0,
  }

  const modal = (
    <div style={backdropStyle} onClick={() => setOpen(false)}>
      <div
        style={modalStyle}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={headerStyle}>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>{assistantName}</span>
          <button style={closeBtnStyle} onClick={() => setOpen(false)} aria-label="إغلاق">
            <CloseIcon />
          </button>
        </div>
        <iframe
          src={SMART_URL}
          style={iframeStyle}
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
        style={{ '--svo-primary': color } as React.CSSProperties}
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
      >
        <PhoneIcon />
        <span>{buttonLabel}</span>
      </button>

      {mounted && open && portalRef.current && createPortal(modal, portalRef.current)}
    </>
  )
}
