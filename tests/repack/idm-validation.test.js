const { organizationFixed, fint: { url } } = require('../../config')
const { validateRawOrganizationUnits, validateExceptionRules } = require('../../lib/fint-organization-fixed/idm-validation')
const { createTestOrgUnit } = require('./test-org')

const createSimpleOrg = () => {
  const fakeOrg = [
    // First top unit
    {
      id: 'O-39006-hoved',
      overordnetId: 'O-39006-hoved',
      underordnetIds: ['O-39006-1']
    },
    {
      id: 'O-39006-1',
      overordnetId: 'O-39006-hoved',
      underordnetIds: ['O-39006-10', 'O-39006-11']
    },
    {
      id: 'O-39006-10',
      overordnetId: 'O-39006-1',
      underordnetIds: ['O-39006-100'],
      leder: '1234567'
    },
    {
      id: 'O-39006-100',
      overordnetId: 'O-39006-10',
      underordnetIds: ['O-39006-10000', 'O-39006-10001', 'O-39006-10002']
    },
    {
      id: 'O-39006-10000',
      overordnetId: 'O-39006-100'
    },
    {
      id: 'O-39006-10001',
      overordnetId: 'O-39006-100'
    },
    {
      id: 'O-39006-10002',
      overordnetId: 'O-39006-100'
    },
    {
      id: 'O-39006-11',
      overordnetId: 'O-39006-1',
      underordnetIds: ['O-39006-110']
    },
    {
      id: 'O-39006-110',
      overordnetId: 'O-39006-11',
      underordnetIds: ['O-39006-11000']
    },
    {
      id: 'O-39006-11000',
      overordnetId: 'O-39006-110'
    },
    // Second top unit
    {
      id: 'O-39006-A',
      overordnetId: 'O-39006-A',
      underordnetIds: ['O-39006-SUP', 'O-39006-BALLE', 'O-39006-GUNNAR']
    },
    {
      id: 'O-39006-SUP',
      overordnetId: 'O-39006-A'
    },
    {
      id: 'O-39006-BALLE',
      overordnetId: 'O-39006-A'
    },
    {
      id: 'O-39006-GUNNAR',
      overordnetId: 'O-39006-A'
    }
  ]
  return fakeOrg.map(unit => createTestOrgUnit(unit))
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
  test('When some units have itself as a child - returns valid and removes the relation to itself as a child', () => {
    const units = createSimpleOrg()
    const unitToModify = units.find(unit => unit.organisasjonsId.identifikatorverdi === 'O-39006-1')
    const selfLink = unitToModify._links.self[0].href
    unitToModify._links.underordnet.push({ href: selfLink })
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(true)
    expect(Array.isArray(validationResult.tests.haveItselfAsChild.data)).toBe(true)
    expect(validationResult.tests.haveItselfAsChild.data.length).toBe(1)
    const validatedModifiedUnit = units.find(unit => unit.organisasjonsId.identifikatorverdi === 'O-39006-1')
    expect(validatedModifiedUnit._links.underordnet.some(link => link.href === selfLink)).toBe(false)
    expect(validationResult.validUnits.length).toBe(units.length)
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
  test('When some units have broken child relation link - returns valid and units - AND returns the units with broken child relation in validation', () => {
    const units = createSimpleOrg()
    const brokenTopUnit = createTestOrgUnit({ id: 'O-39006-YOYO', overordnetId: 'O-39006-YOYO', underordnetIds: ['O-39006-finnesikke', 'O-39006-Oisann'] })
    const brokenRegularUnit = createTestOrgUnit({ id: 'O-39006-Oisann', overordnetId: 'O-39006-YOYO', underordnetIds: ['O-39006-finneshellerikke'] })
    units.push(brokenTopUnit)
    units.push(brokenRegularUnit)
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(true)
    expect(Array.isArray(validationResult.tests.brokenChildRelation.data)).toBe(true)
    expect(validationResult.tests.brokenChildRelation.data.length).toBe(2)
    expect(validationResult.validUnits.length).toBe(units.length - 2)
  })
  test('When some units have broken parent relation link - returns not valid and no units', () => {
    const units = createSimpleOrg()
    units[2]._links.overordnet[0].href = `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/bullshit`
    units[7]._links.underordnet = [{ href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/korok` }]
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.brokenParentRelation.data)).toBe(true)
    expect(validationResult.tests.brokenParentRelation.data.length).toBe(2)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When no top units are present - returns not valid and no units', () => {
    const units = createSimpleOrg()
    units.shift() // Remove first top unit (index 0)
    const secondTopUnit = units.find(unit => unit.organisasjonsId.identifikatorverdi === 'O-39006-A')
    secondTopUnit._links.overordnet = []
    const validationResult = validateRawOrganizationUnits(units)
    expect(validationResult.valid).toBe(false)
    expect(Array.isArray(validationResult.tests.topUnits.data)).toBe(true)
    expect(validationResult.tests.topUnits.data.length).toBe(0)
    expect(validationResult.validUnits).toBe(null)
  })
  test('When a unit points to expired child - returns valid, but expired link and expired unit is removed', () => {
    const units = createSimpleOrg()
    const parentUnit = createTestOrgUnit({ id: 'O-39006-PARENT', overordnetId: 'O-39006-PARENT', underordnetIds: ['O-39006-EXPIRED', 'O-39006-NOTEXPIRED'] })
    const expiredChild = createTestOrgUnit({ id: 'O-39006-EXPIRED', overordnetId: 'O-39006-PARENT', gyldighetsperiode: { start: '1990-01-01', slutt: '1991-01-01' } })
    const rightNow = new Date()
    const tomorrow = new Date(rightNow.setDate(rightNow.getDate() + 1))
    const notExpiredChild = createTestOrgUnit({ id: 'O-39006-NOTEXPIRED', overordnetId: 'O-39006-PARENT', gyldighetsperiode: { start: '1990-01-01', slutt: tomorrow.toISOString() } })
    units.push(parentUnit, expiredChild, notExpiredChild)
    const validationResult = validateRawOrganizationUnits(units)

    expect(parentUnit._links.underordnet.some(link => link.href === expiredChild._links.self[0].href)).toBe(false)
    expect(validationResult.valid).toBe(true)
    expect(validationResult.tests.expiredUnits.data.length).toBe(1)
    expect(validationResult.tests.relationToExpiredChild.data.length).toBe(1)
    expect(validationResult.validUnits.length).toBe(units.length - 1)
  })
  test('When a unit points to expired parent - returns not valid and no units', () => {
    const units = createSimpleOrg()
    const expiredParentUnit = createTestOrgUnit({ id: 'O-39006-EXPPARENT', overordnetId: 'O-39006-EXPPARENT', underordnetIds: ['O-39006-NOTEXPIRED'], gyldighetsperiode: { start: '1990-01-01', slutt: '1991-01-01' } })
    const rightNow = new Date()
    const tomorrow = new Date(rightNow.setDate(rightNow.getDate() + 1))
    const notExpiredChild = createTestOrgUnit({ id: 'O-39006-NOTEXPIRED', overordnetId: 'O-39006-EXPPARENT', gyldighetsperiode: { start: '1990-01-01', slutt: tomorrow.toISOString() } })
    units.push(expiredParentUnit, notExpiredChild)
    const validationResult = validateRawOrganizationUnits(units)

    expect(validationResult.valid).toBe(false)
    expect(validationResult.tests.expiredUnits.data.length).toBe(1)
    expect(validationResult.tests.relationToExpiredParent.data.length).toBe(1)
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
      useAbstractAsUnitOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100'
        }
      },
      nameChainOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          allowedNameChain: ['tutu', 'assasa']
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
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
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
  test('There exists a unknown rule name - returns invalid', () => {
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
      useAbstractAsUnitOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100'
        }
      },
      brainChainOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100'
        }
      },
      nameChainOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          allowedNameChain: ['tutu', 'assasa']
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
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(1)
    expect(validationResult.valid).toBe(false)
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
      useAbstractAsUnitOverride: {
        'O-39006-100-io-ui': {
          navn: 'Unit med id O-39006-100'
        }
      },
      nameChainOverride: {
        'O-39006-100-aiaia': {
          navn: 'Unit med id O-39006-100',
          allowedNameChain: ['tutu', 'assasa']
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
      manualLeaders: {
        O: {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(5)
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
      useAbstractAsUnitOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100ogti'
        }
      },
      nameChainOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100nei',
          allowedNameChain: ['tutu', 'assasa']
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
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-1000',
          leader: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(5)
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
      useAbstractAsUnitOverride: {
        'O-39006-100ogti': {
          navn: 'Unit med id O-39006-100'
        }
      },
      nameChainOverride: {
        'O-39006-100hei': {
          navn: 'Unit med id O-39006-100',
          allowedNameChain: ['tutu', 'assasa']
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
      manualLeaders: {
        'O-39006-frogg': {
          navn: 'Unit med id O-39006-100',
          leader: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(5)
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
      useAbstractAsUnitOverride: {
        'O-39006-100': {
          navns: 'Unit med id O-39006-100'
        }
      },
      nameChainOverride: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          allowedBlameChain: ['tutu', 'assasa']
        },
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          allowedNameChain: 'sasasa'
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
      manualLeaders: {
        'O-39006-100': {
          navn: 'Unit med id O-39006-100',
          leadder: {
            href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        },
        'O-39006-1': {
          navn: 'Unit med id O-39006-1',
          leader: {
            hrefAA: `${url}/administrasjon/personal/personalressurs/ansattnummer/1234567`
          }
        }
      }
    }
    const validationResult = validateExceptionRules(exceptionsRules, units)
    // console.log(validationResult)
    expect(Array.isArray(validationResult.invalidRules)).toBe(true)
    expect(validationResult.invalidRules.length).toBe(8)
    expect(validationResult.valid).toBe(false)
  })
})
