/*
const organisasjonselementer = require('./fint-organisasjonsenheter.json')
const { writeFileSync, cp } = require('fs')

const allUnits = organisasjonselementer._embedded._entries

// Key is organisasjonsId in links on over/underordnet
const getUnitFromLink = (unitLink, units) => {
  const matchingUnits = units.filter(enhet => enhet._links.self.some(link => link.href === unitLink))
  if (matchingUnits.length > 1) {
    throw new Error(`More than one unit found for link ${unitLink}`)
  }
  if (matchingUnits.length === 0) {
    throw new Error(`No unit found for link ${unitLink}`)
  }
  return matchingUnits[0]
}

let enheter = allUnits
// First we clean up all units that have some weird data
const missingOrganisasjonsId = allUnits.filter(enhet => !enhet.organisasjonsId || !enhet.organisasjonsId.identifikatorverdi || enhet.organisasjonsId.identifikatorverdi.length === 0) // Sjekk hvor mange tomme det er
enheter = enheter.filter(enhet => enhet.organisasjonsId && enhet.organisasjonsId.identifikatorverdi && enhet.organisasjonsId.identifikatorverdi.length > 0) // Fjern tomme
const missingOverordnet =  enheter.filter(enhet => !Array.isArray(enhet._links?.overordnet) || enhet._links.overordnet.length === 0)
enheter = enheter.filter(enhet => !missingOverordnet.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter uten overordnet
const missingSelfOrgIdLink = enheter.filter(enhet => !enhet._links.self.some(link => link.href.includes('organisasjonsid')))
enheter = enheter.filter(enhet => !missingSelfOrgIdLink.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter uten self link med organisasjonsid
const brokenParentRelation = enheter.filter(enhet => {
  const parentLink = enhet._links.overordnet[0].href
  try {
    const parentUnit = getUnitFromLink(parentLink, enheter)
    const selfLink = enhet._links.self.find(link => link.href.includes('organisasjonsid'))
    if (selfLink.href === parentLink) return false // Parent is self (top-level)
    return !parentUnit._links.underordnet.some(link => link.href === selfLink.href)
  } catch (error) {
    console.log(error)
    return true // Parent not found
  }
})
enheter = enheter.filter(enhet => !brokenParentRelation.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter med ødelagt parent relation

const malformedUnits = {
  missingOrganisasjonsId,
  missingOverordnet,
  missingSelfOrgIdLink,
  brokenParentRelation,
  correspondingBottomUnitMissing: [],
  correspondingBottomUnitDifferentName: []
}

// writeFileSync('./ignore/malformedUnits.json', JSON.stringify(malformedUnits, null, 2)) // Skriv til fil

const topUnits = enheter.filter(enhet => enhet._links.overordnet.some(link => enhet._links.self.some(selfLink => selfLink.href === link.href))) // Finn enheter som er toppenheter
console.log('Top units', topUnits.length)
writeFileSync('./ignore/topUnits.json', JSON.stringify(topUnits, null, 2)) // Skriv til fil

const resultingUnits = []
const unitsToHandle = []

const handleUnit = (unit) => {
  let correspondingBottomUnit = unit
  while (Array.isArray(correspondingBottomUnit._links.underordnet) && correspondingBottomUnit._links.underordnet.length > 0) {
    const selfOrgIdLink = correspondingBottomUnit._links.self.find(link => link.href.includes('organisasjonsid'))
    let nextLevelProbableLink = `${selfOrgIdLink.href}0`
    if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
      nextLevelProbableLink = `${selfOrgIdLink.href}00`
    }
    if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
      malformedUnits.correspondingBottomUnitMissing.push(unit)
      break
    }
    correspondingBottomUnit = getUnitFromLink(nextLevelProbableLink, enheter)
  }
  if (correspondingBottomUnit.navn !== unit.navn) {
    if (!(correspondingBottomUnit.navn.toLowerCase().endsWith('vgs') && unit.navn.toLowerCase().endsWith('videregående skole'))) {
      malformedUnits.correspondingBottomUnitDifferentName.push({ unit, differentName: { navn: correspondingBottomUnit.navn, organisasjonsId: correspondingBottomUnit.organisasjonsId.identifikatorverdi } })
    } else {
      // console.log('Ignoring different name', unit.navn, correspondingBottomUnit.navn)
    }
  }
  const startUnit = {
    organisasjonsId: unit.organisasjonsId,
    navn: unit.navn,
    // underordnet: unit._links.underordnet || []
  }
  const correspondingBottomUnitResult = {
    organisasjonsId: correspondingBottomUnit.organisasjonsId,
    navn: correspondingBottomUnit.navn,
    // underordnet: correspondingBottomUnit._links.underordnet || [] 
  }
  if (resultingUnits.some(ferdigEnhet => correspondingBottomUnit.organisasjonsId.identifikatorverdi === ferdigEnhet.correspondingBottomUnitResult.organisasjonsId.identifikatorverdi)) {
    // console.log(correspondingBottomUnitResult.organisasjonsId.identifikatorverdi, 'already in resultingUnits')
    return
  }
  resultingUnits.push({ startUnit, correspondingBottomUnitResult })
  // resultingUnits.push({ startUnit: unit, correspondingBottomUnit })
}

// And then we go from top units and down - with some fancy rules
for (const topUnit of topUnits) {
  if (topUnit.navn === 'Øverste nivå') continue // Skip this one for now
  for (const underordnetLink of topUnit._links.underordnet) {
    const underordnetUnit = getUnitFromLink(underordnetLink.href, enheter)
    handleUnit(underordnetUnit)
    for (const underordnetLink2 of underordnetUnit._links.underordnet) {
      const underordnetUnit2 = getUnitFromLink(underordnetLink2.href, enheter)
      handleUnit(underordnetUnit2)
      for (const underordnetLink3 of underordnetUnit2._links.underordnet) {
        const underordnetUnit3 = getUnitFromLink(underordnetLink3.href, enheter)
        handleUnit(underordnetUnit3)
        for (const underordnetLink4 of underordnetUnit3._links.underordnet) {
          const underordnetUnit4 = getUnitFromLink(underordnetLink4.href, enheter)
          handleUnit(underordnetUnit4)
          for (const underordnetLink5 of (underordnetUnit4._links.underordnet || [])) {
            const underordnetUnit5 = getUnitFromLink(underordnetLink5.href, enheter)
            handleUnit(underordnetUnit5)
          }
        }
      }
    }
  }
}

console.log('Resulting units', resultingUnits.length)
writeFileSync('./ignore/resultingUnits.json', JSON.stringify(resultingUnits, null, 2)) // Skriv til fil
writeFileSync('./ignore/malformedUnits.json', JSON.stringify(malformedUnits, null, 2)) // Skriv til fil

const overrideNextProbableLink = {
  'O-39003-41': {
    navn: 'VGS Felles',
    nextLink: {
      href: 'https://api.felleskomponent.no/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-401',
      navn: 'VGS Felles'
    }
  },
  'O-39003-43': {
    navn: 'Voksenopplæring og karriereutvikling',
    nextLink: {
      href: 'https://api.felleskomponent.no/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-439',
      navn: 'Voksenopplæring og karriereutvikling'
    }
  },
  'O-39003-35': {
    navn: 'Hovedtillitsvalgte',
    nextLink: {
      href: 'https://api.felleskomponent.no/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-335',
      navn: 'Hovedtillitsvalgte'
    }
  },
  'O-39003-43': {
    navn: 'Voksenopplæring og karriereutvikling',
    nextLink: {
      href: 'https://api.felleskomponent.no/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-439',
      navn: 'Voksenopplæring og karriereutvikling'
    }
  }
}

// Validate rules (e.g. navn)

const handleUnitRecursive = (unit) => {
  const unitCopy = JSON.parse(JSON.stringify(unit)) // Tar en kopi for å ikke endre originalen
  let correspondingBottomUnit = unitCopy // Start med den vi er på
  let allUnderordnet = unitCopy._links.underordnet || [] // Variabel for å få med alle underordnede fra flere abstrakte nivåer
  
  const nextLevelProbableLinks = [] // Add all next level probable links to keep track of which abstract units we have already added/merged, and not include them in underordnet
  while (Array.isArray(correspondingBottomUnit._links.underordnet) && correspondingBottomUnit._links.underordnet.length > 0) { // Så lenge det er noen underordnede, så må vi gå nedover
    let nextLevelProbableLink = ''
    // Regel for å finne riktig underordnet på de som er fucka - hardkodet faktsik hvem som er tilsvarende abstrakt unit på nivået under
    const nextLinkOverride = overrideNextProbableLink[correspondingBottomUnit.organisasjonsId.identifikatorverdi]
    if (nextLinkOverride) {
      console.log(`Override rule for ${correspondingBottomUnit.navn}, ${correspondingBottomUnit.organisasjonsId.identifikatorverdi}`)
      nextLevelProbableLink = nextLinkOverride.nextLink.href
    } else {
      const selfOrgIdLink = correspondingBottomUnit._links.self.find(link => link.href.includes('organisasjonsid'))
      nextLevelProbableLink = `${selfOrgIdLink.href}0`
      if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
        nextLevelProbableLink = `${selfOrgIdLink.href}00`
      }
    }
    if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
      malformedUnits.correspondingBottomUnitMissing.push(unit)
      break // OBS TENK PÅ HVA SOM FAKTISK KOMMER TIL Å SKJE HER
    }
    if (nextLinkOverride) console.log(nextLevelProbableLink)
    nextLevelProbableLinks.push(nextLevelProbableLink)

    // Også må vi ha en slags skiplevel-regel, hvis vi f. eks skal hoppe over en enhet. Da kan det hende vi bare kan smokke alle dataene fra den opp et nivå i treet.

    correspondingBottomUnit = getUnitFromLink(nextLevelProbableLink, enheter)
    // Også må vi slenge på evt underordnet på denne fordi det er så gøy
    allUnderordnet = [...allUnderordnet, ...(correspondingBottomUnit._links.underordnet || [])]
  }
  // Her har vi da correspondingUnit på bunn (kan være den samme som startUnit)
  // Da kan vi bygge den faktiske enheten
  const actualUnit = {
    topOrganisasjonsId: unitCopy.organisasjonsId,
    topNavn: unitCopy.navn,
    organisasjonsId: correspondingBottomUnit.organisasjonsId,
    navn: correspondingBottomUnit.navn,
  }
  
  if (Array.isArray(allUnderordnet)) { // Så må vi gjøre samme greia med alle underenheter - MEN vi må fjerne alle underenheter som tilsvarer den vi faktisk er på - altså de dumme duplikate abstrakte nivåene...
    actualUnit.underordnet = allUnderordnet.filter(link => !nextLevelProbableLinks.includes(link.href)) // Remove the ones that is actually itself
    actualUnit.underordnet = actualUnit.underordnet.map(link => {
      const underordnetUnit = getUnitFromLink(link.href, enheter)
      return handleUnitRecursive(underordnetUnit)
    }).sort((a, b) => a.navn.localeCompare(b.navn))
  }

  // Også kan vi faktisk kanskje dunke det inn i en flat struktur, så får vi det og

  return actualUnit
}

// Tror jeg vil lage et nesta helvete - så kan vi flatte den etterpå, fordi det er enklere å se hva som er feil da
for (const topUnit of topUnits) {
  if (topUnit.navn === 'Øverste nivå') continue // Skip this one for now
  const result = handleUnitRecursive(topUnit)
  writeFileSync(`./ignore/recursiveResult-${topUnit.navn}.json`, JSON.stringify(result, null, 2)) // Skriv til fil
}
*/
