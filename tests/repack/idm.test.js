const { organizationFixed } = require("../../config");
const { getExceptionRules } = require("../../lib/fint-organization-fixed/exception-rules");
const { repackFintIdmEnheter } = require("../../lib/fint-organization-fixed/idm");
const { validateRawOrganizationUnits, validateExceptionRules } = require("../../lib/fint-organization-fixed/idm-validation");
const { createTestOrgUnit } = require("./test-org");

const createTestOrg = () => {
  const units = [
    {
      id: 'test-fylkeskommune-1', // Mangler correspondingBottomUnit
      overordnetId: 'test-fylkeskommune-1',
      underordnetIds: ['test-opplaring-11', 'test-tannhelse-12', 'test-organisasjon-13'],
      navn: 'Test Fylkeskommune',
      kortnavn: undefined
    },
    // Underordnet til test-fylkeskommune-1
    {
      id: 'test-opplaring-11',
      overordnetId: 'test-fylkeskommune-1',
      underordnetIds: ['test-opplaring-110', 'test-fellesvgs-111'],
      navn: 'Opplæring',
      kortnavn: undefined
    },
    {
      id: 'test-tannhelse-12',
      overordnetId: 'test-fylkeskommune-1',
      underordnetIds: ['test-tannhelse-120', 'test-tannklinikk-11'],
      navn: 'Tannhelse',
      kortnavn: undefined
    },
    {
      id: 'test-organisasjon-13',
      overordnetId: 'test-fylkeskommune-1',
      underordnetIds: ['test-organisasjon-130'],
      navn: 'Organisasjon',
      kortnavn: undefined
    },
    // Underordnet til test-opplaring-11
    {
      id: 'test-opplaring-110',
      overordnetId: 'test-opplaring-11',
      underordnetIds: ['test-opplaring-1100'],
      navn: 'Opplæring',
      kortnavn: undefined
    },
    {
      id: 'test-fellesvgs-111',
      overordnetId: 'test-opplaring-11',
      underordnetIds: ['test-fellesvgs-1111', 'test-fellesvgs-1110'], // Tuller med nextlink her - test-fellesvgs-1110 går til en skole - trengs nextLink regel
      navn: 'Felles VGS',
      kortnavn: undefined
    },
    // Underordnet til test-tannhelse-12
    {
      id: 'test-tannhelse-120',
      overordnetId: 'test-tannhelse-12',
      underordnetIds: ['test-tannhelse-1200'],
      navn: 'Tannhelse',
      kortnavn: undefined
    },
    {
      id: 'test-tannklinikk-11',
      overordnetId: 'test-tannhelse-12',
      underordnetIds: ['test-tannklinikk-110'],
      navn: 'Tannklinikk 1',
      kortnavn: undefined
    },
    // Underordnet til test-organisasjon-13
    {
      id: 'test-organisasjon-130',
      overordnetId: 'test-organisasjon-13',
      underordnetIds: ['test-organisasjon-1300', 'test-digi-1301', 'test-arkiv-1302'],
      navn: 'Organisasjon',
      kortnavn: undefined
    },
    // Underordnet til test-opplaring-110
    {
      id: 'test-opplaring-1100',
      overordnetId: 'test-opplaring-110',
      navn: 'Opplæring',
      kortnavn: 'OP'
    },
    // Underordnet til test-fellesvgs-111
    {
      id: 'test-fellesvgs-1110',
      overordnetId: 'test-fellesvgs-111',
      navn: 'Tull videregående skole',
      underordnetIds: ['test-fellesvgs-11100', 'test-fellesvgs-11101'],
      kortnavn: undefined
    },
    {
      id: 'test-fellesvgs-1111',
      overordnetId: 'test-fellesvgs-111',
      navn: 'Felles VGS',
      underordnetIds: ['test-fellesvgs-11110'],
      kortnavn: undefined
    },
    // Underordnet til test-tannhelse-120
    {
      id: 'test-tannhelse-1200',
      overordnetId: 'test-tannhelse-120',
      underordnetIds: ['test-tannhelse-12000'],
      navn: 'Tannhelse',
      kortnavn: undefined
    },
    // Underordnet til test-tannklinikk-11
    {
      id: 'test-tannklinikk-110',
      overordnetId: 'test-tannklinikk-11',
      underordnetIds: ['test-tannklinikk-1100'],
      navn: 'Tannklinikk 1',
      kortnavn: undefined
    },
    // Underordnet til test-organisasjon-130
    {
      id: 'test-organisasjon-1300',
      overordnetId: 'test-organisasjon-130',
      underordnetIds: ['test-organisasjon-13000'],
      navn: 'Organisasjon',
      kortnavn: undefined
    },
    {
      id: 'test-digi-1301',
      overordnetId: 'test-organisasjon-130',
      underordnetIds: ['test-digi-13010', 'test-utvkling-13011'],
      navn: 'Digitalisering',
      kortnavn: undefined
    },
    {
      id: 'test-arkiv-1302',
      overordnetId: 'test-organisasjon-130',
      underordnetIds: ['test-arkiv-13020'],
      navn: 'Arkiv',
      kortnavn: undefined
    },
    // Underordnet til test-fellesvgs-1110
    {
      id: 'test-fellesvgs-11100',
      overordnetId: 'test-fellesvgs-1110',
      navn: 'Tull videregående skole',
      kortnavn: 'OP-TVS'
    },
    {
      id: 'test-fellesvgs-11101',
      overordnetId: 'test-fellesvgs-1110',
      navn: 'Tull videregående skole - renhold',
      kortnavn: 'OP-TVS-REN'
    },
    // Underordnet til test-fellesvgs-1111
    {
      id: 'test-fellesvgs-11110',
      overordnetId: 'test-fellesvgs-1111',
      navn: 'Felles VGS',
      kortnavn: 'OP-FVGS'
    },
    // Underordnet til test-tannhelse-1200
    {
      id: 'test-tannhelse-12000',
      overordnetId: 'test-tannhelse-1200',
      navn: 'Tannhelse',
      kortnavn: 'TH'
    },
    // Underordnet til test-tannklinikk-110
    {
      id: 'test-tannklinikk-1100',
      overordnetId: 'test-tannklinikk-110',
      navn: 'Tannklinikk 1',
      kortnavn: 'TH-TK1'
    },
    // Underordnet til test-organisasjon-1300
    {
      id: 'test-organisasjon-13000',
      overordnetId: 'test-organisasjon-1300',
      navn: 'Organisasjon',
      kortnavn: 'ORG'
    },
    // Underordnet til test-digi-1301
    {
      id: 'test-digi-13010',
      overordnetId: 'test-digi-1301',
      navn: 'Digitalisering',
      kortnavn: 'ORG-DIGI'
    },
    {
      id: 'test-utvkling-13011',
      overordnetId: 'test-digi-1301',
      navn: 'Utvikling',
      kortnavn: 'ORG-DIGI-UTV'
    },
    // Underordnet til test-arkiv-1302
    {
      id: 'test-arkiv-13020',
      overordnetId: 'test-arkiv-1302',
      navn: 'Arkiv',
      kortnavn: 'ORG-ARK'
    }
  ]
  return units.map(unit => createTestOrgUnit(unit.id, unit.overordnetId, unit.underordnetIds, unit.navn, unit.kortnavn))
}

// OBS OBS tweak config max and min units settings!!!
organizationFixed.idmMinimumUnits = 0
organizationFixed.idmMaximumUnits = 1000

describe('createTestOrg', () => {
  test('Works', () => {
    const org = createTestOrg()
    expect(org).toBeDefined()
  })
  test('Is valid raw organizations', () => {
    const org = createTestOrg()
    const validationResult = validateRawOrganizationUnits(org)
    expect(validationResult.valid).toBe(true)
  })
})

describe('repackFintIdmEnheter works as expected when', () => {
  test('throws when arguments are missing', () => {
    const units = [];
    const shouldThrow = () => repackFintIdmEnheter(units);
    const shouldAlsoThrow = () => repackFintIdmEnheter([], [], undefined);
    expect(shouldThrow).toThrow();
    expect(shouldAlsoThrow).toThrow();
  }),
  test('test org is repacked, but has validation errors when no exceptions are defined', () => {
    const units = createTestOrg();
    const validationResult = validateRawOrganizationUnits(units);
    const repackResult = repackFintIdmEnheter(validationResult.tests.topUnits.data, validationResult.validUnits, getExceptionRules());
    console.log(JSON.stringify(repackResult.tests, null, 2));
    expect(repackResult.valid).toBe(false);
  })
})
