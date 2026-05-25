import { Check, Loader2 } from "lucide-react";

type LoadingStepProps = {
  currentStep: number;
  step: number;
  label: string;
};

export default function LoadingStep({
  currentStep,
  step,
  label,
}: LoadingStepProps) {
  const completed = currentStep > step;
  const active = currentStep === step;

  return (
    <div className="flex items-center gap-4 py-4">

      {/* Status Icon */}

      <div
        className={`
          flex items-center justify-center
          w-9 h-9 rounded-full border
          transition-all duration-300

          ${
            completed
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"

              : active
              ? "bg-blue-500/10 border-blue-500 text-blue-400"

              : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }
        `}
      >

        {

          completed

          ?

          <Check size={18} />

          :

          active

          ?

          <Loader2
            size={18}
            className="animate-spin"
          />

          :

          <span className="text-sm">

            {step}

          </span>

        }

      </div>


      {/* Labels */}

      <div className="flex flex-col">

        <span
          className={`
            font-medium text-sm

            ${
              completed
                ? "text-emerald-400"

                : active

                ? "text-white"

                : "text-zinc-500"
            }
          `}
        >

          {label}

        </span>


        <span className="text-xs text-zinc-500">

          {

            completed

            ?

            "Completed"

            :

            active

            ?

            "In progress..."

            :

            "Waiting"

          }

        </span>

      </div>

    </div>
  );
}