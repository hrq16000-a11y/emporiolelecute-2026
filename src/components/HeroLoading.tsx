import TrustBadges from '@/components/TrustBadges';

// All asynchronous entry points reserve the same banner, controls and badges.
const HeroLoading = () => (
  <section className="hero-shell relative flex flex-col overflow-hidden bg-background" aria-label="Carregando banners" aria-busy="true">
    <div className="hero-stage relative grid w-full" aria-hidden="true">
      <div className="hero-frame hero-banner-mobile md:hidden bg-muted/30" />
      <div className="hero-frame hero-banner-desktop hidden md:block bg-muted/30" />
    </div>
    <div className="flex items-center justify-center gap-2 md:gap-3 pt-1.5 pb-0 md:pt-3 md:pb-2" aria-hidden="true">
      <span className="h-8 w-8" />
    </div>
    <TrustBadges className="mt-1 md:mt-4" />
  </section>
);

export default HeroLoading;