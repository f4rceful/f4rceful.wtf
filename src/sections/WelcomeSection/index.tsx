import { Spoiler } from '../../components/Spoiler'
import { RollingDigit } from '../../components/RollingDigit'
import { TypedText } from '../../components/TypedText'
import { useLiveAge } from '../../hooks/use-live-age'
import './style.css'

export function WelcomeSection() {
  const age = useLiveAge()

  return (
    <section className="welcome-section">
      <h1>welcome!</h1>
      <p>
        hey, i'm <span className="accent">f<RollingDigit delay={300} />rceful</span>
      </p>
      <p>
        <span className="live-age">{age}</span> y/o developer from <Spoiler>somewhere on earth</Spoiler>
      </p>
      <p className="text-half-visible">
        <TypedText text="building stuff that matters (sometimes)" delay={800} speed={45} />
      </p>
    </section>
  )
}
