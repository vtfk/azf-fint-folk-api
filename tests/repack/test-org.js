const { organizationFixed, fint: { url } } = require('../../config')

const createTestOrgUnit = (id, overordnetId, underordnetIds, navn, kortnavn) => {
  if (!id) throw new Error('Missing required parameter "id"')
  if (id.split('-').length !== 3) throw new Error('Invalid id format')
  if (!overordnetId) throw new Error('Missing required parameter "overordnetId"')
  const unit = {
    organisasjonsId: {
      identifikatorverdi: id
    },
    navn: navn || `Unit med id ${id}`,
    kortnavn: kortnavn || null,
    organisasjonsKode: {
      identifikatorverdi: id.split('-')[2]
    },
    _links: {
      overordnet: [
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/${overordnetId}`
        }
      ],
      self: [
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/${id}`
        }
      ]
    }
  }
  if (underordnetIds && Array.isArray(underordnetIds) && underordnetIds.length > 0) {
    unit._links.underordnet = underordnetIds.map(underordnetId => {
      return {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/${underordnetId}`
      }
    })
  } else {
    // Bottom level unit, add some arbeidsforhold and shortcode
    unit._links.arbeidsforhold = [
      {
        href: `${url}/administrasjon/personal/arbeidsforhold/systemid/EM-39003-14027402-1-1~~20220815`
      },
      {
        href: `${url}/administrasjon/personal/arbeidsforhold/systemid/EM-39003-14027402-1-1~~20220812`
      }
    ]
    unit.kortnavn = `KORTNAVN-${id.split('-')[2]}`
  }
  return unit
}

module.exports = { createTestOrgUnit }