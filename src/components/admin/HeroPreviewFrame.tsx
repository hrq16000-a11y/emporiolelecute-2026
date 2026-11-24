import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const HeroPreviewFrame = ({ children, mobile, banner }: { children: ReactNode; mobile: boolean; banner: boolean }) => (
  <div className="hero-preview-stage grid place-items-center" data-hero-preview-stage>
    <div className={cn(
      'hero-preview-frame bg-background border-8 border-foreground/80 overflow-hidden shadow-lg',
      mobile ? 'hero-preview-mobile rounded-[28px]' : 'hero-preview-desktop rounded-xl',
      banner ? (mobile ? 'hero-banner-mobile' : 'hero-banner-desktop') : 'hero-preview-text overflow-y-auto',
    )}>
      {children}
    </div>
  </div>
);

export default HeroPreviewFrame;