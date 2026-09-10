'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A labelled form control with its error wired to it.
 *
 * CLAUDE.md 7: form errors are associated with their inputs and announced. The
 * error carries an id referenced by aria-describedby, aria-invalid marks the
 * control, and the message sits in a live region so a screen reader hears it
 * when it appears rather than only on the next focus move.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
    'aria-required': boolean | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-primary text-sm font-medium">
        {label}
        {!required ? <span className="text-muted font-normal"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
      })}
      <p id={errorId} role="alert" className="text-status-down min-h-5 text-sm">
        {error ?? ''}
      </p>
    </div>
  );
}

export const controlClasses = cn(
  'border-line-strong bg-surface-raised text-primary w-full rounded-sm border px-3.5 py-2.5',
  'placeholder:text-muted transition-colors duration-150',
  'aria-[invalid=true]:border-status-down',
);

/**
 * A group of radio-style choices rendered as real radios.
 *
 * Native radios rather than buttons with aria-checked: arrow keys, the roving
 * focus and the group semantics all come free and correct, and this flow has to
 * be completable by keyboard alone (CLAUDE.md 7).
 */
export function ChoiceGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  columns = 1,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  value: string | null;
  onChange: (next: string) => void;
  error?: string | undefined;
  columns?: 1 | 2;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-primary text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          'mt-4 grid gap-2.5',
          columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {options.map((option) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-4 py-2.5',
                'transition-colors duration-150',
                checked
                  ? 'border-accent-text text-primary'
                  : 'border-line text-muted hover:border-line-strong hover:text-primary',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="accent-accent size-4 shrink-0"
              />
              <span className="text-sm">{option}</span>
            </label>
          );
        })}
      </div>
      <p id={errorId} role="alert" className="text-status-down mt-2 min-h-5 text-sm">
        {error ?? ''}
      </p>
    </fieldset>
  );
}
