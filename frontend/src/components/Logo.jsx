export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#3347E6" />
      <rect x="7" y="10" width="12" height="12" rx="3" fill="#fff" />
      <path d="M21 14.5l5-2.5v8l-5-2.5z" fill="#FFC84A" />
    </svg>
  );
}
