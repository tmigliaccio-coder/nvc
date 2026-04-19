"use client";

import { useState } from "react";

function Panel({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-white/80 text-sm font-medium hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        {title}
        <span className="text-white/30 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="px-4 pb-4 pt-0 border-t border-white/[0.04] text-white/50 text-sm leading-relaxed space-y-3">{children}</div> : null}
    </div>
  );
}

export function PaymentsGuide() {
  return (
    <div className="space-y-3">
      <Panel title="Keep your Stripe secret key safe (never paste it in chat)" defaultOpen>
        <ol className="list-decimal list-inside space-y-2 text-xs">
          <li>
            Open only the{" "}
            <strong className="text-white/70">Stripe Dashboard</strong> (dashboard.stripe.com) while logged into your account.
          </li>
          <li>
            Go to <strong className="text-white/70">Developers → API keys</strong>. Find the <strong className="text-white/70">Secret key</strong> (starts with{" "}
            <code className="text-white/60">sk_test_</code> or <code className="text-white/60">sk_live_</code>).
          </li>
          <li>
            Click <strong className="text-white/70">Reveal</strong> and <strong className="text-white/70">copy</strong> there. Paste it only into:
            <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-white/40">
              <li>
                <strong className="text-white/55">Local:</strong> a file named <code className="text-white/60">.env.local</code> in your project folder, as one line:{" "}
                <code className="text-white/60">STRIPE_SECRET_KEY=paste_here</code> — save the file; never commit it (it stays on your machine).
              </li>
              <li>
                <strong className="text-white/55">Vercel:</strong> your project → <strong className="text-white/55">Settings → Environment Variables</strong> → name{" "}
                <code className="text-white/60">STRIPE_SECRET_KEY</code> → paste value → <strong className="text-white/55">Save</strong> → <strong className="text-white/55">Redeploy</strong>.
              </li>
            </ul>
          </li>
          <li>
            If a key was ever pasted into chat, email, or a screenshot, treat it as <strong className="text-amber-400/90">compromised</strong>: in Stripe, roll/revoke that key and use a new one.
          </li>
        </ol>
        <p className="text-white/35 text-[11px] pt-2 border-t border-white/[0.06]">
          The app only reads <code className="text-white/50">STRIPE_SECRET_KEY</code> on the server. It is not stored in the browser and must not live in GitHub.
        </p>
      </Panel>

      <Panel title="Apple Pay & Google Pay on invoices">
        <p className="text-xs">
          Stripe Checkout (the page that opens when you click <strong className="text-white/70">Pay</strong> on a public invoice) can show{" "}
          <strong className="text-white/70">Apple Pay</strong> or <strong className="text-white/70">Google Pay</strong> when the buyer’s device and browser support wallets.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-xs">
          <li>
            Deploy the site on <strong className="text-white/70">HTTPS</strong> (Vercel does this automatically).
          </li>
          <li>
            In Stripe: <strong className="text-white/70">Settings → Payment methods</strong> → enable <strong className="text-white/70">Apple Pay</strong> →{" "}
            <strong className="text-white/70">Add domain</strong> and follow the steps (Stripe gives you a file or DNS check for your live domain, e.g.{" "}
            <code className="text-white/60">your-site.vercel.app</code> or your custom domain).
          </li>
          <li>
            Open the public invoice link on <strong className="text-white/70">iPhone Safari</strong> or <strong className="text-white/70">Chrome on Android</strong>, tap{" "}
            <strong className="text-white/70">Pay</strong> — the wallet button appears when Stripe recognizes the domain and device.
          </li>
          <li>
            In <strong className="text-white/70">test mode</strong>, Apple Pay still requires a real card added to the Wallet for some flows; you can always test with card{" "}
            <code className="text-white/60">4242…</code> in Checkout.
          </li>
        </ol>
      </Panel>
    </div>
  );
}
