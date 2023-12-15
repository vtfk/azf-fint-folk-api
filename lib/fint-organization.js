const graphQlOrganization = require('../fint-templates/organization')
const { repackNavn, aktivPeriode, repackAdresselinje } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganization = (fintOrganization) => {
  const gyldighetsperiode = { ...fintOrganization.organisasjonselement.gyldighetsperiode, aktiv: aktivPeriode(fintOrganization.organisasjonselement.gyldighetsperiode) }
  const leaderName = repackNavn(fintOrganization.organisasjonselement.leder?.person?.navn)
  let overordnet = null
  if (fintOrganization.organisasjonselement.overordnet.organisasjonsId.identifikatorverdi !== fintOrganization.organisasjonselement.organisasjonsId.identifikatorverdi) {
    const overordnetGyldighetsperiode = { ...fintOrganization.organisasjonselement.overordnet.gyldighetsperiode, aktiv: aktivPeriode(fintOrganization.organisasjonselement.overordnet.gyldighetsperiode) }
    overordnet = {
      organisasjonsId: fintOrganization.organisasjonselement.overordnet.organisasjonsId.identifikatorverdi,
      organisasjonsKode: fintOrganization.organisasjonselement.overordnet.organisasjonsKode.identifikatorverdi,
      aktiv: overordnetGyldighetsperiode.aktiv,
      gyldighetsperiode: overordnetGyldighetsperiode,
      navn: fintOrganization.organisasjonselement.overordnet.navn,
      kortnavn: fintOrganization.organisasjonselement.overordnet.kortnavn
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
    leder: {
      ansattnummer: fintOrganization.organisasjonselement.leder?.ansattnummer?.identifikatorverdi || null,
      navn: leaderName.fulltnavn,
      fornavn: leaderName.fornavn,
      etternavn: leaderName.etternavn
    },
    ansvar: fintOrganization.organisasjonselement.ansvar || [], // Veit itj om denne er eksponert
    overordnet,
    underordnet: [],
    arbeidsforhold: []
  }
  // Underordnet
  for (const underenhet of fintOrganization.organisasjonselement.underordnet) {
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

const fintOrganization = async (identifikator, identifikatorverdi) => {
  logger('info', ['fintOrganization', 'Creating graph payload', identifikator, identifikatorverdi])
  const payload = graphQlOrganization(identifikator, identifikatorverdi)
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', identifikator, identifikatorverdi])
  const { data } = await fintGraph(payload)
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with ${identifikator} "${identifikatorverdi}" found in FINT`])
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', identifikator, identifikatorverdi])
  const repacked = repackOrganization(data)
  logger('info', ['fintOrganization', 'Repacked result', identifikator, identifikatorverdi])

  return { repacked, raw: data }
}

module.exports = { fintOrganization, repackOrganization }
