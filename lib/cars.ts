// Car makes and their logos, matched from the free-text car name in a race
// lineup ("Isotta Fraschini TIPO 6 LMH" → Isotta Fraschini). Logos come from
// filippofilip95/car-logos-dataset and Wikimedia Commons, prepared for PRISM's
// dark backgrounds in public/cars/on-dark/ (crests keep their colours,
// everything else is white). A make without a logo shows its name instead.

export type CarMake = {
  name: string
  match: RegExp
  logo: { src: string; width: number; height: number } | null
}

const logo = (slug: string, width: number, height: number) => ({ src: `/cars/on-dark/${slug}.png`, width, height })

// First match wins, so more specific names come before broader ones.
const MAKES: CarMake[] = [
  { name: 'Corvette', match: /corvette|\bc8\b/i, logo: logo('chevrolet-corvette', 397, 200) },
  { name: 'Isotta Fraschini', match: /isotta|tipo ?6/i, logo: logo('isotta-fraschini', 125, 200) },
  { name: 'Oreca', match: /oreca|\b07\b/i, logo: logo('oreca', 480, 84) },
  { name: 'Aston Martin', match: /aston|vantage|valkyrie/i, logo: logo('aston-martin', 447, 200) },
  { name: 'Alpine', match: /alpine|a424/i, logo: logo('alpine', 376, 200) },
  { name: 'BMW', match: /\bbmw\b|m4 gt3|m hybrid|m8/i, logo: logo('bmw', 200, 200) },
  { name: 'Cadillac', match: /cadillac|v-series/i, logo: logo('cadillac', 480, 194) },
  { name: 'Ferrari', match: /ferrari|499p|296 gt3|488/i, logo: logo('ferrari', 125, 200) },
  { name: 'Lamborghini', match: /lamborghini|huracan|huracán|sc63/i, logo: logo('lamborghini', 174, 200) },
  { name: 'Peugeot', match: /peugeot|9x8/i, logo: logo('peugeot', 284, 200) },
  { name: 'Porsche', match: /porsche|\b963\b|\b911\b|992|991/i, logo: logo('porsche', 397, 200) },
  { name: 'Toyota', match: /toyota|gr010/i, logo: logo('toyota', 309, 200) },
  { name: 'Genesis', match: /genesis/i, logo: logo('genesis', 480, 186) },
  { name: 'Ligier', match: /ligier|js p3|js p320/i, logo: logo('ligier', 285, 200) },
  { name: 'Ginetta', match: /ginetta/i, logo: logo('ginetta', 200, 200) },
  { name: 'Ford', match: /\bford\b|mustang/i, logo: logo('ford', 480, 180) },
  { name: 'Lexus', match: /lexus|rc ?f/i, logo: logo('lexus', 480, 199) },
  { name: 'McLaren', match: /mclaren|720s|650s/i, logo: logo('mclaren', 480, 69) },
  { name: 'Mercedes-AMG', match: /mercedes|\bamg\b/i, logo: logo('mercedes-benz', 347, 200) },
  { name: 'Audi', match: /\baudi\b|\br8\b/i, logo: logo('audi', 480, 170) },
  { name: 'Bentley', match: /bentley|continental/i, logo: logo('bentley', 396, 200) },
  { name: 'Honda', match: /honda|acura|\bnsx\b/i, logo: logo('honda', 307, 200) },
  { name: 'Jaguar', match: /jaguar/i, logo: logo('jaguar', 444, 200) },
  { name: 'Nissan', match: /nissan|gt-r/i, logo: logo('nissan', 239, 200) },
  { name: 'Maserati', match: /maserati|mc20|mc gt4/i, logo: logo('maserati', 480, 195) },
  { name: 'KTM', match: /\bktm\b|x-bow/i, logo: logo('ktm', 480, 150) },
  { name: 'Reiter', match: /reiter/i, logo: logo('reiter', 184, 59) },
  { name: 'Glickenhaus', match: /glickenhaus|\bscg\b/i, logo: null },
  { name: 'Vanwall', match: /vanwall|vandervell/i, logo: null },
  { name: 'Duqueine', match: /duqueine|d08/i, logo: null },
  { name: 'Emil Frey', match: /emil frey/i, logo: null },
]

export function carMake(carName: string | null | undefined): CarMake | null {
  if (!carName) return null
  return MAKES.find((m) => m.match.test(carName)) ?? null
}
