import { useState, type FormEvent } from "react";

type Props = {
  onSearch: (query: string) => void;
  loading: boolean;
};

export default function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(value);
  }

  return (
    <form onSubmit={submit} className="relative">
      <div className="group relative flex items-center rounded-2xl border border-hairline bg-glass backdrop-blur-xl transition-colors focus-within:border-primary/60">
        <span className="pl-4 text-faint">🔍</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask Aura anything…"
          className="flex-1 bg-transparent px-3 py-3.5 text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="m-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>
    </form>
  );
}
