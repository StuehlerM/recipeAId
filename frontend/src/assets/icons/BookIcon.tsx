export default function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm0 2h14v14H4V4z" />
      <path d="M6 6h8v2H6V6zm0 4h8v2H6v-2zm0 4h8v2H6v-2z" />
    </svg>
  );
}
