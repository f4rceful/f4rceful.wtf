import { useState, useEffect, useCallback } from 'react'
import { useInterval } from '../../hooks/use-interval'
import { CoolButton } from '../../components/CoolButton'
import { AppleEmoji } from '../../components/AppleEmoji'
import './style.css'


interface GeoData {
  country?: string
  regionName?: string
  city?: string
  isp?: string
  org?: string
  as?: string
}

interface Message {
  id: number
  text: string
  author: string
  answer: string | null
  banned: number
  pinned: number
  admin_liked: number
  ip: string | null
  user_agent: string | null
  geo: string | null
  created_at: string
}

interface MessagesResponse {
  messages: Message[]
  total: number
  page: number
  totalPages: number
}

interface MsgStats {
  total: number
  banned: number
  replied: number
  today: number
  countries: { country: string; count: number }[]
}

interface Analytics {
  total: number
  unique: number
  today: number
  live: number
  avgDuration: number
  bounceRate: number
  dailyVisits: { day: string; count: number }[]
  hourlyVisits: { hour: string; count: number }[]
  topReferrers: { referrer: string; count: number }[]
  topPages: { path: string; count: number }[]
  devices: { mobile: number; desktop: number }
  countries: { country: string; count: number }[]
  topBrowsers: { browser: string; count: number }[]
}

type Filter = 'all' | 'banned' | 'active'
type Tab = 'messages' | 'analytics' | 'settings'


function parseGeo(geo: string | null): GeoData {
  if (!geo) return {}
  try { return JSON.parse(geo) } catch { return {} }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}


function InfoTooltip({ msg }: { msg: Message }) {
  const geo = parseGeo(msg.geo)
  return (
    <div className="admin-info-wrapper">
      <button className="admin-info-btn" type="button">i</button>
      <div className="admin-info-tooltip">
        <div><span className="admin-info-label">ip:</span> {msg.ip || 'n/a'}</div>
        <div><span className="admin-info-label">device:</span> {msg.user_agent || 'n/a'}</div>
        {geo.country && <div><span className="admin-info-label">location:</span> {[geo.city, geo.regionName, geo.country].filter(Boolean).join(', ')}</div>}
        {geo.isp && <div><span className="admin-info-label">isp:</span> {geo.isp}</div>}
        {geo.org && <div><span className="admin-info-label">org:</span> {geo.org}</div>}
        {geo.as && <div><span className="admin-info-label">as:</span> {geo.as}</div>}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card--accent' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, color, animate }: {
  data: Record<string, unknown>[]
  labelKey: string
  valueKey: string
  color?: string
  animate?: boolean
}) {
  const max = Math.max(...data.map(d => d[valueKey] as number), 1)
  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const val = d[valueKey] as number
        const pct = (val / max) * 100
        return (
          <div className="bar-chart-col" key={i}>
            <div className="bar-chart-bar-wrap">
              <div
                className={`bar-chart-bar ${animate ? 'bar-chart-bar--animate' : ''}`}
                style={{
                  height: `${pct}%`,
                  background: color || 'var(--accent)',
                  animationDelay: animate ? `${i * 0.06}s` : undefined,
                }}
              />
            </div>
            <span className="bar-chart-label">{String(d[labelKey])}</span>
            <span className="bar-chart-value">{val}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ segments, size = 120 }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <p className="text-half-visible">no data</p>

  const r = size / 2 - 8
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} className="donut-svg">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dash = pct * circumference
          const gap = circumference - dash
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              className="donut-segment"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          )
        })}
      </svg>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-dot" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <span className="text-dim">{seg.value} ({Math.round((seg.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HorizontalBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="country-row">
      <span className="country-name">{label}</span>
      <div className="country-bar-track">
        <div className="country-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="country-count">{value}</span>
    </div>
  )
}


function AnalyticsTab({ authHeaders }: { token: string; authHeaders: () => Record<string, string> }) {
  const [data, setData] = useState<Analytics | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics', { headers: authHeaders() })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [authHeaders])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useInterval(fetchAnalytics, 15000)

  if (!data) return <p className="text-half-visible">loading analytics...</p>

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const dailyData = last7.map(day => ({
    day: day.slice(5), // MM-DD
    count: data.dailyVisits.find(d => d.day === day)?.count || 0,
  }))

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, '0')
    return {
      hour: h,
      count: data.hourlyVisits.find(d => d.hour === h)?.count || 0,
    }
  })

  const browserColors = ['#7E40EF', '#64ffd8', '#ff6464', '#ffd764', '#64b5ff']

  return (
    <div className="analytics-tab">
      <div className="stats-grid stats-grid--6">
        <StatCard label="total visits" value={data.total} accent />
        <StatCard label="unique visitors" value={data.unique} />
        <StatCard label="today" value={data.today} />
        <StatCard label="live now" value={data.live} sub="last 5 min" />
        <StatCard label="avg. time" value={formatDuration(data.avgDuration)} />
        <StatCard label="bounce rate" value={`${data.bounceRate}%`} />
      </div>

      <div className="analytics-charts-row">
        <div className="analytics-chart-card">
          <h3>visits — last 7 days</h3>
          <BarChart data={dailyData} labelKey="day" valueKey="count" animate />
        </div>
        <div className="analytics-chart-card">
          <h3>hourly — last 24h</h3>
          <BarChart data={hourlyData} labelKey="hour" valueKey="count" color="var(--accent)" animate />
        </div>
      </div>

      <div className="analytics-charts-row">
        <div className="analytics-chart-card">
          <h3>devices</h3>
          <DonutChart segments={[
            { label: 'Desktop', value: data.devices.desktop, color: 'var(--accent)' },
            { label: 'Mobile', value: data.devices.mobile, color: '#64ffd8' },
          ]} />
        </div>
        <div className="analytics-chart-card">
          <h3>browsers</h3>
          <DonutChart segments={data.topBrowsers.map((b, i) => ({
            label: b.browser,
            value: b.count,
            color: browserColors[i % browserColors.length],
          }))} />
        </div>
      </div>

      <div className="analytics-charts-row">
        {data.countries.length > 0 && (
          <div className="analytics-chart-card">
            <h3>top countries</h3>
            {data.countries.map(c => (
              <HorizontalBar key={c.country} label={c.country} value={c.count} max={data.countries[0].count} />
            ))}
          </div>
        )}
        <div className="analytics-chart-card">
          <h3>top pages</h3>
          {data.topPages.length > 0
            ? data.topPages.map(p => (
                <HorizontalBar key={p.path} label={p.path} value={p.count} max={data.topPages[0].count} />
              ))
            : <p className="text-half-visible">no data</p>
          }
        </div>
      </div>

      {data.topReferrers.length > 0 && (
        <div className="analytics-chart-card">
          <h3>top referrers</h3>
          {data.topReferrers.map(r => (
            <HorizontalBar key={r.referrer} label={r.referrer} value={r.count} max={data.topReferrers[0].count} />
          ))}
        </div>
      )}
    </div>
  )
}


const EMOJI_PALETTE = [
  '👍', '👎', '❤️', '🔥', '😂', '😮', '😢', '😡',
  '🎉', '🤔', '👀', '💀', '🙏', '💯', '✨', '🚀',
  '👏', '🤡', '💩', '😈', '🤝', '⭐', '🫡', '🥶',
  '😎', '🤯', '💔', '🫠', '😤', '🥺', '😭', '🤣',
]

function SettingsTab({ authHeaders }: { authHeaders: () => Record<string, string> }) {
  const [emojis, setEmojis] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.reaction_emojis) setEmojis(data.reaction_emojis)
      })
      .catch(() => {})
  }, [authHeaders])

  const toggleEmoji = (emoji: string) => {
    setEmojis(prev =>
      prev.includes(emoji)
        ? prev.filter(e => e !== emoji)
        : [...prev, emoji]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ reaction_emojis: emojis }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-tab">
      <div className="settings-card">
        <h3>reaction emojis</h3>
        <p className="text-half-visible text-small">select which emojis are available for shoutbox reactions</p>

        <div className="settings-current">
          <span className="settings-label">current ({emojis.length}):</span>
          <div className="settings-emoji-list">
            {emojis.map(emoji => (
              <button key={emoji} className="settings-emoji-chip" onClick={() => toggleEmoji(emoji)} title="click to remove">
                <AppleEmoji emoji={emoji} size={20} />
              </button>
            ))}
            {emojis.length === 0 && <span className="text-half-visible">none selected</span>}
          </div>
        </div>

        <div className="settings-palette">
          <span className="settings-label">palette:</span>
          <div className="settings-emoji-grid">
            {EMOJI_PALETTE.map(emoji => (
              <button
                key={emoji}
                className={`settings-emoji-option ${emojis.includes(emoji) ? 'settings-emoji-option--active' : ''}`}
                onClick={() => toggleEmoji(emoji)}
              >
                <AppleEmoji emoji={emoji} size={24} />
              </button>
            ))}
          </div>
        </div>

        <div className="settings-actions">
          <CoolButton onClick={handleSave} disabled={saving}>
            {saving ? 'saving...' : 'save'}
          </CoolButton>
          {saved && <span className="settings-saved">saved!</span>}
        </div>
      </div>
    </div>
  )
}


export function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('analytics')
  const [messages, setMessages] = useState<Message[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [replyId, setReplyId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [msgStats, setMsgStats] = useState<MsgStats | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const isLoggedIn = !!token

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token])

  const fetchMsgStats = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders() })
      if (res.ok) setMsgStats(await res.json())
    } catch {}
  }, [token, authHeaders])

  const fetchMessages = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/admin/messages?page=${page}`, { headers: authHeaders() })
      if (res.status === 401) {
        setToken('')
        localStorage.removeItem('admin_token')
        return
      }
      const data: MessagesResponse = await res.json()
      setMessages(data.messages)
      setTotalPages(data.totalPages)
      setLastUpdate(new Date())
    } catch {}
  }, [token, page, authHeaders])

  useEffect(() => {
    if (tab === 'messages') { fetchMessages(); fetchMsgStats() }
  }, [fetchMessages, fetchMsgStats, tab])
  useInterval(() => {
    if (tab === 'messages') { fetchMessages(); fetchMsgStats() }
  }, 10000)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setError('wrong password'); return }
      const { token: t } = await res.json()
      setToken(t)
      localStorage.setItem('admin_token', t)
      setPassword('')
    } catch { setError('connection error') }
  }

  const handleBan = async (id: number, ban: boolean) => {
    await fetch(`/api/admin/messages/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ banned: ban }) })
    fetchMessages(); fetchMsgStats()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/messages/${id}`, { method: 'DELETE', headers: authHeaders() })
    fetchMessages(); fetchMsgStats()
  }

  const handleReply = async (id: number) => {
    if (!replyText.trim()) return
    await fetch(`/api/admin/messages/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ answer: replyText.trim() }) })
    setReplyId(null); setReplyText(''); fetchMessages(); fetchMsgStats()
  }

  const handlePin = async (id: number, pin: boolean) => {
    await fetch(`/api/admin/messages/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ pinned: pin }) })
    fetchMessages()
  }

  const handleLike = async (id: number, like: boolean) => {
    await fetch(`/api/admin/messages/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ admin_liked: like }) })
    fetchMessages()
  }

  const handleLogout = () => { setToken(''); localStorage.removeItem('admin_token') }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const filtered = messages.filter(msg => {
    if (filter === 'banned' && !msg.banned) return false
    if (filter === 'active' && msg.banned) return false
    if (search) {
      const q = search.toLowerCase()
      const geo = parseGeo(msg.geo)
      return msg.text.toLowerCase().includes(q)
        || (msg.ip || '').includes(q)
        || (geo.country || '').toLowerCase().includes(q)
        || (geo.city || '').toLowerCase().includes(q)
    }
    return true
  })

  if (!isLoggedIn) {
    return (
      <section className="admin-section">
        <div className="admin-login-card">
          <div className="admin-login-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1>admin panel</h1>
          <p className="text-half-visible">enter password to continue</p>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <input type="password" placeholder="password" value={password}
              onChange={e => setPassword(e.target.value)} className="admin-input" autoFocus />
            <CoolButton type="submit">login</CoolButton>
            {error && <p className="admin-error">{error}</p>}
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <div>
          <h1>dashboard</h1>
          <p className="text-dim text-small">last update: {formatTime(lastUpdate)}</p>
        </div>
        <CoolButton onClick={handleLogout}>logout</CoolButton>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'analytics' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('analytics')}>analytics</button>
        <button className={`admin-tab ${tab === 'messages' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('messages')}>messages</button>
        <button className={`admin-tab ${tab === 'settings' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('settings')}>settings</button>
      </div>

      {tab === 'analytics' && (
        <AnalyticsTab token={token} authHeaders={authHeaders} />
      )}

      {tab === 'messages' && (
        <>
          {msgStats && (
            <div className="admin-stats">
              <div className="stats-grid">
                <StatCard label="total" value={msgStats.total} accent />
                <StatCard label="today" value={msgStats.today} />
                <StatCard label="banned" value={msgStats.banned} />
                <StatCard label="replied" value={msgStats.replied} />
              </div>
              {msgStats.countries.length > 0 && (
                <div className="stats-countries">
                  <h3>top countries</h3>
                  {msgStats.countries.map(c => (
                    <HorizontalBar key={c.country} label={c.country} value={c.count} max={msgStats.countries[0].count} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="admin-toolbar">
            <div className="admin-filters">
              {(['all', 'active', 'banned'] as Filter[]).map(f => (
                <button key={f} className={`admin-filter-btn ${filter === f ? 'admin-filter-btn--active' : ''}`}
                  onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
            <input type="text" placeholder="search messages, ip, country..."
              value={search} onChange={e => setSearch(e.target.value)} className="admin-input admin-search" />
          </div>

          <div className="admin-messages">
            {filtered.map((msg, i) => (
              <div key={msg.id} className={`admin-card ${msg.banned ? 'admin-card--banned' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="admin-card-header">
                  <span className="admin-author">anon</span>
                  <span className="admin-id">#{msg.id}</span>
                  <span className="text-dim text-small">{formatDate(msg.created_at)}</span>
                  {!!msg.banned && <span className="admin-badge admin-badge--banned">banned</span>}
                  {!!msg.pinned && <span className="admin-badge admin-badge--pinned">pinned</span>}
                  {!!msg.admin_liked && <span className="admin-badge admin-badge--liked">❤️</span>}
                  {msg.answer && <span className="admin-badge admin-badge--replied">replied</span>}
                  <InfoTooltip msg={msg} />
                </div>
                <p className="admin-msg-text">{msg.text}</p>
                {msg.answer && (
                  <div className="admin-answer">
                    <span className="admin-answer-label">your reply:</span> {msg.answer}
                  </div>
                )}
                <div className="admin-actions">
                  {msg.banned
                    ? <CoolButton onClick={() => handleBan(msg.id, false)}>unban</CoolButton>
                    : <CoolButton onClick={() => handleBan(msg.id, true)}>ban</CoolButton>}
                  <CoolButton onClick={() => handlePin(msg.id, !msg.pinned)}>{msg.pinned ? 'unpin' : 'pin'}</CoolButton>
                  <CoolButton onClick={() => handleLike(msg.id, !msg.admin_liked)}>{msg.admin_liked ? '💔 unlike' : '❤️ like'}</CoolButton>
                  <CoolButton onClick={() => { setReplyId(replyId === msg.id ? null : msg.id); setReplyText(msg.answer || '') }}>reply</CoolButton>
                  <CoolButton onClick={() => handleDelete(msg.id)}>delete</CoolButton>
                </div>
                {replyId === msg.id && (
                  <div className="admin-reply-form">
                    <textarea className="admin-input admin-textarea" placeholder="your reply..."
                      value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} autoFocus />
                    <CoolButton onClick={() => handleReply(msg.id)}>send reply</CoolButton>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-half-visible admin-empty">no messages found</p>}
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <CoolButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>prev</CoolButton>
              <span className="text-dim">{page} / {totalPages}</span>
              <CoolButton disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>next</CoolButton>
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <SettingsTab authHeaders={authHeaders} />
      )}
    </section>
  )
}
