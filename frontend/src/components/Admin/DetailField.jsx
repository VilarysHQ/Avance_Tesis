export default function DetailField({
  label,
  value,
  highlight = false,
  clamp = false,
}) {
  const isEmpty = value === null || value === undefined || value === "";
  const display = isEmpty ? "No indicado" : String(value);

  return (
    <div className="flex items-start gap-2.5">
      <dt className="w-[92px] shrink-0 pt-0.5 text-[10px] font-semibold leading-4 text-slate-400">
        {label}
      </dt>
      <dd
        title={isEmpty ? undefined : display}
        className={`
          min-w-0
          flex-1
          text-[12.5px]
          leading-snug
          ${
            isEmpty
              ? "text-slate-400"
              : highlight
                ? "font-bold text-[#173cff]"
                : "font-semibold text-[#07112d]"
          }
          ${clamp ? "line-clamp-2 whitespace-pre-wrap" : ""}
        `}
      >
        {display}
      </dd>
    </div>
  );
}
