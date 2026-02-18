import { useRef, useCallback } from 'react'
import { WakaTime } from '../../components/WakaTime'
import './style.css'

const SKILLS = [
  {
    category: 'backend',
    items: [
      { label: 'Python', accent: true },
      { label: 'FastAPI' },
      { label: 'SQLAlchemy' },
      { label: 'Alembic' },
      { label: 'Celery' },
      { label: 'Pytest' },
      { label: 'Node.js', accent: true },
      { label: 'PostgreSQL' },
      { label: 'Redis' },
      { label: 'Docker' },
      { label: 'Nginx' },
      { label: 'JWT/OAuth2' },
    ],
  },
  {
    category: 'frontend',
    items: [
      { label: 'React', accent: true },
      { label: 'TypeScript' },
      { label: 'Vite' },
      { label: 'HTML/CSS' },
      { label: 'REST API' },
      { label: 'Webpack' },
      { label: 'Tailwind CSS' },
    ],
  },
  {
    category: 'ml / ai',
    items: [
      { label: 'PyTorch', accent: true },
      { label: 'TensorFlow' },
      { label: 'CatBoost' },
      { label: 'XGBoost' },
      { label: 'LightGBM' },
      { label: 'Scikit-learn' },
      { label: 'NumPy' },
      { label: 'Pandas' },
      { label: 'SciPy' },
      { label: 'SpaCy' },
      { label: 'NLTK' },
    ],
  },
]

function getPos(e: React.MouseEvent, rect: DOMRect) {
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  return { x, y }
}

function SkillTag({ label, accent, delay }: { label: string; accent?: boolean; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const borderRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    const x = Math.round(nx * 30)
    const y = Math.round(ny * -30)
    el.style.transition = 'transform 0.1s ease-out'
    el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg)`
  }, [])

  const animate = useCallback((el: HTMLSpanElement, enter: boolean, x: number, y: number) => {
    if (enter) {
      el.style.transition = 'none'
      el.style.clipPath = `circle(0% at ${x}% ${y}%)`
      el.offsetHeight
      el.style.transition = 'clip-path 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.clipPath = `circle(150% at ${x}% ${y}%)`
    } else {
      el.style.transition = 'clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.clipPath = `circle(0% at ${x}% ${y}%)`
    }
  }, [])

  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const { x, y } = getPos(e, rect)
    if (borderRef.current) animate(borderRef.current, true, x, y)
    if (textRef.current) animate(textRef.current, true, x, y)
  }, [animate])

  const onMouseLeave = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const { x, y } = getPos(e, rect)
    if (borderRef.current) animate(borderRef.current, false, x, y)
    if (textRef.current) animate(textRef.current, false, x, y)
    el.style.transition = 'transform 0.4s ease-out'
    el.style.transform = ''
  }, [animate])

  return (
    <span
      ref={ref}
      className={`skill-tag ${accent ? 'skill-tag--accent' : ''}`}
      style={{ animationDelay: `${delay}s` }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span ref={borderRef} className="skill-tag-border" />
      {!accent && <span ref={textRef} className="skill-tag-text-hover" aria-hidden>{label}</span>}
      {label}
    </span>
  )
}

export function SkillsSection() {
  return (
    <section>
      <h2>skills</h2>
      <div className="skills-grid">
        {SKILLS.map((group) => (
          <div key={group.category} className="skills-group">
            <span className="skills-category">{group.category}</span>
            <div className="skills-tags">
              {group.items.map((item, i) => (
                <SkillTag key={item.label} label={item.label} accent={item.accent} delay={i * 0.04} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <WakaTime />
    </section>
  )
}
