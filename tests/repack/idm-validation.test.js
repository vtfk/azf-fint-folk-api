const { organizationFixed, fint: { url } } = require('../../config')
const { validateRawOrganizationUnits, validateExceptionRules } = require('../../lib/fint-organization-fixed/idm-validation')

const createTestOrgUnit = (id, overordnetId, underordnetIds) => {
  if (!id) throw new Error('Missing required parameter "id"')
  if (id.split('-').length !== 3) throw new Error('Invalid id format')
  if (!overordnetId) throw new Error('Missing required parameter "overordnetId"')
  const unit = {
    organisasjonsId: {
      identifikatorverdi: id
    },
    navn: `Unit med id ${id}`,
    kortnavn: `U${id}`,
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

const createSimpleOrg = () => {
  const fakeOrg = [
    // First top unit
    {
      id: 'O-39006-hoved',
      overordnet: 'O-39006-hoved',
      underordnet: ['O-39006-1', 'O-39006-2']
    },
    {
      id: 'O-39006-1',
      overordnet: 'O-39006-hoved',
      underordnet: ['O-39006-10', 'O-39006-11']
    },
    {
      id: 'O-39006-10',
      overordnet: 'O-39006-1',
      underordnet: ['O-39006-100']
    },
    {
      id: 'O-39006-100',
      overordnet: 'O-39006-10',
      underordnet: ['O-39006-10000', 'O-39006-10001', 'O-39006-10002']
    },
    {
      id: 'O-39006-10000',
      overordnet: 'O-39006-100'
    },
    {
      id: 'O-39006-10001',
      overordnet: 'O-39006-100'
    },
    {
      id: 'O-39006-10002',
      overordnet: 'O-39006-100'
    },
    {
      id: 'O-39006-11',
      overordnet: 'O-39006-1',
      underordnet: ['O-39006-110']
    },
    {
      id: 'O-39006-110',
      overordnet: 'O-39006-11',
      underordnet: ['O-39006-11000']
    },
    {
      id: 'O-39006-11000',
      overordnet: 'O-39006-110'
    },
    // Second top unit
    {
      id: 'O-39006-A',
      overordnet: 'O-39006-A',
      underordnet: ['O-39006-SUP', 'O-39006-BALLE', 'O-39006-GUNNAR']
    },
    {
      id: 'O-39006-SUP',
      overordnet: 'O-39006-A'
    },
    {
      id: 'O-39006-BALLE',
      overordnet: 'O-39006-A'
    },
    {
      id: 'O-39006-GUNNAR',
      overordnet: 'O-39006-A'
    }
  ]
  return fakeOrg.map(unit => createTestOrgUnit(unit.id, unit.overordnet, unit.underordnet))
}

// OBS OBS tweak config max and min units settings!!!
organizationFixed.idmMinimumUnits = 0
organizationFixed.idmMaximumUnits = 1000

describe('validateRawOrganizationUnits works as expected when', () => {
  test('When all units are valid - returns valid and units', () => {
    const units = createSimpleOrg()
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(true)
    expect(validationResult.validUnits.length).toBe(units.length)
  })
  test('When all NOT empty units are valid - returns valid and units', () => {
    const units = createSimpleOrg()
    units.push({})
    units.push({})
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(true)
    expect(validationResult.validUnits.length).toBe(units.length - 2)
  })
  test('When some unit have not valid id format (x-x-x) - returns not valid and no units', () => {
    const units = createSimpleOrg()
    units[0].organisasjonsId.identifikatorverdi = 'O-39006'
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.invalidOrganisasjonsIdFormat.data)).toBe(true)
    expect(validationResult.tests.invalidOrganisasjonsIdFormat.data.length).toBe(1)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When some abstract unit have arbeidsforhold - returns not valid and no units', () => {
    const units = createSimpleOrg()
    const abstractUnit = units.find(unit => Array.isArray(unit._links.underordnet) && unit._links.underordnet.length > 0)
    abstractUnit._links.arbeidsforhold = [
      {
        href: `${url}/administrasjon/personal/arbeidsforhold/systemid/EM-39003-14027402-1-1~~20220815`
      }
    ]
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.abstractWithArbeidsforhold.data)).toBe(true)
    expect(validationResult.tests.abstractWithArbeidsforhold.data.length).toBe(1)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When some units are missing overordnet - returns not valid and no units', () => {
    const units = createSimpleOrg()
    delete units[0]._links.overordnet
    units[1]._links.overordnet = []
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.missingOverordnet.data)).toBe(true)
    expect(validationResult.tests.missingOverordnet.data.length).toBe(2)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When some units are missing self organisasjonsid link - returns not valid and no units', () => {
    const units = createSimpleOrg()
    delete units[3]._links.self
    units[4]._links.self = [{ href: 'tullball' }]
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.missingSelfOrgIdLink.data)).toBe(true)
    expect(validationResult.tests.missingSelfOrgIdLink.data.length).toBe(2)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When some units have broken parent relation link - returns not valid and no units', () => {
    const units = createSimpleOrg()
    delete units[3]._links.self
    units[4]._links.self = [{ href: 'tullball' }]
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.missingSelfOrgIdLink.data)).toBe(true)
    expect(validationResult.tests.missingSelfOrgIdLink.data.length).toBe(2)
    expect(validationResult.validUnits).toBe(null)
  })
})

describe('validateExceptionsRules works as expected when', () => {
  test('No exceptions are set - returns valid', () => {
    const units = createSimpleOrg()
    const validationResult = validateExceptionRules({}, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(0)
    expect(validationResult.valid).toBe(true)
  })
  test('All exceptions are set up correctly - returns valid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Unit med id O-39006-10001'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        }
      },
      allowNoCorrespondingBottomUnit: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100'
        }
      },
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(0)
    expect(validationResult.valid).toBe(true)
  })
  test('Exceptions have wrong id/key - returns invalid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006': {
          navn: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Unit med id O-39006-10001'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1-14': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        }
      },
      allowNoCorrespondingBottomUnit: {
        'O-39006-100-1': {
          navn: 'Unit med id O-39006-100'
        }
      },
      manualLeaders: {
        O: {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(4)
    expect(validationResult.valid).toBe(false)
  })
  test('Exceptions does not have correct name (on base unit) - returns invalid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-100': {
          navn: 'Unit med feil navn',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Unit med id O-39006-10001'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1': {
          navn: 'Unit som også har feil navn',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        }
      },
      allowNoCorrespondingBottomUnit: {
        'O-39006-100': {
          navn: 'Unit med feil navn jauda'
        }
      },
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-1000',
          leader: {
            href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(4)
    expect(validationResult.valid).toBe(false)
  })
  test('Exceptions does not have correct name (on child unit) - returns invalid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Child unit med feil navn'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med feil navn på child'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Enda et feil navn gitt'
            }
          ]
        },
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
              navn: 'Unit med id O-39006-10001'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Enda et feil navn gitt'
            }
          ]
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(3)
    expect(validationResult.valid).toBe(false)
  })
  test('Exceptions with childs that dont exist - returns invalid', () => {
    const units = createSimpleOrg()
    const unitToTweak = units.find(unit => unit.organisasjonsId.identifikatorverdi === 'O-39006-1')
    unitToTweak._links.underordnet.push({ href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-tut` })
    unitToTweak._links.underordnet.push({ href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-nejda` })
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-obs`,
            navn: 'Unit med id O-39006-10001'
          }
        },
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-nejda`,
            navn: 'Unit med id O-39006-11'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-tut`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(3)
    expect(validationResult.valid).toBe(false)
  })
  test('Exception unit is not found by key - returns invalid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-nope': {
          navn: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Unit med id O-39006-10001'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-gudda': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        }
      },
      allowNoCorrespondingBottomUnit: {
        'O-39006-bull': {
          navn: 'Unit med id O-39006-100'
        }
      },
      manualLeaders: {
        'O-39006-frogg': {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(4)
    expect(validationResult.valid).toBe(false)
  })
  test('Exceptions are malformed - returns invalid', () => {
    const units = createSimpleOrg()
    const exceptionsRules = {
      overrideNextProbableLink: {
        'O-39006-100': {
          navnebror: 'Unit med id O-39006-100',
          nextLink: {
            href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10001`,
            navn: 'Unit med id O-39006-10001'
          }
        }
      },
      absorbChildrenOverrides: {
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          absorbChildren: [
            {
              hrefii: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
              navn: 'Unit med id O-39006-10'
            },
            {
              href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-11`,
              navn: 'Unit med id O-39006-11'
            }
          ]
        },
        'O-39006-100': {
          navn: 'Unit med id O-39006-100'
        }
      },
      allowNoCorrespondingBottomUnit: {
        'O-39006-100': {
          navns: 'Unit med id O-39006-100'
        }
      },
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          leadder: {
            href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        },
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          leader: {
            hrefAA: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(6)
    expect(validationResult.valid).toBe(false)
  })
})
