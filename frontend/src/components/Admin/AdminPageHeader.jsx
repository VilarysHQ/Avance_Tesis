export default function AdminPageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#173cff]">{eyebrow}</p>}
        <h1 className="text-[25px] font-extrabold tracking-[-0.035em] text-[#0b1739] sm:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
