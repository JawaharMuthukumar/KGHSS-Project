import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from "../../lib/installApp";

const DISMISS_KEY = "kghss.installDismissedAt";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000; // "Later" hides it for two weeks

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < ASK_AGAIN_MS;
  } catch {
    return false;
  }
}

/**
 * Shown to signed-in users on phones/tablets only: one-tap install on Android/Chrome, or the
 * "Share → Add to Home Screen" steps on iPhone. Hidden inside the installed app and after "Later".
 */
export default function InstallAppBanner() {
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed());
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => subscribeInstall(() => rerender((n) => n + 1)), []);

  const ios = isIOS();
  if (hidden || (!canPromptInstall() && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* fine: it just shows again next visit */
    }
    setHidden(true);
  };

  const install = async () => {
    if (ios) {
      setShowIosSteps((v) => !v);
      return;
    }
    if (await promptInstall()) setHidden(true);
  };

  return (
    <div className="lg:hidden mb-4 rounded-2xl bg-heritage-gradient text-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0 ring-1 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-sm leading-tight">Install the school app</p>
          <p className="text-xs text-white/70 leading-snug">Open the portal from your home screen, like an app.</p>
        </div>
      </div>
      {showIosSteps && (
        <ol className="mt-3 text-xs text-white/85 space-y-1 list-decimal pl-5">
          <li>
            Tap the <span className="font-semibold">Share</span> button <Icon name="ArrowUpRight" size={12} className="inline -mt-0.5" /> in Safari's bar.
          </li>
          <li>
            Choose <span className="font-semibold">Add to Home Screen</span>, then tap <span className="font-semibold">Add</span>.
          </li>
        </ol>
      )}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={install}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light"
        >
          <Icon name="Download" size={15} />
          {ios ? (showIosSteps ? "Got it" : "How to install") : "Install"}
        </button>
        <button type="button" onClick={dismiss} className="px-4 py-2.5 rounded-full text-sm font-semibold text-white/80 hover:bg-white/10">
          Later
        </button>
      </div>
    </div>
  );
}
