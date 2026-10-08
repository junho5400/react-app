export type Term = 'Fall' | 'Winter' | 'Spring';

interface TermSelectorProps {
  selectedTerm: Term;
  onTermChange: (term: Term) => void;
}

const terms: Term[] = ['Fall', 'Winter', 'Spring'];

export const TermSelector = ({ selectedTerm, onTermChange }: TermSelectorProps) => (
  <div className="mb-4 flex gap-2" role="group" aria-label="Select course term">
    {terms.map((term) => (
      <button
        key={term}
        type="button"
        aria-pressed={selectedTerm === term}
        onClick={() => onTermChange(term)}
        className={`rounded-md border px-4 py-2 text-sm font-medium ${
          selectedTerm === term
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
        }`}
      >
        {term}
      </button>
    ))}
  </div>
);
