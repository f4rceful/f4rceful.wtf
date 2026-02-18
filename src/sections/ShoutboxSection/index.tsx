import { useState, useEffect, useCallback, useRef } from 'react'
import { useInterval } from '../../hooks/use-interval'
import { CoolButton } from '../../components/CoolButton'
import { AppleEmoji } from '../../components/AppleEmoji'
import { toast } from '../../components/Toast'
import { getSessionId } from '../../utils/session'
import './style.css'

interface Message {
  id: number
  text: string
  answer: string | null
  pinned: number
  admin_liked: number
  created_at: string
  reactions: Record<string, number>
  myReactions: string[]
}

interface ShoutboxResponse {
  messages: Message[]
  total: number
  page: number
  totalPages: number
}

export function ShoutboxSection() {
  const [messages, setMessages] = useState<Message[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<number | null>(null)
  const [emojis, setEmojis] = useState<string[]>([])

  const sid = getSessionId()

  useEffect(() => {
    fetch('/api/settings/emojis')
      .then(r => r.json())
      .then(data => setEmojis(data.emojis))
      .catch(() => {})
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/shoutbox?page=${page}&sid=${sid}`)
      const data: ShoutboxResponse = await res.json()
      setMessages(data.messages)
      setTotalPages(data.totalPages)
    } catch { toast('failed to load messages') }
  }, [page, sid])

  useEffect(() => { fetchMessages() }, [fetchMessages])
  useInterval(fetchMessages, 15000)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/shoutbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (res.ok) {
        setText('')
        toast('message sent!')
        fetchMessages()
      }
    } finally {
      setSending(false)
    }
  }

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pickerOpen === null) return
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const handleReact = async (msgId: number, emoji: string) => {
    setPickerOpen(null)
    await fetch(`/api/shoutbox/${msgId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, sessionId: sid }),
    })
    fetchMessages()
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <section className="shoutbox-section">
      <div className="shoutbox-header">
        <h2>shoutbox</h2>
        <button className="shoutbox-refresh" type="button" onClick={fetchMessages} title="refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>
      <p className="text-half-visible">leave a message, say hi, or roast me</p>

      <form className="shoutbox-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="your message..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          rows={3}
          className="shoutbox-input shoutbox-textarea"
          required
        />
        <div className="shoutbox-form-footer">
          <span className="text-dim text-small">{text.length}/500</span>
          <CoolButton type="submit" disabled={sending || !text.trim()}>
            {sending ? 'sending...' : 'send'}
          </CoolButton>
        </div>
      </form>

      <div className="shoutbox-messages">
        {messages.map((msg, i) => (
          <div key={msg.id} className={`shoutbox-card ${msg.pinned ? 'shoutbox-card--pinned' : ''}`}
            style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="shoutbox-card-header">
              <span className="shoutbox-author">anon</span>
              <div className="shoutbox-card-meta">
                <span className="text-dim text-small">{formatDate(msg.created_at)}</span>
                {!!msg.pinned && (
                  <span className="shoutbox-pin-icon" title="pinned">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 2l-4 4-5-2-3 3 4 4-4 6 2 2 6-4 4 4 3-3-2-5 4-4z" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
            <p className="shoutbox-text">{msg.text}</p>
            {msg.answer && (
              <div className="shoutbox-answer">
                <span className="shoutbox-answer-label">f4rceful:</span> {msg.answer}
              </div>
            )}
            <div className="shoutbox-reactions">
              {!!msg.admin_liked && (
                <span className="shoutbox-admin-heart" title="liked by f4rceful"><AppleEmoji emoji="❤️" size={14} /> f4rceful</span>
              )}
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className={`shoutbox-reaction ${msg.myReactions.includes(emoji) ? 'shoutbox-reaction--active' : ''}`}
                  onClick={() => handleReact(msg.id, emoji)}
                >
                  <AppleEmoji emoji={emoji} size={16} />
                  <span className="shoutbox-reaction-count">{count}</span>
                </button>
              ))}
              <button
                className="shoutbox-reaction shoutbox-reaction--add"
                onClick={() => setPickerOpen(pickerOpen === msg.id ? null : msg.id)}
              >
                +
              </button>
              {pickerOpen === msg.id && (
                <div className="shoutbox-picker-wrapper" ref={pickerRef}>
                  <div className="shoutbox-picker">
                    <div className="shoutbox-picker-header">
                      <span className="shoutbox-picker-title">reactions</span>
                      <button className="shoutbox-picker-close" onClick={() => setPickerOpen(null)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="shoutbox-picker-grid">
                      {emojis.map((emoji, i) => (
                        <button
                          key={emoji}
                          className="shoutbox-picker-emoji"
                          onClick={() => handleReact(msg.id, emoji)}
                          style={{ animationDelay: `${i * 0.04}s` }}
                        >
                          <AppleEmoji emoji={emoji} size={28} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-half-visible">no messages yet. be the first!</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="shoutbox-pagination">
          <CoolButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>prev</CoolButton>
          <span className="text-dim">{page} / {totalPages}</span>
          <CoolButton disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>next</CoolButton>
        </div>
      )}
    </section>
  )
}
