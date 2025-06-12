"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_black] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#ff6b35] data-[state=checked]:shadow-[2px_2px_0px_0px_black] data-[state=unchecked]:bg-white",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 bg-black border border-black rounded-full shadow-sm ring-0 transition-transform duration-100 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1 data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-700"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
