import { InquiryForm } from "@/components/inquiry-form";
import { CheckIcon, CupIcon, MenuCardIcon, PenIcon, ShirtIcon } from "@/components/icons";
import { Logo, Wordmark } from "@/components/logo";
import { Nav } from "@/components/nav";
import {
  BRAND_NAME,
  TAGLINE,
  differentiators,
  processSteps,
  productCategories,
  venueTypes,
} from "@/content/site-content";

const categoryIcons = {
  apparel: ShirtIcon,
  print: MenuCardIcon,
  drinkware: CupIcon,
  retail: PenIcon,
} as const;

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div id="top">
      <Nav />

      <main>
        <section className="gm-hero">
          <div className="gm-container gm-hero__inner">
            <div className="gm-hero__copy">
              <p className="gm-eyebrow">
                Promotional products for restaurants, bars &amp; hotels
              </p>
              <h1>{TAGLINE}</h1>
              <p className="gm-hero__lead">
                Apparel, printed paper goods, drinkware, and retail merch —
                sourced and produced for hospitality, and nothing else.
                Commercial-grade materials, fast turns on seasonal menus,
                and one team that understands what a busy shift does to a
                product.
              </p>
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
                  {venueTypes.map((type) => (
                    <span className="gm-pill" key={type}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="gm-hero__visual">
              {productCategories.map((category) => {
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
              <p className="gm-eyebrow">What we print &amp; sew</p>
              <h2>One partner for everything a guest touches.</h2>
            </div>
            <div className="gm-products__grid">
              {productCategories.map((category) => {
                const Icon = categoryIcons[category.key as keyof typeof categoryIcons];
                return (
                  <article className="gm-product-card" key={category.key}>
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

        <section className="gm-why" id="why-us">
          <div className="gm-container">
            <div className="gm-section-heading gm-section-heading--light">
              <p className="gm-eyebrow">Why hospitality teams work with us</p>
              <h2>We&rsquo;ve Gotts you covered. That&rsquo;s the point.</h2>
            </div>
            <div className="gm-why__grid">
              {differentiators.map((item) => (
                <div className="gm-why__item" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-retail">
          <div className="gm-container gm-retail__grid">
            <div>
              <p className="gm-eyebrow">Turn merch into a revenue line</p>
              <h2>Give guests something to buy on the way out.</h2>
              <p>
                A small retail rack near the host stand or register — tees,
                hats, tote bags, and branded basics — turns loyal regulars
                into walking advertising, and adds a line of revenue that
                didn&rsquo;t exist before.
              </p>
              <a className="gm-btn gm-btn--primary" href="#quote">
                Build a retail line
              </a>
            </div>
            <ul className="gm-retail__list">
              {["Tees & hats", "Tote bags", "Register-ready packaging", "Reorder-friendly minimums"].map(
                (item) => (
                  <li key={item}>
                    <CheckIcon />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section className="gm-process" id="process">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">How it works</p>
              <h2>From first sketch to a stocked back-of-house.</h2>
            </div>
            <div className="gm-process__grid">
              {processSteps.map((step) => (
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
              <p className="gm-eyebrow">Start a quote</p>
              <h2>Tell us what you need on the line.</h2>
              <p>
                Share your venue and the products you&rsquo;re picturing —
                from a single apron order to a full multi-location rollout.
                We&rsquo;ll follow up with pricing and material
                recommendations.
              </p>
              <p className="gm-quote__note">
                Replace this space with an approved customer quote once one
                is available.
              </p>
            </div>
            <InquiryForm />
          </div>
        </section>
      </main>

      <footer className="gm-footer">
        <div className="gm-container gm-footer__inner">
          <div className="gm-footer__brand">
            <Logo size={30} />
            <div className="gm-footer__brand-text">
              <p>
                <Wordmark size={15} />
              </p>
              <p className="gm-footer__tagline">
                Promotional products for restaurants, hotels, bars, and cafés.
              </p>
            </div>
          </div>
          <nav aria-label="Footer navigation" className="gm-footer__nav">
            <a href="#products">Products</a>
            <a href="#why-us">Why Us</a>
            <a href="#process">How It Works</a>
            <a href="#quote">Get a Quote</a>
          </nav>
        </div>
        <div className="gm-container gm-footer__bottom">
          <p>
            © {year} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
