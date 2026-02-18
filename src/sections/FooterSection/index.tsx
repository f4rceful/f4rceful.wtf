import { IconHeart } from '../../components/icons'
import { VisitorsCounter } from '../../components/VisitorsCounter'
import { NowPlaying } from '../../components/NowPlaying'
import qrCode from '../../assets/qr-code.svg'
import './style.css'

export function FooterSection() {
  return (
    <footer className="footer-section">
      <NowPlaying />
      <VisitorsCounter />
      <p>
        made with <IconHeart size={14} /> by{' '}
        <span className="accent">f4rceful</span>
      </p>
      <img src={qrCode} alt="QR code — f4rceful.wtf" className="footer-qr" />
      <p className="text-dim">
        {new Date().getFullYear()}
      </p>
      <p className="footer-credits">
        design stolen from{' '}
        <a href="https://github.com/nitreojs/starkow.dev/tree/lord/apps/starkow.dev" target="_blank" rel="noopener noreferrer">
          Starkow
        </a>
        {' · '}
        <a href="/privacy" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')) }}>
          privacy
        </a>
      </p>
    </footer>
  )
}
