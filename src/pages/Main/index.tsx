import { lazy, Suspense } from 'react'
import { WelcomeSection } from '../../sections/WelcomeSection'
import { SkillsSection } from '../../sections/SkillsSection'

const ProjectsSection = lazy(() => import('../../sections/ProjectsSection').then(m => ({ default: m.ProjectsSection })))
const LinksSection = lazy(() => import('../../sections/LinksSection').then(m => ({ default: m.LinksSection })))
const DonationsSection = lazy(() => import('../../sections/DonationsSection').then(m => ({ default: m.DonationsSection })))
const ShoutboxSection = lazy(() => import('../../sections/ShoutboxSection').then(m => ({ default: m.ShoutboxSection })))
const FooterSection = lazy(() => import('../../sections/FooterSection').then(m => ({ default: m.FooterSection })))

export function MainPage() {
  return (
    <>
      <WelcomeSection />
      <SkillsSection />
      <Suspense>
        <ProjectsSection />
        <LinksSection />
        <DonationsSection />
        <ShoutboxSection />
        <FooterSection />
      </Suspense>
    </>
  )
}
