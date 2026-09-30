import { useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import SEO from "../components/utility/SEO";
import { schoolInfo } from "../data/schoolData";
import { api, ApiError } from "../lib/apiClient";

const initialForm = { name: "", phone: "", email: "", subject: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { contact, location } = schoolInfo;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/public/contact", {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject || undefined,
        message: form.message,
      });
      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(location.mapQuery)}&output=embed`;
  const mapLinkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;

  return (
    <>
      <SEO
        title="Contact"
        description="Contact Government Higher Secondary School, Kangayampalayam, Sulur, Coimbatore District, Tamil Nadu."
      />
      <PageHero
        eyebrow="Get in Touch"
        title="Let's stay connected."
        description="We'd love to hear from parents, students, alumni and the wider community."
        trail={[{ label: "Contact" }]}
      />

      <section className="py-20 sm:py-28">
        <Container className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16">
          <Reveal className="flex flex-col gap-6">
            <InfoCard icon="MapPin" title="Address">
              {location.addressLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </InfoCard>
            <InfoCard icon="Phone" title="Phone">
              <a href={`tel:${contact.phonePrimary.replace(/\s/g, "")}`} className="hover:text-gold-dark transition-colors">
                {contact.phonePrimary}
              </a>
            </InfoCard>
            <InfoCard icon="Mail" title="Email">
              <a href={`mailto:${contact.email}`} className="hover:text-gold-dark transition-colors break-all">
                {contact.email}
              </a>
            </InfoCard>
            <InfoCard icon="Clock" title="Working Hours">
              {contact.officeHours}
            </InfoCard>

            <div className="rounded-3xl overflow-hidden border border-navy/8 shadow-soft h-64 relative">
              <iframe
                title="School location on Google Maps"
                src={mapEmbedSrc}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={mapLinkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold-dark transition-colors self-start"
            >
              Open in Google Maps <Icon name="ArrowUpRight" size={14} />
            </a>
          </Reveal>

          <Reveal delay={0.08}>
            {submitted ? (
              <div className="bg-white rounded-3xl border border-navy/8 shadow-soft p-10 text-center flex flex-col items-center gap-4 h-full justify-center">
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-teal/10 text-teal">
                  <Icon name="ShieldCheck" size={28} />
                </span>
                <h3 className="font-heading font-bold text-navy text-lg">Message received!</h3>
                <p className="text-sm text-ink/60 max-w-sm">
                  Thank you for reaching out. The school office will get back to you soon.
                </p>
                <Button variant="outlineDark" onClick={() => setSubmitted(false)} showIcon={false}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-navy/8 shadow-soft p-6 sm:p-8 grid sm:grid-cols-2 gap-5">
                <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
                <div className="sm:col-span-2">
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Subject" name="subject" value={form.subject} onChange={handleChange} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-navy/70 mb-1.5" htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-navy/12 text-sm focus:border-gold outline-none resize-none"
                  />
                </div>
                {error && (
                  <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}
                <div className="sm:col-span-2 flex items-center justify-end gap-4 flex-wrap">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Send Message"}
                  </Button>
                </div>
              </form>
            )}
          </Reveal>
        </Container>
      </section>
    </>
  );
}

function InfoCard({ icon, title, children }) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-2xl border border-navy/8 shadow-soft p-5">
      <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy/6 text-navy shrink-0">
        <Icon name={icon} size={19} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/45 mb-1">{title}</p>
        <div className="text-sm text-navy/85 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-navy/70 mb-1.5" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 rounded-xl border border-navy/12 text-sm focus:border-gold outline-none"
      />
    </div>
  );
}
