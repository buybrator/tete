import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full bg-white text-black border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_black] px-3 py-2 text-sm font-medium transition-all duration-100 placeholder:text-gray-500 hover:shadow-[4px_4px_0px_0px_black] hover:translate-x-[-2px] hover:translate-y-[-2px] focus:outline-none focus:shadow-[4px_4px_0px_0px_#ff6b35] focus:border-[#ff6b35] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
