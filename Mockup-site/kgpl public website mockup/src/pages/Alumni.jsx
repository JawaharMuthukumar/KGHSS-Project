import { useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import SEO from "../components/utility/SEO";
import { alumniInfo, centenaryBlocks } from "../data/schoolData";

const initialForm = { name: "", passingYear: "", classLabel: "", phone: "", email: "", profession: "", message: "" };

export default function Alumni() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Demo-only: no backend is connected. This simulates a successful submission.
    setSubmitted(true);
    setForm(initialForm);
  };

  return (
    <>
      <SEO
        title="Alumni"
        description="Old Students Association of Government Higher Secondary School, Kangayampalayam — connecting generations of students."
      />
      <PageHero
        eyebrow="Community"
        title={alumniInfo.title}
        description={alumniInfo.description}
        trail={[{ label: "Alumni & PTA", to: "/alumni" }, { label: "Alumni" }]}
      />

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Alumni Stories"
            title="Memories from former students."
            description="Sample reflections shown below — real alumni stories will replace these entries over time."
          />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {alumniInfo.stories.map((story, i) => (
              <Reveal key={story.id} delay={(i % 3) * 0.08}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 flex flex-col">
                  <Icon name="Quote" size={24} className="text-gold/50 mb-4" />
                  <p className="text-sm text-ink/70 leading-relaxed mb-6 flex-1 italic">"{story.message}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-navy/8">
                    <div>
                      <p className="text-sm font-semibold text-navy">{story.name}</p>
                      <p className="text-xs text-ink/50">Batch of {story.passingYear} · {story.profession}</p>
                    </div>
                    {story.isSample && <Badge tone="sample">Sample</Badge>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container>
          <SectionHeading
            eyebrow="Centenary"
            title="Be part of our centenary story."
            description="As we approach 100 years, we're gathering memories, photographs and messages from across the decades."
          />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {centenaryBlocks.map((block) => (
              <Reveal key={block.title}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 text-center flex flex-col items-center gap-3">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gold/12 text-gold-dark">
                    <Icon name={block.icon} size={20} />
                  </span>
                  <p className="font-heading font-semibold text-navy text-sm">{block.title}</p>
                  <p className="text-xs text-ink/55 leading-relaxed">{block.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="max-w-2xl mx-auto">
          <SectionHeading
            eyebrow="Stay Connected"
            title="Join the Alumni Network"
            align="center"
            description="Share your details and reconnect with your school community."
          />

          {submitted ? (
            <Reveal className="mt-10 bg-white rounded-3xl border border-navy/8 shadow-soft p-10 text-center flex flex-col items-center gap-4">
              <span className="flex items-center justify-center w-14 h-14 rounded-full bg-teal/10 text-teal">
                <Icon name="ShieldCheck" size={28} />
              </span>
              <h3 className="font-heading font-bold text-navy text-lg">Thank you!</h3>
              <p className="text-sm text-ink/60 max-w-sm">
                This is a demo submission — no data has actually been sent, since this prototype
                is not yet connected to a backend.
              </p>
              <Button variant="outlineDark" onClick={() => setSubmitted(false)} showIcon={false}>
                Submit another response
              </Button>
            </Reveal>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 bg-white rounded-3xl border border-navy/8 shadow-soft p-6 sm:p-8 grid sm:grid-cols-2 gap-5">
              <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
              <Field label="Passing Year" name="passingYear" value={form.passingYear} onChange={handleChange} required />
              <Field label="Class" name="classLabel" value={form.classLabel} onChange={handleChange} />
              <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
              <Field label="Current Profession" name="profession" value={form.profession} onChange={handleChange} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-navy/70 mb-1.5" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-navy/12 text-sm focus:border-gold outline-none resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-ink/45">Demo form — submissions are not sent anywhere yet.</p>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          )}
        </Container>
      </section>
    </>
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
