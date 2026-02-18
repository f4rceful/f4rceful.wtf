import { useState } from 'react'
import { IconCopy, IconCheck } from '../../components/icons'
import './style.css'

interface CopyRowProps {
  label: string
  value: string
  display?: string
}

function CopyRow({ label, value, display }: CopyRowProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="copy-row" onClick={handleCopy}>
      <span className="copy-row-label">{label}</span>
      <code className="copy-row-value">{display ?? value}</code>
      <span className={`copy-row-icon ${copied ? 'copy-row-icon--copied' : ''}`}>
        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      </span>
    </div>
  )
}

export function DonationsSection() {
  return (
    <section>
      <h2>donations</h2>
      <p className="text-half-visible">if you want to support me</p>
      <div className="donations-list">
        <CopyRow label="TON" value="UQAgE3fzFQ19kE0tZC-sSkjY7t6LHpVyObzFCIcuDHlwNVJF" display="UQAgE3...VJF" />
        <CopyRow label="BTC" value="bc1quvsyp4cc0q885fhlasyx70x24z2c528lp2v7ew" display="bc1quv...7ew" />
        <CopyRow label="ETH" value="0xc065079106d5235B3d7A64Bbc20c966515b255C1" display="0xc065...5C1" />
      </div>
    </section>
  )
}
