import { getStatusMeta } from "../../utils/quoteStatus";

export default function StatusBadge({ status }) {
  const { label, classes } = getStatusMeta(status);

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        gap-1.5
        px-2.5
        py-1
        text-[11px]
        font-semibold
        ${classes}
      `}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
