const aktivPeriode = (periode) => {
  if (periode === null) return true // Hvis perioden ikke har data - anta den er aktiv
  const now = new Date() // Akkurat nu
  if (new Date(periode.start).toString() === 'Invalid Date') return false // Hvis startdato ikke er gyldig får vi anta at det ikke er aktivt
  if (now > new Date(periode.start)) { // Sjekk først om perioden er senere enn start
    if (!periode.slutt) return true // Hvis ikke det finnes noen slutt er vi good
    if (new Date(periode.slutt).toString() === 'Invalid Date') return true // Hvis sluttdato ikke er gyldig får vi anta at vi er good
    if (now < new Date(periode.slutt)) return true // Hvis sluttdato ikke er nådd enda er vi også good
  }
  return false // Hvis den perioden ikke har starta er den itj aktiv
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

const repackSkole = (skole, hovedskole) => {
  if (!skole) return null
  return {
    navn: skole.navn,
    kortnavn: skole.organisasjon.kortnavn,
    skolenummer: skole.skolenummer.identifikatorverdi,
    organisasjonsnummer: skole.organisasjonsnummer?.identifikatorverdi || null,
    organisasjonsId: skole.organisasjon.organisasjonsId.identifikatorverdi,
    hovedskole: skole.skolenummer.identifikatorverdi === hovedskole?.skolenummer
  }
}

const repackMiniSkole = (miniSkole, hovedskole) => {
  if (!miniSkole) return null
  return {
    navn: miniSkole.navn,
    skolenummer: miniSkole.skolenummer.identifikatorverdi,
    hovedskole: miniSkole.skolenummer.identifikatorverdi === hovedskole?.skolenummer
  }
}

const repackNavn = (navn) => {
  if (!navn) {
    return {
      fulltnavn: null,
      fornavn: null,
      etternavn: null
    }
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

const getAge = (fodselsdato) => {
  if (!fodselsdato) return null
  const today = new Date()
  const birthDate = new Date(fodselsdato)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const createStruktur = (arbeidssted) => {
  const structure = []
  let current = arbeidssted
  structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, organisasjonsKode: current.organisasjonsKode.identifikatorverdi, leder: current.leder ? { navn: repackNavn(current.leder.person.navn).fulltnavn, kontaktEpostadresse: current.leder.kontaktinformasjon?.epostadresse || null, ansattnummer: current.leder.ansattnummer.identifikatorverdi } : null })
  while (current.overordnet.organisasjonsId.identifikatorverdi !== current.organisasjonsId.identifikatorverdi) {
    current = current.overordnet
    structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, organisasjonsKode: current.organisasjonsKode.identifikatorverdi, leder: current.leder ? { navn: repackNavn(current.leder.person.navn).fulltnavn, kontaktEpostadresse: current.leder.kontaktinformasjon?.epostadresse || null, ansattnummer: current.leder.ansattnummer.identifikatorverdi } : null })
  }
  return structure
}

const getNarmesteLeder = (ansattnummer, strukturlinje) => {
  if (!strukturlinje.some(enhet => enhet.leder && (enhet.leder !== ansattnummer))) return null // Ingen ledere over her gitt... kanskje sette ordfører ellerno sjit
  const assumedLeader = strukturlinje[0].leder
  if (assumedLeader.ansattnummer === ansattnummer) {
    return strukturlinje[1].leder
  }
  return assumedLeader
}

module.exports = { aktivPeriode, skoleElementIsAktiv, repackTermin, repackSkolear, repackNavn, repackAdresselinje, createStruktur, repackSkole, repackMiniSkole, getAge, getNarmesteLeder }
