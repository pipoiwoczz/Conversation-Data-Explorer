export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-50 rounded-xl p-3 text-xs overflow-auto border border-zinc-100">
      <code className="font-mono leading-relaxed">{code}</code>
    </pre>
  );
}