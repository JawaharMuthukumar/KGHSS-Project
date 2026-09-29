import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import Container from "../components/ui/Container";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import StudentLogin from "./StudentLogin";

const roleCopy = {
  admin: {
    title: "Admin Portal",
    description: "Headmaster, Assistant Headmaster & Office Staff",
    icon: "ShieldCheck",
    iconBg: "bg-heritage-gradient",
    idLabel: "Staff ID",
    idPlaceholder: "e.g. GHSS-HM-001",
    demoHint: "Demo: GHSS-HM-001 / admin",
    footerNote: "Role-based access · Headmaster credentials required",
  },
  teacher: {
    title: "Teacher Portal",
    description: "Sign in with your Employee ID. Class Teachers also manage their assigned class from here.",
    icon: "Users",
    iconBg: "bg-gradient-to-br from-teal to-teal-light",
    idLabel: "Employee ID",
    idPlaceholder: "e.g. GHSS/T/101",
    helperNote: "First-time class teacher? Use the temporary password issued by the Headmaster, then set a new one.",
    demoHint: "Demo: GHSS/T/101 / teacher",
  },
};

export default function Login() {
  const { role } = useParams();

  if (role === "student") return <StudentLogin />;

  const copy = roleCopy[role];
  if (!copy) return <Navigate to="/" replace />;

  return (
    <>
      <SEO title={copy.title} description={`${copy.title} for Government Higher Secondary School, Kangayampalayam.`} />

      <section className="bg-navy-dark h-full overflow-y-auto flex items-center py-6">
        <Container>
          <PortalCard copy={copy} />
        </Container>
      </section>
    </>
  );
}

function PortalCard({ copy }) {
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [form, setForm] = useState({ id: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Demo-only: no authentication backend is connected yet.
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <span className={`flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0 mb-4 ${copy.iconBg}`}>
        <Icon name={copy.icon} size={22} />
      </span>
      <h1 className="font-heading font-bold text-white text-xl mb-1">{copy.title}</h1>
      <p className="text-sm text-white/55 leading-relaxed mb-5">{copy.description}</p>

      {submitted ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-light/20 text-gold-light">
            <Icon name="ShieldCheck" size={26} />
          </span>
          <h3 className="font-heading font-bold text-white text-base">Demo only</h3>
          <p className="text-sm text-white/60">
            This login form is not yet connected to a backend, so no account has actually been signed in.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-sm font-semibold text-gold-light hover:text-gold transition-colors"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5" htmlFor="id">
              {copy.idLabel}
            </label>
            <input
              id="id"
              name="id"
              type="text"
              required
              placeholder={copy.idPlaceholder}
              value={form.id}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:border-gold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:border-gold outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={17} />
              </button>
            </div>
          </div>

          {copy.helperNote && (
            <p className="text-xs text-white/45 leading-relaxed">{copy.helperNote}</p>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-white/30 bg-white/5 accent-gold"
              />
              Keep me signed in
            </label>
            <span className="text-xs text-white/35">{copy.demoHint}</span>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-gold text-navy-dark font-semibold text-sm py-3.5 rounded-full hover:bg-gold-light transition-colors mt-1"
          >
            Sign In
            <Icon name="ArrowRight" size={16} />
          </button>

          {copy.footerNote && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-white/35 text-center">
              <Icon name="ShieldCheck" size={13} />
              {copy.footerNote}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
