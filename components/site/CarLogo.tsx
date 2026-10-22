import Image from 'next/image'
import { carMake } from '@/lib/cars'

// Fixed height, width follows the logo, so tall crests and wide wordmarks both fit.
const SIZES = {
  sm: { box: 'h-7', img: 'max-w-[64px]', text: 'text-[9px]' },
  md: { box: 'h-9', img: 'max-w-[84px]', text: 'text-[10px]' },
}

// A maker's logo, drawn straight onto the dark background (crests in colour,
// the rest in white). Renders nothing for an unknown car.
export function CarLogo({ car, size = 'md' }: { car: string | null | undefined; size?: keyof typeof SIZES }) {
  const make = carMake(car)
  if (!make) return null
  const s = SIZES[size]
  return (
    <span className={`flex shrink-0 items-center ${s.box}`} title={make.name}>
      {make.logo ? (
        <Image src={make.logo.src} alt={make.name} width={make.logo.width} height={make.logo.height} className={`h-full w-auto object-contain ${s.img}`} />
      ) : (
        <span className={`font-heading leading-tight font-bold tracking-wide text-white/80 uppercase ${s.text}`}>{make.name}</span>
      )}
    </span>
  )
}
