const { aktivPeriode } = require('../../lib/helpers/repack-fint')

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