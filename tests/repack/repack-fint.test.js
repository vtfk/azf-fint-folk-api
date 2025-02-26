const { aktivPeriode, repackLeder } = require('../../lib/helpers/repack-fint')

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
