// Shared class strings so buttons and section headings stay consistent.

const btnBase =
  'tap inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[15px] font-semibold transition-colors'

export const btn = {
  dark: `${btnBase} bg-ink text-white hover:bg-graphite-2`,
  ice: `${btnBase} bg-ice text-ink hover:bg-[#b5d3f6]`,
  iris: `${btnBase} bg-iris text-ink hover:bg-[#bcbef9]`,
  ember: `${btnBase} bg-ember text-ink hover:bg-[#ffc795]`,
  outlineDark: `${btnBase} border border-[#4a505b] text-white hover:border-white`,
  outlineLight: `${btnBase} border border-ink text-ink hover:bg-mist`,
}

export const eyebrow = 'font-mono text-xs tracking-[0.15em] uppercase'

export const h1 = 'font-heading text-[2.15rem] leading-[1.06] font-bold tracking-tight sm:text-5xl lg:text-[4.25rem]'
export const h2 = 'font-heading text-[1.75rem] leading-tight font-bold sm:text-4xl'

export const section = 'page-x py-16 sm:py-24'
