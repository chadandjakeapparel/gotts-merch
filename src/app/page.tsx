import { InquiryForm } from "@/components/inquiry-form";
import { CheckIcon, CupIcon, MenuCardIcon, PenIcon, ShirtIcon } from "@/components/icons";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { TeamAvatar } from "@/components/team-avatar";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

const categoryIcons = {
  apparel: ShirtIcon,
  print: MenuCardIcon,
  drinkware: CupIcon,
  retail: PenIcon,
} as const;

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <div id="top">
      <Nav
        brandName={content.brandName}
        logoUrl={content.logoUrl}
        productCategories={content.productCategories}
        shopUrl={content.shopUrl}
      />

      <main>
        <section className="gm-hero">
          <div className="gm-container gm-hero__inner">
            <div className="gm-hero__copy">
              <p className="gm-eyebrow">{content.heroEyebrow}</p>
              <h1>{content.tagline}</h1>
              <p className="gm-hero__lead">{content.heroLead}</p>
              <div className="gm-hero__actions">
                <a className="gm-btn gm-btn--primary" href="#quote">
                  Get a Quote
                </a>
                <a className="gm-btn gm-btn--ghost" href="#products">
                  See what we print
                </a>
              </div>
              <div className="gm-hero__served">
                <span>Built for</span>
                <div className="gm-pill-row">
                  {content.venueTypes.map((type) => (
                    <span className="gm-pill" key={type}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="gm-hero__visual">
              {content.productCategories.map((category) => {
                const Icon = categoryIcons[category.key as keyof typeof categoryIcons];
                return (
                  <div className="gm-hero__card" key={category.key}>
                    <Icon />
                    <span>{category.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="gm-products" id="products">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.productsEyebrow}</p>
              <h2>{content.productsTitle}</h2>
            </div>
            <div className="gm-products__grid">
              {content.productCategories.map((category) => {
                const Icon = categoryIcons[category.key as keyof typeof categoryIcons];
                return (
                  <article
                    className="gm-product-card"
                    id={`product-${category.key}`}
                    key={category.key}
                  >
                    <div className="gm-product-card__icon">
                      <Icon />
                    </div>
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                    <ul>
                      {category.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="gm-activations" id="merch-activations">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.activationsEyebrow}</p>
              <h2>{content.activationsTitle}</h2>
            </div>
            <div className="gm-activations__intro">
              <p>{content.activationsLead}</p>
              <span className="gm-activations__stat">{content.activationsStat}</span>
            </div>
            <div className="gm-activations__grid">
              {content.activationsStations.map((station, index) => (
                <div className="gm-activations__station" key={station.title}>
                  <span className="gm-activations__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{station.title}</h3>
                  <p>{station.description}</p>
                </div>
              ))}
            </div>
            <div className="gm-activations__process">
              <div>
                <p className="gm-eyebrow">{content.activationsProcessEyebrow}</p>
                <h3>{content.activationsProcessTitle}</h3>
              </div>
              <ul className="gm-retail__list">
                {content.activationsProcessItems.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="gm-activations__cta">
              <div>
                <h3>{content.activationsCtaTitle}</h3>
                <p>{content.activationsCtaBody}</p>
              </div>
              <a className="gm-btn gm-btn--primary" href="#quote">
                Request a quote
              </a>
            </div>
          </div>
        </section>

        <section className="gm-why" id="why-us">
          <div className="gm-container">
            <div className="gm-section-heading gm-section-heading--light">
              <p className="gm-eyebrow">{content.whyEyebrow}</p>
              <h2>{content.whyTitle}</h2>
            </div>
            <div className="gm-why__grid">
              {content.differentiators.map((item) => (
                <div className="gm-why__item" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-about" id="about">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.aboutEyebrow}</p>
              <h2>{content.aboutTitle}</h2>
            </div>
            <p className="gm-about__history">{content.aboutHistory}</p>
            <div className="gm-about__team">
              {content.teamMembers.map((member) => (
                <div className="gm-about__member" key={member.name}>
                  <div className="gm-about__member-header">
                    <TeamAvatar name={member.name} photoUrl={member.photoUrl} />
                    <div>
                      <h3>{member.name}</h3>
                      <p className="gm-about__role">{member.role}</p>
                    </div>
                  </div>
                  <p>{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-retail">
          <div className="gm-container gm-retail__grid">
            <div>
              <p className="gm-eyebrow">{content.retailEyebrow}</p>
              <h2>{content.retailTitle}</h2>
              <p>{content.retailBody}</p>
              <a className="gm-btn gm-btn--primary" href="#quote">
                Build a retail line
              </a>
            </div>
            <ul className="gm-retail__list">
              {content.retailListItems.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="gm-process" id="process">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.processEyebrow}</p>
              <h2>{content.processTitle}</h2>
            </div>
            <div className="gm-process__grid">
              {content.processSteps.map((step) => (
                <div className="gm-process__step" key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-quote" id="quote">
          <div className="gm-container gm-quote__grid">
            <div className="gm-quote__intro">
              <p className="gm-eyebrow">{content.quoteEyebrow}</p>
              <h2>{content.quoteTitle}</h2>
              <p>{content.quoteBody}</p>
              <p className="gm-quote__note">{content.quoteNote}</p>
            </div>
            <InquiryForm inquiryEmail={content.inquiryEmail} />
          </div>
        </section>
      </main>

      <SiteFooter content={content} />
    </div>
  );
}
