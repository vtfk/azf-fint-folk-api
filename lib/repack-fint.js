const aktivPeriode = (periode) => {
  const now = new Date() // Akkurat nu
  if (now > new Date(periode.start)) { // Sjekk først om perioden er senere enn start
    if (!periode.slutt) return true // Hvis ikke det finnes noen slutt er vi good
    if (new Date(periode.slutt).toString() === 'Invalid Date') return true // Hvis sluttdato ikke er gyldig får vi anta at vi er good
    if (now < new Date(periode.slutt)) return true // Hvis sluttdato ikke er nådd enda er vi også good
  }
  return false // Hvis den perioden har starta er den itj aktiv
}

const skoleElementIsAktiv = (skolear, termin) => {
  if (!skolear.gyldighetsperiode.aktiv) return false
  if (!termin.some(t => t.gyldighetsperiode.aktiv)) return false
  return true
}

const repackTermin = (termin) => {
  return termin.map(t => {
    const gyldighetsperiode = { ...t.gyldighetsperiode, aktiv: aktivPeriode(t.gyldighetsperiode) }
    return {
      ...t,
      gyldighetsperiode 
    }
  })
}

const repackSkolear = (skolear) => {
  return {
    ...skolear,
    gyldighetsperiode: { ...skolear.gyldighetsperiode, aktiv: aktivPeriode(skolear.gyldighetsperiode) }
  }
}

const repackNavn = (navn) => {
  if (!navn) return {
    fulltnavn: null,
    fornavn: null,
    etternavn: null
  }
  const mellomnavn = navn.mellomnavn && `${navn.mellomnavn.trim()}` ? ` ${navn.mellomnavn.trim()}` : ''
  const fornavn = `${navn.fornavn}${mellomnavn}`
  const fulltnavn = `${fornavn} ${navn.etternavn}`
  return {
    fulltnavn,
    fornavn,
    etternavn: navn.etternavn
  }
}

const repackAdresselinje = (adresselinje) => {
  if (!adresselinje) return null
  if (adresselinje.length === 1) return adresselinje[0]
  return adresselinje.filter(linje => linje).map(linje => linje.trim()).join(', ')
}

const createStruktur = (arbeidssted) => {
  const structure = []
  let current = arbeidssted
  const leder = current.leder || null
  structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, leder: current.leder ? { navn: repackNavn(current.leder.person.navn).fulltnavn, ansattnummer: current.leder.ansattnummer.identifikatorverdi } : null })
  while (current.overordnet.organisasjonsId.identifikatorverdi !== current.organisasjonsId.identifikatorverdi ) {
    current = current.overordnet
    structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, leder: current.leder ? { navn: repackNavn(current.leder.person.navn).fulltnavn, ansattnummer: current.leder.ansattnummer.identifikatorverdi } : null })
  }
  return structure
}

module.exports = { aktivPeriode, skoleElementIsAktiv, repackTermin, repackSkolear, repackNavn, repackAdresselinje, createStruktur }