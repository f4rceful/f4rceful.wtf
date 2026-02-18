import './style.css'

function emojiToCodepoint(emoji: string): string {
  const codepoints: string[] = []
  for (const char of emoji) {
    const cp = char.codePointAt(0)
    if (cp) {
      codepoints.push(cp.toString(16))
    }
  }
  return codepoints.join('-')
}

interface AppleEmojiProps {
  emoji: string
  size?: number
  className?: string
}

export function AppleEmoji({ emoji, size = 20, className = '' }: AppleEmojiProps) {
  const codepoint = emojiToCodepoint(emoji)
  const src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${codepoint}.png`

  return (
    <img
      src={src}
      alt={emoji}
      className={`apple-emoji ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
