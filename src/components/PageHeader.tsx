export default function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-zinc-800 px-8 py-6">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
