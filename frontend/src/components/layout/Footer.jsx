import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { schoolInfo } from "../../data/schoolData";

const quickLinks = [
  { label: "About Our Story", to: "/about" },
  { label: "Headmaster's Profile", to: "/about/headmaster" },
  { label: "Facilities & Safety", to: "/about/facilities" },
  { label: "Gallery", to: "/gallery" },
];

const academicsLinks = [
  { label: "Classes & Streams", to: "/academics" },
  { label: "Achievements & Results", to: "/achievements" },
  { label: "Sports", to: "/sports" },
  { label: "Events", to: "/events" },
];

const resourceLinks = [
  { label: "Notice Board", to: "/notices" },
  { label: "Alumni", to: "/alumni" },
  { label: "PTA", to: "/pta" },
  { label: "100 Years Legacy", to: "/legacy" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { youtube, facebook } = schoolInfo.socialMedia;

  return (
    <footer className="bg-navy-dark text-white/70">
      <div className="container-page py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-heritage-gradient text-gold-light font-heading font-extrabold">
              GK
            </span>
            <span className="font-heading font-bold text-white text-sm leading-tight">
              {schoolInfo.shortName}
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-5">
            {schoolInfo.type} serving Classes {schoolInfo.classesRange} in Tamil and English
            medium — nearly a century of learning, character and community.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={youtube.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit our YouTube channel"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/8 hover:bg-gold hover:text-navy-dark transition-colors duration-200"
            >
              <Icon name="Youtube" size={18} />
            </a>
            {facebook.url ? (
              <a
                href={facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Facebook page"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/8 hover:bg-gold hover:text-navy-dark transition-colors duration-200"
              >
                <Icon name="Facebook" size={18} />
              </a>
            ) : null}
          </div>
        </div>

        <FooterColumn title="Quick Links" links={quickLinks} />
        <FooterColumn title="Academics & School Life" links={academicsLinks} />
        <div>
          <FooterColumn title="Student Resources" links={resourceLinks} />
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <h3 className="text-white font-heading font-semibold text-sm mb-4 tracking-wide uppercase">Contact</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Icon name="MapPin" size={16} className="mt-0.5 shrink-0 text-gold-light" />
              <span>
                {schoolInfo.location.addressLines.join(", ")}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="Phone" size={16} className="shrink-0 text-gold-light" />
              <a href={`tel:${schoolInfo.contact.phonePrimary.replace(/\s/g, "")}`} className="hover:text-white">
                {schoolInfo.contact.phonePrimary}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="Mail" size={16} className="shrink-0 text-gold-light" />
              <a href={`mailto:${schoolInfo.contact.email}`} className="hover:text-white break-all">
                {schoolInfo.contact.email}
              </a>
            </li>
          </ul>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-gold-light hover:text-gold transition-colors"
          >
            Get in touch <Icon name="ArrowRight" size={15} />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50 text-center sm:text-left">
          <p>
            © {year} {schoolInfo.name}. All rights reserved.
          </p>
          <p>Managed by Department of School Education, Government of Tamil Nadu</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-white font-heading font-semibold text-sm mb-4 tracking-wide uppercase">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="hover:text-white transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
