import Link from "next/link";

export function Header() {
  return (
    <header className="shell site-header">
      <Link href="/" className="brand">
        Reddit AI Digest
      </Link>
      <nav className="top-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/themes/software-engineering">Themes</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
