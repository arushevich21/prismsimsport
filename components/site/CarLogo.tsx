import Image from 'next/image'
import { carMake } from '@/lib/cars'

// Fixed height, width follows the logo, so tall crests and wide wordmarks both fill the chip.
const SIZES = {
  sm: { chip: 'h-8 px-1.5 py-1', img: 'max-w-[60px]', text: 'w-12' },
  md: { chip: 'h-10 px-2 py-[5px]', img: 'max-w-[76px]', text: 'w-16' },
}

// A maker's logo on a small white chip, so full-colour logos and crests read
// the same on dark and light backgrounds. Renders nothing for an unknown car.
export function CarLogo({ car, size = 'md' }: { car: string | null | undefined; size?: keyof typeof SIZES }) {
  const make = carMake(car)
  if (!make) return null
  const s = SIZES[size]
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md bg-white ${s.chip}`} title={make.name}>
      {make.logo ? (
        <Image src={make.logo.src} alt={make.name} width={make.logo.width} height={make.logo.height} className={`h-full w-auto object-contain ${s.img}`} />
      ) : (
        <span className={`text-center font-heading text-[8px] leading-tight font-bold tracking-wide text-ink uppercase ${s.text}`}>{make.name}</span>
      )}
    </span>
  )
}
