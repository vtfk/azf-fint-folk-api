const { fint: { url } } = require('../../config')
const { getExceptionRules } = require('../../lib/fint-organization-fixed/exception-rules')

const createTestOrgUnit = (unit) => {
  if (!unit || typeof unit !== 'object') throw new Error('Missing required parameter object "unit"')
  const { id, overordnetId, underordnetIds, navn, kortnavn, leder, gyldighetsperiode } = unit
  if (!id) throw new Error('Missing required parameter "id"')
  if (id.split('-').length !== 3) throw new Error('Invalid id format')
  if (!overordnetId) throw new Error('Missing required parameter "overordnetId"')
  if (gyldighetsperiode && !gyldighetsperiode.start) throw new Error('Missing required parameter "gyldighetsperiode.start"')
  const testOrgUnit = {
    organisasjonsId: {
      identifikatorverdi: id
    },
    gyldighetsperiode: gyldighetsperiode || {
      start: '1990-01-01',
      slutt: null
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
  if (leder) {
    testOrgUnit._links.leder = [
      {
        href: `${url}/administrasjon/personal/personalressurs/ansattnummer/${leder}`
      }
    ]
  }
  if (underordnetIds && Array.isArray(underordnetIds) && underordnetIds.length > 0) {
    testOrgUnit._links.underordnet = underordnetIds.map(underordnetId => {
      return {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/${underordnetId}`
      }
    })
  } else {
    // Bottom level unit, add some arbeidsforhold and shortcode (if missing)
    testOrgUnit._links.arbeidsforhold = [
      {
        href: `${url}/administrasjon/personal/arbeidsforhold/systemid/EM-39003-14027402-1-1~~20220815`
      },
      {
        href: `${url}/administrasjon/personal/arbeidsforhold/systemid/EM-39003-14027402-1-1~~20220812`
      }
    ]
    testOrgUnit.kortnavn = testOrgUnit.kortnavn || `KORTNAVN-${id.split('-')[2]}`
  }
  return testOrgUnit
}

const getValidExcepttionRules = () => {
  const exceptionRules = getExceptionRules()
  exceptionRules.overrideNextProbableLink = {
    'test-fellesvgs-111': {
      navn: 'Felles VGS',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/test-fellesvgs-1111`,
        navn: 'Felles VGS'
      }
    }
  }
  exceptionRules.useAbstractAsUnitOverride = {
    'test-fylkeskommune-1': {
      navn: 'Test Fylkeskommune'
    },
    'annen-drit-112': {
      navn: 'Annen drit'
    }
  }
  exceptionRules.nameChainOverride = {
    'test-opplaring-11': {
      navn: 'Opplæring',
      allowedNameChain: ['Opplæring', 'Opplærings', 'Opplæring']
    }
  }
  return exceptionRules
}

const createAditroUnits = (units) => {
  if (!units || !Array.isArray(units)) throw new Error('Missing required parameter "units" as an array')
  const aditroUnits = new Map()
  // id navn
  for (const unit of units) {
    if (!unit.id || typeof unit.id !== 'string') {
      throw new Error('Invalid unit, missing or invalid id')
    }
    aditroUnits.set(unit.id, {
      lonnOrganizationId: unit.id,
      description: unit.navn || `Unit with lonnOrganizationId ${unit.id}`,
      projectDimension6Hours: {
        id: 'et-eller-annet',
        value: 'et-eller-annet',
        description: 'et-eller-annet'
      }
    })
  }
  return aditroUnits
}

module.exports = { createTestOrgUnit, getValidExcepttionRules, createAditroUnits }
