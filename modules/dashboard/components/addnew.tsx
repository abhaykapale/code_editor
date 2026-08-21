
"use client";

import { Button } from "@/components/ui/button"
import TemplateSelectionModal from "@/modules/modal/components/template-model";
// import { createPlayground } from "@/features/playground/actions";
import { Plus } from 'lucide-react'
import Image from "next/image"
import { useRouter } from "next/navigation";
import { title } from "process";
import { useState } from "react"
import { Interface } from "readline";
import { toast } from "sonner";
import { createPlayground } from "../actions";

interface Templates {
  title: string;
  template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
  description?: string;

}
const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Templates | null >(null)

  const router= useRouter()

  const handleSubmit= async (data : Templates ) =>{
      setSelectedTemplate(data)
      const res= await createPlayground(data)

    if (!res.success || !res.data?.id) {
        toast.error(res.error || "Something went wrong")
        return
    }

      setIsModalOpen(false)
      setSelectedTemplate(null)
      router.push(`/playground/${res?.data?.id}`)
      toast.success("Project created successfully")
    }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer
        transition-all duration-300 ease-in-out
        hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02]
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
      >
        <div className="flex flex-row justify-center items-start gap-4">
          <Button
            variant={"outline"}
            className="flex justify-center items-center bg-grey group-hover:bg-[#545252] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
            size={"icon"}
          >
            <Plus size={30} className="transition-transform duration-300 group-hover:rotate-90" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#f3eeee]">Add New</h1>
            <p className="text-sm text-muted-foreground max-w-[220px]"> Create  new playground</p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/add-new.svg"}
            alt="Create new playground"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

       {/* Todo Implement Template Selecting Model here */}
       <TemplateSelectionModal
       isOpen ={isModalOpen}
       onClose={()=> setIsModalOpen(false)}
       onSubmit={handleSubmit}
       />
    </>
  )
}
export default AddNewButton
