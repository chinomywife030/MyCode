export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
    >
      <path
        d="M25 35 H75 V85 C75 90.5 70.5 95 65 95 H35 C29.5 95 25 90.5 25 85 V35 Z"
        fill="#3B82F6"
      />
      <path
        d="M35 35 V25 C35 16.7 41.7 10 50 10 C58.3 10 65 16.7 65 25 V35"
        stroke="#3B82F6"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M10 65 L40 55 L55 30 L65 30 L55 55 L85 65 L90 75 L55 70 L45 85 L35 80 L40 68 L15 75 Z"
        fill="#F97316"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
