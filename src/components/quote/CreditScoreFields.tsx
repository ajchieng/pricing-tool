"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/inputs";
import {
  averageCreditScores,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  formatCreditScore,
  MAX_CREDIT_SCORES,
} from "@/lib/pricing/credit-scores";

export function CreditScoreFields({
  idPrefix,
  creditScores,
  onCreditScoresChange,
  error,
}: {
  idPrefix: string;
  creditScores: string[];
  onCreditScoresChange: (value: string[]) => void;
  error?: React.ReactNode;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const validScores = creditScores
    .filter((score) => score.trim() !== "")
    .map(Number)
    .filter(
      (score) =>
        Number.isInteger(score) &&
        score >= CREDIT_SCORE_MIN &&
        score <= CREDIT_SCORE_MAX,
    );
  const average = averageCreditScores(validScores);

  const changeScore = (index: number, value: string) => {
    onCreditScoresChange(
      creditScores.map((score, scoreIndex) =>
        scoreIndex === index ? value : score,
      ),
    );
  };

  const removeScore = (index: number) => {
    const remaining = creditScores.filter(
      (_, scoreIndex) => scoreIndex !== index,
    );
    const next = remaining.length > 0 ? remaining : [""];
    pendingFocusIndexRef.current = Math.min(index, next.length - 1);
    onCreditScoresChange(next);
  };

  const addScore = () => {
    if (creditScores.length >= MAX_CREDIT_SCORES) return;
    pendingFocusIndexRef.current = creditScores.length;
    onCreditScoresChange([...creditScores, ""]);
  };

  useEffect(() => {
    const index = pendingFocusIndexRef.current;
    if (index == null) return;
    pendingFocusIndexRef.current = null;
    inputRefs.current[index]?.focus();
  }, [creditScores.length]);

  return (
    <Field
      label="Credit scores"
      htmlFor={`${idPrefix}-0`}
      helper={`Enter each applicant’s Equifax score, ${CREDIT_SCORE_MIN}–${CREDIT_SCORE_MAX}. Pricing uses their arithmetic average.`}
      error={error}
      className="@md:col-span-2"
    >
      <div className="grid gap-2 @md:grid-cols-2">
        {creditScores.map((score, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <NumberInput
              id={`${idPrefix}-${index}`}
              inputRef={(element) => {
                inputRefs.current[index] = element;
              }}
              value={score}
              onChange={(value) => changeScore(index, value)}
              placeholder={index === 0 ? "720" : "Applicant score"}
              aria-label={`Credit score ${index + 1}`}
            />
            {creditScores.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                data-form-mutation
                onClick={() => removeScore(index)}
                aria-label={`Remove credit score ${index + 1}`}
                title="Remove score"
              >
                <X size={15} strokeWidth={2} aria-hidden />
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          data-form-mutation
          onClick={addScore}
          disabled={creditScores.length >= MAX_CREDIT_SCORES}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add another score
        </Button>
        {average != null && (
          <p className="text-sm text-muted" aria-live="polite">
            Pricing average{" "}
            <strong className="tnum font-semibold text-ink">
              {formatCreditScore(average)}
            </strong>
          </p>
        )}
      </div>
    </Field>
  );
}
