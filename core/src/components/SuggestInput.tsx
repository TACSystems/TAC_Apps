export default function SuggestInput({
  name,
  options,
  listId,
  placeholder,
  defaultValue,
  required,
  className,
}: {
  name: string;
  options: string[];
  listId: string;
  placeholder?: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}) {
  return (
    <>
      <input
        name={name}
        list={listId}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
        autoComplete="off"
        className={className ?? "border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
