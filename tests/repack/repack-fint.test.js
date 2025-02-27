const { aktivPeriode, repackLeder, createStruktur } = require('../../lib/helpers/repack-fint')

describe('aktivPeriode is aktiv when', () => {
  test('Sluttdato is null', () => {
    const periode = {
      start: '2019-08-01T00:00:00Z',
      slutt: null
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(true)
  })
  test('Sluttdato is false', () => {
    const periode = {
      start: '2019-08-01T00:00:00Z',
      slutt: false
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(true)
  })
  test('Sluttdato is invalid date', () => {
    const periode = {
      start: '2019-08-01T00:00:00Z',
      slutt: 'trompetsolo'
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(true)
  })
  test('Sluttdato is not reached', () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const periode = {
      start: '2019-08-01T00:00:00Z',
      slutt: tomorrow.toISOString()
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(true)
  })
})

describe('aktivPeriode is NOT aktiv when', () => {
  test('Sluttdato is reached', () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const periode = {
      start: '2019-08-01T00:00:00Z',
      slutt: yesterday.toISOString()
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(false)
  })
  test('Startdato is not reached yet', () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const periode = {
      start: tomorrow.toISOString(),
      slutt: false
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(false)
  })
  test('Startdato is invalid date', () => {
    const periode = {
      start: 'tubasolo',
      slutt: 'trompetsolo'
    }
    const aktiv = aktivPeriode(periode)
    expect(aktiv).toBe(false)
  })
})

describe('repackLeder work as excpected when', () => {
  test('there is no leder', () => {
    const leder = null
    const repackedLeder = repackLeder(leder)
    expect(repackedLeder).toEqual({
      ansattnummer: null,
      navn: null,
      fornavn: null,
      etternavn: null,
      kontaktEpostadresse: null
    })
  })
  test('there is a leder with some props missing', () => {
    const leder = {
      ansattnummer: {
        identifikatorverdi: '12345'
      },
      person: {
        navn: {
          fornavn: 'Arne',
          etternavn: 'Bjarne'
        }
      }
    }
    const repackedLeder = repackLeder(leder)
    expect(repackedLeder).toEqual({
      ansattnummer: '12345',
      navn: 'Arne Bjarne',
      fornavn: 'Arne',
      etternavn: 'Bjarne',
      kontaktEpostadresse: null
    })
  })
  test('there is a leder with all props', () => {
    const leder = {
      ansattnummer: {
        identifikatorverdi: '12345'
      },
      person: {
        navn: {
          fornavn: 'Arne',
          etternavn: 'Bjarne'
        }
      },
      kontaktinformasjon: {
        epostadresse: 'arne.bjarne@fylke.no'
      }
    }
    const repackedLeder = repackLeder(leder)
    expect(repackedLeder).toEqual({
      ansattnummer: '12345',
      navn: 'Arne Bjarne',
      fornavn: 'Arne',
      etternavn: 'Bjarne',
      kontaktEpostadresse: 'arne.bjarne@fylke.no'
    })
  })
})

describe('createStruktur works as expected when', () => {
  test('using fixedOrgFlat and graphQlFlat', () => {
    const fixedOrgFlat = [
      {
        organisasjonsId: { identifikatorverdi: '1' },
        navn: 'Fylke',
        _links: {
          overordnet: [{ href: '/organisasjonsid/1' }]
        }
      },
      {
        organisasjonsId: { identifikatorverdi: '2' },
        navn: 'Sektor',
        _links: {
          overordnet: [{ href: '/organisasjonsid/1' }]
        }
      },
      {
        organisasjonsId: { identifikatorverdi: '3' },
        navn: 'Seksjon',
        _links: {
          overordnet: [{ href: '/organisasjonsid/2' }]
        }
      },
      {
        organisasjonsId: { identifikatorverdi: '4' },
        navn: 'Team',
        _links: {
          overordnet: [{ href: '/organisasjonsid/3' }]
        }
      }
    ]
    const graphQlFlat = [
      {
        organisasjonsId: { identifikatorverdi: '1' },
        organisasjonsKode: { identifikatorverdi: '1' },
        navn: 'Fylke',
        kortnavn: null,
        leder: {
          person: { navn: { fornavn: 'Fylkes', etternavn: 'Leder' } },
          kontaktinformasjon: { epostadresse: 'fylkes.leder@fylke.no' },
          ansattnummer: { identifikatorverdi: '12345' }
        }
      },
      {
        organisasjonsId: { identifikatorverdi: '2' },
        organisasjonsKode: { identifikatorverdi: '2' },
        navn: 'Sektor',
        kortnavn: 'F-S',
        leder: {
          person: { navn: { fornavn: 'Sektor', etternavn: 'Leder' } },
          kontaktinformasjon: { epostadresse: 'sektor.leder@fylke.no' },
          ansattnummer: { identifikatorverdi: '12346' }
        }
      },
      {
        organisasjonsId: { identifikatorverdi: '3' },
        organisasjonsKode: { identifikatorverdi: '3' },
        kortnavn: 'F-S-S',
        navn: 'Seksjon',
        leder: null
      },
      {
        organisasjonsId: { identifikatorverdi: '4' },
        organisasjonsKode: { identifikatorverdi: '4' },
        navn: 'Team',
        kortnavn: 'F-S-S-T',
        leder: {
          person: { navn: { fornavn: 'Team', etternavn: 'Leder' } },
          kontaktinformasjon: { epostadresse: 'team.leder@fylke.no' },
          ansattnummer: { identifikatorverdi: '12348' }
        }
      }
    ]
    const shouldBeOk = createStruktur({ organisasjonsId: { identifikatorverdi: '4' } }, fixedOrgFlat, graphQlFlat)
    expect(shouldBeOk).toEqual([
      {
        kortnavn: 'F-S-S-T',
        navn: 'Team',
        organisasjonsId: '4',
        organisasjonsKode: '4',
        leder: {
          ansattnummer: '12348',
          navn: 'Team Leder',
          etternavn: 'Leder',
          fornavn: 'Team',
          kontaktEpostadresse: 'team.leder@fylke.no'
        }
      },
      {
        kortnavn: 'F-S-S',
        navn: 'Seksjon',
        organisasjonsId: '3',
        organisasjonsKode: '3',
        leder: {
          ansattnummer: null,
          navn: null,
          etternavn: null,
          fornavn: null,
          kontaktEpostadresse: null
        }
      },
      {
        kortnavn: 'F-S',
        navn: 'Sektor',
        organisasjonsId: '2',
        organisasjonsKode: '2',
        leder: {
          ansattnummer: '12346',
          navn: 'Sektor Leder',
          etternavn: 'Leder',
          fornavn: 'Sektor',
          kontaktEpostadresse: 'sektor.leder@fylke.no'
        }
      },
      {
        kortnavn: null,
        navn: 'Fylke',
        organisasjonsId: '1',
        organisasjonsKode: '1',
        leder: {
          ansattnummer: '12345',
          navn: 'Fylkes Leder',
          etternavn: 'Leder',
          fornavn: 'Fylkes',
          kontaktEpostadresse: 'fylkes.leder@fylke.no'
        }
      }
    ])
    const shouldAlsoBeOk = createStruktur({ organisasjonsId: { identifikatorverdi: '2' } }, fixedOrgFlat, graphQlFlat)
    expect(shouldAlsoBeOk.length).toBe(2)
    expect(shouldAlsoBeOk[0].navn).toBe('Sektor')
    const shouldAlsoAlsoBeOk = createStruktur({ organisasjonsId: { identifikatorverdi: '1' } }, fixedOrgFlat, graphQlFlat)
    expect(shouldAlsoAlsoBeOk.length).toBe(1)
    expect(shouldAlsoAlsoBeOk[0].navn).toBe('Fylke')
    const shouldThrow = () => createStruktur({ organisasjonsId: { identifikatorverdi: '5' } }, fixedOrgFlat, graphQlFlat)
    expect(shouldThrow).toThrow()
  })
})
