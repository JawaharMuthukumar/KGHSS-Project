import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Container from "../components/ui/Container";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/apiClient";

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

function groupClasses(classes) {
  const secondary = classes.filter((c) => c.grade < 11).sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
  const higher = classes.filter((c) => c.grade >= 11).sort((a, b) => a.grade - b.grade || a.code.localeCompare(b.code));
  const groups = [];
  if (secondary.length) groups.push({ title: "Classes 6 – 10", items: secondary });
  if (higher.length) groups.push({ title: "Higher Secondary", items: higher });
  return groups;
}

function ClassPicker({ onSelect }) {
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/public/classes")
      .then((data) => {
        if (!cancelled) setClasses(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the class list. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = classes ? groupClasses(classes) : [];

  return (
    <div className="max-w-3xl mx-auto bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <span className="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0 mb-4 bg-heritage-gradient">
        <Icon name="GraduationCap" size={22} />
      </span>
      <h1 className="font-heading font-bold text-white text-xl mb-1">Student Login</h1>
      <p className="text-sm text-white/55 leading-relaxed mb-5">
        Pick your class to sign in with your Register Number.
      </p>

      {error && <p className="text-sm text-red-300 mb-4">{error}</p>}
      {!classes && !error && <p className="text-sm text-white/50">Loading classes…</p>}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-2">
              {group.title}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {group.items.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/40 rounded-xl px-3 py-2.5 transition-colors duration-150"
                >
                  <span className="block font-heading font-bold text-sm text-white">
                    {item.group_name ? (
                      <>
                        {item.grade} <span className="text-gold-light">· {item.group_name}</span>
                      </>
                    ) : (
                      <>
                        {item.grade}
                        <span className="text-gold-light">{item.section}</span>
                      </>
                    )}
                  </span>
                  <span className="block text-[11px] text-white/45 mt-0.5">{item.code}</span>
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ register: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({
        username: form.register.trim(),
        password: form.password,
        classCode: classInfo.code,
      });
      const from = location.state?.from?.pathname;
      navigate(from && from.startsWith("/student") ? from : "/student", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <p className="text-sm font-bold text-white">{classInfo.code}</p>
          </div>
        </div>

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
              autoComplete="username"
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
                autoComplete="current-password"
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

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <Icon name="CircleAlert" size={14} />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-gold text-navy-dark font-semibold text-sm py-3.5 rounded-full hover:bg-gold-light transition-colors mt-1 disabled:opacity-60"
          >
            {submitting ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="ArrowRight" size={16} />}
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-white/40 text-center mt-5">
          Lost access or number changed?{" "}
          <Link to="/contact" className="text-gold-light hover:text-gold font-semibold transition-colors">
            Contact your Class Teacher
          </Link>
        </p>
      </div>
    </div>
  );
}
