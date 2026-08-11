import type { ReactNode } from 'react';
import Image from 'next/image';

/**
 * アプリ画面の導入部。LPの濃紺・ミント・ライムのデザイン言語を、
 * 情報量の多い作業画面でも邪魔にならない密度で共通化する。
 */
export default function AppPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  backgroundImage,
  backgroundAlt = '',
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  backgroundImage?: string;
  backgroundAlt?: string;
}) {
  return (
    <section className={`app-page-hero ${backgroundImage ? 'app-page-hero--image' : ''}`}>
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt={backgroundAlt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1152px"
            className="app-page-hero__background"
          />
          <div className="app-page-hero__image-overlay" aria-hidden />
        </>
      )}
      <div className="app-page-hero__glow" aria-hidden />
      <div className="relative z-10 min-w-0">
        <p className="app-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="app-page-hero__description">{description}</p>}
        {actions && <div className="app-page-hero__actions">{actions}</div>}
      </div>
      {children && <div className="app-page-hero__aside">{children}</div>}
    </section>
  );
}
