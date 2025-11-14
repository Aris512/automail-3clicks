import * as React from "react"

export const AtIcon = React.memo(
  ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        width="24"
        height="24"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12V8.5C22 7.95 21.55 7.5 21 7.5C20.45 7.5 20 7.95 20 8.5V12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C14.93 4 17.5 5.57 18.6 8H20C20.55 8 21 7.55 21 7C21 6.45 20.55 6 20 6H18.6C17.5 3.57 14.93 2 12 2ZM12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
          fill="currentColor"
        />
      </svg>
    )
  }
)

AtIcon.displayName = "AtIcon"

