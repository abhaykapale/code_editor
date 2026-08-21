
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import Image from "next/image"

const AddRepo = () => {
  return (
    <div
      className='group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer
      transition-all duration-300 ease-in-out
      hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02]
      shadow-[0_2px_10px_rgba(0,0,0,0.08)]
      hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]'>
      <div className='flex flex-row justify-center items-start gap-4'>
        <Button
          variant={"outline"}
          className='flex justify-center items-centerbg-grey group-hover:bg-[#545252] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300'
          size={"icon"}>
          <ArrowDown
            size={30}
            className='transition-transform duration-300 group-hover:translate-y-1'
          />
        </Button>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center rounded-md border border-[#e93f3f]/20 bg-[#e93f3f]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#e93f3f]'>
              Coming Soon
            </span>
          </div>

          <h2 className='text-xl font-semibold leading-tight tracking-tight text-white'>
            Open GitHub Repository
          </h2>

          <p className='max-w-[230px] text-sm leading-5 text-[#8f8986]'>
            Connect your GitHub repositories and work on them directly in the
            editor.
          </p>
        </div>
      </div>

      <div className='relative overflow-hidden'>
        <Image
          src={"/add-repo.svg"}
          alt='Open GitHub repository'
          width={150}
          height={150}
          className='transition-transform duration-300 group-hover:scale-110'
        />
      </div>
    </div>
  );
}

export default AddRepo


