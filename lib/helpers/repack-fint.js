const aktivPeriode = (periode) => {
  if (!periode) return true // Hvis perioden ikke har data - anta den er aktiv
  const now = new Date() // Akkurat nu
  if (new Date(periode.start).toString() === 'Invalid Date') return false // Hvis startdato ikke er gyldig får vi anta at det ikke er aktivt
  if (now > new Date(periode.start)) { // Sjekk først om perioden er senere enn start
    if (!periode.slutt) return true // Hvis ikke det finnes noen slutt er vi good
    if (new Date(periode.slutt).toString() === 'Invalid Date') return true // Hvis sluttdato ikke er gyldig får vi anta at vi er good
    if (now < new Date(periode.slutt)) return true // Hvis sluttdato ikke er nådd enda er vi også good
  }
  // Midlertidig for skoleterminer som er inaktive i en dag mellom terminene...
  return false // Hvis den perioden ikke har starta er den itj aktiv
}

const skoleElementIsAktiv = (skolear, termin) => {
  if (!skolear.gyldighetsperiode.aktiv) return false
  // if (!termin.some(t => t.gyldighetsperiode.aktiv)) return false // Midlertidig fix (kanskje permanent - sjekk kun skoleåret - terminene overlapper ikke, de har en dag mellom hverandre som ikke er aktivt...)
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

const repackLeder = (leder) => {
  if (!leder) {
    return {
      ansattnummer: null,
      navn: null,
      fornavn: null,
      etternavn: null,
      kontaktEpostadresse: null
    }
  }
  const leaderName = repackNavn(leder.person?.navn)
  return {
    ansattnummer: leder.ansattnummer?.identifikatorverdi || null,
    navn: leaderName.fulltnavn,
    fornavn: leaderName.fornavn,
    etternavn: leaderName.etternavn,
    kontaktEpostadresse: leder.kontaktinformasjon?.epostadresse || null
  }
}

const createStruktur = (arbeidssted, fixedOrgFlat, graphQlFlat) => {
  if ((fixedOrgFlat && !graphQlFlat) || (!fixedOrgFlat && graphQlFlat)) throw new Error('createStruktur must have either both topUnitNested or graphQlFlatUnits, or none')
  if (fixedOrgFlat && graphQlFlat) {
    // If using fixedOrg structure
    const getOrgIdFromLink = (link) => {
      if (!link?.href) throw new Error('No href in link')
      const orgId = link.href.split('/').pop()
      if (!orgId) throw new Error('No orgId found in link')
      return orgId
    }
    const structureIds = []
    let current = fixedOrgFlat.find(unit => unit.organisasjonsId.identifikatorverdi === arbeidssted.organisasjonsId.identifikatorverdi)
    if (!current) throw new Error(`No unit with id ${arbeidssted.organisasjonsId.identifikatorverdi} found in fixedOrgFlat`)
    structureIds.push(current.organisasjonsId.identifikatorverdi)
    while (getOrgIdFromLink(current._links?.overordnet[0]) !== current.organisasjonsId.identifikatorverdi) {
      const overordnetId = getOrgIdFromLink(current._links?.overordnet[0])
      current = fixedOrgFlat.find(unit => unit.organisasjonsId.identifikatorverdi === overordnetId)
      if (!current) throw new Error(`No overordnet unit with id ${overordnetId} found in fixedOrgFlat`)
      structureIds.push(current.organisasjonsId.identifikatorverdi)
    }
    const structure = structureIds.map(id => {
      const correspondingUnit = graphQlFlat.find(unit => unit.organisasjonsId.identifikatorverdi === id)
      if (!correspondingUnit) throw new Error(`No corresponding unit with id ${id} found in graphQlFlat`)
      return {
        kortnavn: correspondingUnit.kortnavn,
        navn: correspondingUnit.navn,
        organisasjonsId: correspondingUnit.organisasjonsId.identifikatorverdi,
        organisasjonsKode: correspondingUnit.organisasjonsKode.identifikatorverdi,
        leder: repackLeder(correspondingUnit.leder)
      }
    })
    return structure
  } else {
    // If using org structure directly from FINT
    const structure = []
    let current = arbeidssted
    structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, organisasjonsKode: current.organisasjonsKode.identifikatorverdi, leder: repackLeder(current.leder) })
    while (current.overordnet.organisasjonsId.identifikatorverdi !== current.organisasjonsId.identifikatorverdi) {
      current = current.overordnet
      structure.push({ kortnavn: current.kortnavn, navn: current.navn, organisasjonsId: current.organisasjonsId.identifikatorverdi, organisasjonsKode: current.organisasjonsKode.identifikatorverdi, leder: repackLeder(current.leder) })
    }
    return structure
  }
}

const getNarmesteLeder = (ansattnummer, strukturlinje) => {
  if (!ansattnummer || typeof ansattnummer !== 'string') throw new Error('No ansattnummer provided for getNarmesteLeder...')
  if (!strukturlinje.some(enhet => enhet.leder && (enhet.leder.ansattnummer !== ansattnummer))) return null // Ingen ledere over her gitt... kanskje sette ordfører ellerno sjit
  const correctLeaderUnit = strukturlinje.find(enhet => enhet.leder && (enhet.leder.ansattnummer !== ansattnummer)) // Finn første enhet som har en leder, som ikke er den ansatte
  const narmesteLeder = correctLeaderUnit?.leder || null
  return narmesteLeder
}

module.exports = { aktivPeriode, skoleElementIsAktiv, repackTermin, repackSkolear, repackNavn, repackAdresselinje, createStruktur, repackSkole, repackMiniSkole, getAge, getNarmesteLeder, repackLeder }
