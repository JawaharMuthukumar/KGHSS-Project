import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { studentClasses } from "../data/schoolData";

export default function StudentLogin() {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <SEO
        title="Student Login"
        description="Student login for Government Higher Secondary School, Kangayampalayam."
      />

      <section className="bg-navy-dark h-full overflow-y-auto flex items-center py-6">
        <Container>
          {selected ? (
            <SignInCard classInfo={selected} onBack={() => setSelected(null)} />
          ) : (
            <ClassPicker onSelect={setSelected} />
          )}
        </Container>
      </section>
    </>
  );
}

function ClassPicker({ onSelect }) {
  return (
    <div className="max-w-3xl mx-auto bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <span className="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0 mb-4 bg-heritage-gradient">
        <Icon name="GraduationCap" size={22} />
      </span>
      <h1 className="font-heading font-bold text-white text-xl mb-1">Student Login</h1>
      <p className="text-sm text-white/55 leading-relaxed mb-5">
        Pick your class to sign in with your Register Number.
      </p>

      <div className="flex flex-col gap-4">
        {studentClasses.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-2">
              {group.title}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/40 rounded-xl px-3 py-2.5 transition-colors duration-150"
                >
                  <span className="block font-heading font-bold text-sm text-white">
                    {item.section ? (
                      <>
                        {item.grade}
                        <span className="text-gold-light">{item.section}</span>
                      </>
                    ) : (
                      <>
                        {item.grade} <span className="text-gold-light">· {item.group}</span>
                      </>
                    )}
                  </span>
                  <span className="block text-[11px] text-white/45 mt-0.5">
                    {item.stream ? `${item.stream} · ` : ""}
                    {item.students} students
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignInCard({ classInfo, onBack }) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ register: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Demo-only: no authentication backend is connected yet.
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4 transition-colors"
      >
        <Icon name="ArrowLeft" size={15} />
        Change class
      </button>

      <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-heritage-gradient text-gold-light shrink-0">
            <Icon name="GraduationCap" size={19} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Signing in as</p>
            <p className="text-sm font-bold text-white">{classInfo.label}</p>
          </div>
        </div>

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
          <>
            <h1 className="font-heading font-bold text-white text-xl mb-1">Student Sign In</h1>
            <p className="text-sm text-white/55 mb-5">Use your Register Number and password to continue.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5" htmlFor="register">
                  Register Number
                </label>
                <input
                  id="register"
                  name="register"
                  type="text"
                  required
                  placeholder="e.g. GHSS/2026/0001"
                  value={form.register}
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

              <p className="flex items-center gap-1.5 text-xs text-white/40">
                <Icon name="Info" size={13} />
                Demo password: student
              </p>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-gold text-navy-dark font-semibold text-sm py-3.5 rounded-full hover:bg-gold-light transition-colors mt-1"
              >
                Sign In
                <Icon name="ArrowRight" size={16} />
              </button>
            </form>

            <p className="text-xs text-white/40 text-center mt-5">
              Lost access or number changed?{" "}
              <Link to="/contact" className="text-gold-light hover:text-gold font-semibold transition-colors">
                Contact your Class Teacher
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
