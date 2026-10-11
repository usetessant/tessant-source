type Props = { className?: string; title?: string };

export default function TessantSymbol({ className = "", title = "Tessant" }: Props) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label={title}>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="currentColor" />
      <path d="M9 13.5h9M22 13.5h9M9 26.5h9M22 26.5h9" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M17.5 9v22M22.5 9v22" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 20h7.5M22.5 20H30" stroke="#F0B90B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.4" fill="white" />
    </svg>
  );
}
