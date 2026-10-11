"use client";

import { useState } from "react";
import Link from "@/components/SiteLink";
import Logo from "./Logo";
import { NAV_LINKS } from "@/lib/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header"><div className="nav-shell"><Logo /><span className="chain-label">BNB Chain</span><nav className="desktop-nav" aria-label="Primary navigation">{NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><Link className="nav-cta" href="/app">Open app</Link><button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}><span className="sr-only">Toggle navigation</span><span /><span /></button></div>{open && <nav id="mobile-menu" className="mobile-nav" aria-label="Mobile navigation">{NAV_LINKS.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}<Link href="/app" onClick={() => setOpen(false)}>Open app</Link></nav>}</header>
  );
}
