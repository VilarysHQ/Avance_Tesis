export default function CompactSectionCard({
  icon: Icon,
  title,
  children,
  className = "",
  contentClassName = "space-y-2",
}) {
  return (
    <section className={`h-fit rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.025)] sm:p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-lg
            bg-blue-50
            text-[#173cff]
          "
        >
          {Icon && <Icon size={14} />}
        </span>
        <h3 className="text-[12.5px] font-bold text-[#07112d]">{title}</h3>
      </div>

      <dl className={contentClassName}>{children}</dl>
    </section>
  );
}
