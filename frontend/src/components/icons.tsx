// Íconos dibujados con SVG (sin librerías). Son decorativos: el texto accesible
// lo pone siempre el botón o enlace que los contiene.

import type { SVGProps } from 'react'

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function PencilIcon() {
  return (
    <Icon>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </Icon>
  )
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Icon>
  )
}

export function ExternalLinkIcon() {
  return (
    <Icon>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  )
}

export function ArrowLeftIcon() {
  return (
    <Icon>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  )
}

/** Indica la dirección del orden de una columna. */
export function SortIcon({ direction }: { direction: 'ascending' | 'descending' | 'none' }) {
  return (
    <Icon width="14" height="14" strokeWidth="2.4">
      {direction === 'ascending' && <path d="M12 19V5M6 11l6-6 6 6" />}
      {direction === 'descending' && <path d="M12 5v14M6 13l6 6 6-6" />}
      {direction === 'none' && <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />}
    </Icon>
  )
}
