import './style.css'

export function PrivacyPage() {
  return (
    <section className="privacy-page">
      <h1>privacy policy</h1>
      <p className="text-half-visible">last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <h2>what we collect</h2>
      <p>
        when you visit this site, we automatically collect anonymous analytics data to understand how the site is used:
      </p>
      <ul>
        <li>pages visited and time spent</li>
        <li>referrer URL (where you came from)</li>
        <li>a random session identifier (not linked to your identity)</li>
      </ul>

      <h2>what we don't collect</h2>
      <ul>
        <li>personal information (name, email, etc.)</li>
        <li>IP addresses</li>
        <li>cookies for tracking</li>
      </ul>

      <h2>shoutbox</h2>
      <p>
        messages posted in the shoutbox are public and stored on our server. no account or personal data is required to post.
      </p>

      <h2>third-party services</h2>
      <ul>
        <li><strong>Spotify API</strong> — used to display currently playing track. no user data is shared.</li>
        <li><strong>WakaTime API</strong> — used to display coding stats. no visitor data is shared.</li>
      </ul>

      <h2>local storage</h2>
      <p>
        we store your theme preference (dark/light) in your browser's local storage. this never leaves your device.
      </p>

      <h2>contact</h2>
      <p>
        questions? reach out via <a href="https://t.me/f4rceful">Telegram</a>.
      </p>

      <a href="/" className="privacy-back" onClick={(e) => { e.preventDefault(); history.back() }}>← back</a>
    </section>
  )
}
