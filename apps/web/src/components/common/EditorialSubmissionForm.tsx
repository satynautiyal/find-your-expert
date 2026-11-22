'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import DropdownSelect from './DropdownSelect';

export interface FormFieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface EditorialSubmissionFormProps {
  heading: string;
  description?: string;
  submitLabel: string;
  successMessage: string;
  fields: FormFieldSpec[];
}

export default function EditorialSubmissionForm({
  heading,
  description,
  submitLabel,
  successMessage,
  fields,
}: EditorialSubmissionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === 'select' && f.options?.[0]) {
        init[f.name] = f.options[0];
      }
    }
    return init;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-6 text-center space-y-2.5">
        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-950">Request Received</h3>
        <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto">
          {successMessage}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-xs font-bold text-[#0F3E35] underline pt-1 cursor-pointer"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-[#FAFBF9] border border-gray-200 p-5 sm:p-6 space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-gray-950">{heading}</h3>
        {description && (
          <p className="text-xs sm:text-[13px] text-gray-600">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {fields.map((field) => {
          const isWide = field.type === 'textarea' || field.name === 'profileUrl';
          return (
            <div
              key={field.name}
              className={isWide ? 'sm:col-span-2 space-y-1' : 'space-y-1'}
            >
              <label
                htmlFor={field.name}
                className="block text-xs font-bold text-gray-800"
              >
                {field.label}
                {field.required && <span className="text-rose-500 ml-0.5">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  rows={4}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
                />
              ) : field.type === 'select' ? (
                <>
                  <input
                    type="hidden"
                    name={field.name}
                    value={selectValues[field.name] || field.options?.[0] || ''}
                  />
                  <DropdownSelect
                    value={selectValues[field.name] || field.options?.[0] || ''}
                    onChange={(val) =>
                      setSelectValues((prev) => ({ ...prev, [field.name]: val }))
                    }
                    options={(field.options || []).map((opt) => ({
                      label: opt,
                      value: opt,
                    }))}
                    ariaLabel={field.label}
                    triggerClassName="w-full py-2.5 px-3.5 text-xs sm:text-sm font-medium"
                  />
                </>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F3E35] hover:bg-[#0A2C25] text-white text-xs sm:text-sm font-bold px-5 py-2.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
