"use client"

import { useState, useEffect, forwardRef } from "react"
import { toggleStarMark } from "@/modules/dashboard/actions"
import { StarIcon, StarOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
interface MarkedToggleButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  markedForRevision?: boolean
  id: string
}

export const MarkedToggleButton = forwardRef<HTMLButtonElement, MarkedToggleButtonProps>(
  ({ markedForRevision, id, onClick, className, children, ...props }, ref) => {
    const [isMarked, setIsMarked] = useState(markedForRevision ?? false)
    const router = useRouter()

    useEffect(() => {
      setIsMarked(markedForRevision ?? false)
    }, [markedForRevision])
    
    const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Forward the click to any parent handler (e.g. DropdownMenuItem)
      event.preventDefault()
      event.stopPropagation()
      onClick?.(event)
      const newMarkedState = !isMarked
      // Optimistic update
      setIsMarked(newMarkedState)

      try {
        const res = await toggleStarMark(id, newMarkedState)
        const { success, error, isMarked: serverMarked } = res

        if (success && !error) {
          toast.success(
            serverMarked
              ? "Added to Favorites"
              : "Removed from Favorites"
          )
          router.refresh()
        } else {
          // Revert optimistic update on failure
          setIsMarked(!newMarkedState)
          toast.error(error ?? "Something went wrong")
        }
      } catch {
        // Revert optimistic update on unexpected error
        setIsMarked(!newMarkedState)
        toast.error("Something went wrong")
      }
    }

    return (
            <Button
        ref={ref}
        variant="ghost"
        onClick={handleToggle}
        className={cn(
          "w-full justify-start gap-2",
          isMarked
            ? "text-yellow-400 hover:text-yellow-500"
            : "text-muted-foreground hover:text-yellow-400",
          className
        )}
        {...props}
      >
        {isMarked ? (
          <StarIcon className="h-4 w-4 fill-current" />
        ) : (
          <StarOffIcon className="h-4 w-4" />
        )}

        <span>
          {isMarked
            ? "Remove from Favorites"
            : "Add to Favorites"}
        </span>
      </Button>
    )
  }
)

MarkedToggleButton.displayName = "MarkedToggleButton"