const graphQlOrganization = require('../fint-templates/organization')
const { aktivPeriode, repackAdresselinje, repackLeder, repackNavn } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganization = (fintOrganization, fixedOrgFlat, graphQlFlat) => {
  if ((!fixedOrgFlat && graphQlFlat) || (fixedOrgFlat && !graphQlFlat)) throw new Error('fixedOrgFlat and grahQlFlat must be either both set or both not set')

  const gyldighetsperiode = { ...fintOrganization.organisasjonselement.gyldighetsperiode, aktiv: aktivPeriode(fintOrganization.organisasjonselement.gyldighetsperiode) }
  let overordnet = null
  if (fintOrganization.organisasjonselement.overordnet.organisasjonsId.identifikatorverdi !== fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi) {
    let overordnetData = null
    if (fixedOrgFlat && graphQlFlat) {
      const correspondingFixedOrgUnit = fixedOrgFlat.find(unit => unit.organisasjonsId.identifikatorverdi === fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi)
      if (!correspondingFixedOrgUnit) throw new Error(`No corresponding unit with id ${fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi} found in fixedOrgFlat`)
      if (!correspondingFixedOrgUnit._links.overordnet || correspondingFixedOrgUnit._links.overordnet.length === 0) throw new Error(`No overordnet link found in corresponding unit with id ${fintOrganization.organisasjonselement.overordnet.organisasjonsId.identifikatorverdi} in fixedOrgFlat`)
      const fixedOrgOverordnetId = correspondingFixedOrgUnit._links.overordnet[0].href.split('/').pop()
      if (!fixedOrgOverordnetId) throw new Error(`No overordnet id found in overordnet href for unit with id ${fintOrganization.organisasjonselement.overordnet.organisasjonsId.identifikatorverdi} in fixedOrgFlat`)
      const correspondingGraphQlUnit = graphQlFlat.find(unit => unit.organisasjonsId.identifikatorverdi === fixedOrgOverordnetId)
      if (!correspondingGraphQlUnit) throw new Error(`No corresponding unit with id ${fixedOrgOverordnetId} found in graphQlFlat`)
      overordnetData = correspondingGraphQlUnit
    } else {
      overordnetData = fintOrganization.organisasjonselement.overordnet
    }
    const overordnetGyldighetsperiode = { ...overordnetData.gyldighetsperiode, aktiv: aktivPeriode(overordnetData.gyldighetsperiode) }
    overordnet = {
      organisasjonsId: overordnetData.organisasjonsId.identifikatorverdi,
      organisasjonsKode: overordnetData.organisasjonsKode.identifikatorverdi,
      aktiv: overordnetGyldighetsperiode.aktiv,
      gyldighetsperiode: overordnetGyldighetsperiode,
      navn: overordnetData.navn,
      kortnavn: overordnetData.kortnavn
    }
  }
  const unit = {
    aktiv: gyldighetsperiode.aktiv,
    organisasjonsId: fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi,
    organisasjonsKode: fintOrganization.organisasjonselement.organisasjonsKode.identifikatorverdi,
    navn: fintOrganization.organisasjonselement.navn,
    kortnavn: fintOrganization.organisasjonselement.kortnavn,
    gyldighetsperiode,
    kontaktEpostadresse: fintOrganization.organisasjonselement.kontaktinformasjon?.epostadresse || null,
    kontaktMobiltelefonnummer: fintOrganization.organisasjonselement.kontaktinformasjon?.mobiltelefonnummer || null,
    kontaktTelefonnummer: fintOrganization.organisasjonselement.kontaktinformasjon?.telefonnummer || null,
    kontaktNettsted: fintOrganization.organisasjonselement.kontaktinformasjon?.nettsted || null,
    postadresse: {
      adresselinje: repackAdresselinje(fintOrganization.organisasjonselement.postadresse?.adresselinje),
      postnummer: fintOrganization.organisasjonselement.postadresse?.postnummer || null,
      poststed: fintOrganization.organisasjonselement.postadresse?.poststed || null
    },
    forretningsadresse: { // Skal være tilsvarende enhetsregisteret
      adresselinje: repackAdresselinje(fintOrganization.organisasjonselement.forretningsadresse?.adresselinje),
      postnummer: fintOrganization.organisasjonselement.forretningsadresse?.postnummer || null,
      poststed: fintOrganization.organisasjonselement.forretningsadresse?.poststed || null
    },
    organisasjonsnavn: fintOrganization.organisasjonselement.organisasjonsnavn || null, // Skal være tilsvarende enhetsregisteret
    organisasjonsnummer: fintOrganization.organisasjonselement.organisasjonsnummer?.identifikatorverdi || null, // Skal være tilsvarende enhetsregisteret, men er stort sett til hovedorganisasjon
    leder: repackLeder(fintOrganization.organisasjonselement.leder),
    ansvar: fintOrganization.organisasjonselement.ansvar || [], // Veit itj om denne er eksponert
    overordnet,
    underordnet: [],
    arbeidsforhold: []
  }
  // Underordnet
  let underordnetToHandle = []
  if (fixedOrgFlat && graphQlFlat) {
    const correspondingFixedOrgUnit = fixedOrgFlat.find(unit => unit.organisasjonsId.identifikatorverdi === fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi)
    if (!correspondingFixedOrgUnit) throw new Error(`No corresponding unit with id ${fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi} found in fixedOrgFlat`)
    const fixedOrgUnderordnetLinks = correspondingFixedOrgUnit._links.underordnet || []
    for (const link of fixedOrgUnderordnetLinks) {
      if (!link.href) throw new Error('No href in underordnet link')
      const underordnetId = link.href.split('/').pop()
      if (!underordnetId) throw new Error(`No underordnet id found in underordnet href for unit with id ${fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi} in fixedOrgFlat`)
      const correspondingGraphQlUnit = graphQlFlat.find(unit => unit.organisasjonsId.identifikatorverdi === underordnetId)
      if (!correspondingGraphQlUnit) throw new Error(`No corresponding unit with id ${underordnetId} found in graphQlFlat`)
      underordnetToHandle.push(correspondingGraphQlUnit)
    }
  } else {
    underordnetToHandle = fintOrganization.organisasjonselement.underordnet
  }
  for (const underenhet of underordnetToHandle) {
    const underenhetGyldighetsperiode = { ...underenhet.gyldighetsperiode, aktiv: aktivPeriode(underenhet.gyldighetsperiode) }
    unit.underordnet.push({
      aktiv: underenhetGyldighetsperiode.aktiv,
      organisasjonsId: underenhet.organisasjonsId.identifikatorverdi,
      organisasjonsKode: underenhet.organisasjonsKode.identifikatorverdi,
      gyldighetsperiode: underenhetGyldighetsperiode,
      navn: underenhet.navn || null,
      kortnavn: underenhet.kortnavn || null
    })
  }
  // Arbeidsforhold
  for (const forhold of fintOrganization.organisasjonselement.arbeidsforhold) {
    const gyldighetsperiode = { ...forhold.gyldighetsperiode, aktiv: aktivPeriode(forhold.gyldighetsperiode) }
    const arbeidsforholdsperiode = { ...forhold.arbeidsforholdsperiode, aktiv: aktivPeriode(forhold.arbeidsforholdsperiode) }
    const ansettelsesperiode = { ...forhold.personalressurs.ansettelsesperiode, aktiv: aktivPeriode(forhold.personalressurs.ansettelsesperiode) }
    const aktiv = gyldighetsperiode.aktiv && arbeidsforholdsperiode.aktiv && ansettelsesperiode.aktiv
    const name = repackNavn(forhold.personalressurs.person?.navn)
    unit.arbeidsforhold.push({
      aktiv,
      systemId: forhold.systemId.identifikatorverdi,
      ansattnummer: forhold.personalressurs.ansattnummer.identifikatorverdi,
      navn: name.fulltnavn,
      fornavn: name.fornavn,
      etternavn: name.etternavn,
      gyldighetsperiode,
      arbeidsforholdsperiode,
      stillingstittel: forhold.stillingstittel,
      arbeidsforholdstype: forhold.arbeidsforholdstype,
      ansettelsesperiode
    })
  }
  return unit
}

const fintOrganization = async (identifikator, identifikatorverdi, context) => {
  logger('info', ['fintOrganization', 'Creating graph payload', identifikator, identifikatorverdi], context)
  const payload = graphQlOrganization(identifikator, identifikatorverdi)
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', identifikator, identifikatorverdi], context)
  const { data } = await fintGraph(payload)
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with ${identifikator} "${identifikatorverdi}" found in FINT`], context)
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', identifikator, identifikatorverdi], context)
  const repacked = repackOrganization(data)
  logger('info', ['fintOrganization', 'Repacked result', identifikator, identifikatorverdi])

  return { repacked, raw: data }
}

module.exports = { fintOrganization, repackOrganization }
