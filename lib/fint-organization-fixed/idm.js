const { logger } = require('@vtfk/logger')
const { fintRest } = require('../requests/call-fint')
const { validateRawOrganizationUnits, validateExceptionRules, getUnitFromLink } = require('./idm-validation')
const { getExceptionRules } = require('./exception-rules')
const { writeFileSync } = require('fs')

/*
  // POST-RUN VALIDATION
    check that all validations have been run? Or just use a test for this maybe
    check resulting units number within limits
    also check if validation is valid
*/

const repackFintIdmEnheter = (topUnits, validatedUnits, exceptionRules, context) => {
  if (!Array.isArray(topUnits)) throw new Error('topUnits is not an array')
  if (!Array.isArray(validatedUnits)) throw new Error('validatedUnits is not an array')
  if (typeof exceptionRules !== 'object') throw new Error('exceptionRules is not an object')
  const { absorbChildrenOverrides, useAbstractAsUnitOverride, nameChainOverride, overrideNextProbableLink, allowNoCorrespondingBottomUnit, manualLeaders } = exceptionRules // Desctructure for easier access
  const handledUnits = []
  const resultingUnits = []
  const validation = {
    valid: false,
    internalError: 'no error',
    tests: {
      correspondingBottomUnitMissing: {
        description: 'Enheter der det ikke ble funnet en tilsvarende enhet på bunnivå',
        data: []
      },
      correspondingBottomUnitDifferentName: {
        description: 'Enheter der navnet på bunnivå ikke stemmer overens med navnet på alle abstrakte nivåer ovenfor',
        data: []
      },
      notHandledUnits: {
        description: 'Enheter som ikke ble håndtert av repackFintEnhetRecursive - alle skal håndteres',
        data: []
      }
    },
    handledByExceptionRules: [],
    resultingUnits: null
  }

  const willBeAbsorbedBy = (unit) => {
    return Object.entries(absorbChildrenOverrides).find(([key, value]) => value.absorbChildren.some(child => child.href === unit._links.self.find(link => link.href.includes('organisasjonsid')).href))
  }

  const repackFintEnhetRecursive = (unit) => {
    const unitCopy = JSON.parse(JSON.stringify(unit)) // Copy, to avoid fucking up the original along the way
    let correspondingBottomUnit = unitCopy // Set to itself to start with, we will go down the structure to find the correct one (if not on bottom level already)
    let allUnderordnet = unitCopy._links.underordnet || [] // To keep track of all underordnet, so we can add all underordnet from abstract layers along the way

    const nextLevelProbableLinks = [] // Array for all next level probable links, to keep track of which abstract units we have already added/merged, and not include them in underordnet (flatten down to the bottom-level corresponding level)
    while (Array.isArray(correspondingBottomUnit._links.underordnet) && correspondingBottomUnit._links.underordnet.length > 0) { // As long as there are underordnet, we keep going down until bottom level
      let nextLevelProbableLink = '' // Underordnet link to the corresponding abstract or actual unit below
      // First we check if this unit is in the exception rule for using abstract as unit - in that case, we use the abstract unit as the actual unit
      const useAbstractAsUnit = useAbstractAsUnitOverride[unitCopy.organisasjonsId.identifikatorverdi]
      if (useAbstractAsUnit) {
        logger('warn', [`UseAbstractAsUnit rule for ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) - using abstract unit as actual unit`], context)
        validation.handledByExceptionRules.push({ rule: 'useAbstractAsUnit', data: { organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn }, description: 'Brukte abstrakt enhet istedet for å lete nedover' })
        break // Break out of while loop, no need to go further. The unit itself will be used as the actual unit
      }
      // Then we check if this unit has an override rule for next link - in that case, we use that instead of checking for pattern nextLink
      const nextLinkOverride = overrideNextProbableLink[correspondingBottomUnit.organisasjonsId.identifikatorverdi]
      if (nextLinkOverride) {
        logger('info', [`Override rule for ${correspondingBottomUnit.navn} (${correspondingBottomUnit.organisasjonsId.identifikatorverdi}) - overriding nextProbableLink to ${nextLinkOverride.nextLink.href}`], context)
        validation.handledByExceptionRules.push({ rule: 'overrideNextProbableLink', data: { organisasjonsId: correspondingBottomUnit.organisasjonsId.identifikatorverdi, navn: correspondingBottomUnit.navn }, description: `Overstyrte normal regel og gikk direkte videre til ${nextLinkOverride.nextLink.href} i stedet for å legge til "0" eller "00" på id` })
        nextLevelProbableLink = nextLinkOverride.nextLink.href
      } else {
        const selfOrgIdLink = correspondingBottomUnit._links.self.find(link => link.href.includes('organisasjonsid')) // Get self-organisasjonsId link, e.g /organisasjonsid/O-39003-41, then we try to add 0, check if that unit exist in underordnet, if not try to add 00, and check the same
        nextLevelProbableLink = `${selfOrgIdLink.href}0`
        if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
          nextLevelProbableLink = `${selfOrgIdLink.href}00`
        }
      }
      // Check that the nextProbableLink actually exists in underordnet, if not, this unit is not on a valid format - unless it is allowed to not have a corresponding bottom unit
      if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
        if (allowNoCorrespondingBottomUnit[unitCopy.organisasjonsId.identifikatorverdi]) {
          logger('warn', [`NextProbableLink missing for ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}), BUT, the unit is allowed to not have a corresponding bottom unit in exception rule, and we are ok for now...`], context)
          validation.handledByExceptionRules.push({ rule: 'allowNoCorrespondingBottomUnit', data: { organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn }, description: 'Enheten er tillatt å ikke ha en tilsvarende enhet på bunnivå' })
        } else {
          validation.tests.correspondingBottomUnitMissing.data.push(unit)
        }

        break // Break out of while loop, no need to go further. Either invalid unit, or unit that will be absorbed by parent
      }
      nextLevelProbableLinks.push(nextLevelProbableLink) // Too keep track of which one we have traversed through, to be able to remove them from underordnet

      correspondingBottomUnit = getUnitFromLink(nextLevelProbableLink, validatedUnits) // Then we go one level down, and set nextProbable as the new correspondingBottomUnit
      allUnderordnet = [...allUnderordnet, ...(correspondingBottomUnit._links.underordnet || [])] // Add all underordnet from this level to the allUnderordnet array, so we get all underordnet for the actual unit
    }

    // Expand the abstract traversed units with name as well - and set them to handled (so we can check that all units are handled in the end)
    const abstractTraversedUnits = nextLevelProbableLinks.map(link => { 
      const currentUnit = getUnitFromLink(link, validatedUnits)
      handledUnits.push({ organisasjonsId: currentUnit.organisasjonsId.identifikatorverdi, navn: currentUnit.navn })
      return { organisasjonsId: currentUnit.organisasjonsId.identifikatorverdi, navn: currentUnit.navn, href: link }
    })
    // And add the starting unit to traversed as well
    abstractTraversedUnits.unshift({ organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn, href: unitCopy._links.self.find(link => link.href.includes('organisasjonsid')).href })
    // Create name chain for the abstractTraversedUnits for simpler check
    const abstractTraversedUnitsNameChain = abstractTraversedUnits.map(unit => unit.navn)

    // Then we validate that the correspondingBottomUnit has the same name as all the abstract units along the way
    if (abstractTraversedUnitsNameChain.some(name => name.toLowerCase() !== correspondingBottomUnit.navn.toLowerCase())) {
      // Check for vgs special case where we allow the name to be different
      if (!abstractTraversedUnitsNameChain.every(name => name.toLowerCase().endsWith('vgs') || name.toLowerCase().endsWith('videregående skole') || name.toLowerCase().endsWith('videregåande skule'))) {
        // Må legge til dum navne-regel også
        const nameChainOverrideRule = nameChainOverride[unitCopy.organisasjonsId.identifikatorverdi]
        if (nameChainOverrideRule && (nameChainOverrideRule.allowedNameChain.join(',').toLowerCase() === abstractTraversedUnitsNameChain.join(',').toLowerCase())) {
          logger('warn', [`NameChainOverride rule for ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) - allowing different name chain`], context)
          validation.handledByExceptionRules.push({ rule: 'nameChainOverride', data: { organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn, allowedNameChain: nameChainOverrideRule.allowedNameChain }, description: 'Overstyrte navneregler og tillot annen navnekjede' })
        } else {
          validation.tests.correspondingBottomUnitDifferentName.data.push({ abstractTraversedUnits })
        }
      }
    }

    // Now we have the actual (not abstract) unit that corresponds to the unit we are currently on - in correspondingBottomUnit, and we have all underordnet (including itself abstract units) along the way in allUnderordnet
    // Build the actual unit TODO -build it the way we need the nested structure, for the other endpoints
    const actualUnit = {
      topOrganisasjonsId: unitCopy.organisasjonsId,
      topNavn: unitCopy.navn,
      organisasjonsId: correspondingBottomUnit.organisasjonsId,
      navn: correspondingBottomUnit.navn,
      self: correspondingBottomUnit._links.self,
      _links: {
        overordnet: []
      }
    }

    const actualSelfLink = correspondingBottomUnit._links.self.find(link => link.href.includes('organisasjonsid')) // To be able to set correct overordnet on children

    if (Array.isArray(allUnderordnet)) { // Then we recursively handle all underordnet (except the abstract itself units) the same way
      let underordnetToHandle = allUnderordnet.filter(link => !nextLevelProbableLinks.includes(link.href)) // Remove the ones that is abstract levels of itself (these have been merged to the bottom level one)

      // First we have to check for absorbtion rules - if this unit should absorb some of its children, we have to do it first to be able to set correct overordnet on children in the end
      let grandChildrenToAddToCurrent = [] // Initialize for availability in scope
      const absorbChildrenOverride = absorbChildrenOverrides[unitCopy.organisasjonsId.identifikatorverdi]
      if (absorbChildrenOverride) {
        logger('info', [`absorbChildOverrides for ${unitCopy.navn} - absorbing ${absorbChildrenOverride.absorbChildren.length} children`], context)
        underordnetToHandle = underordnetToHandle.filter(link => !absorbChildrenOverride.absorbChildren.some(child => child.href === link.href)) // Remove children to absorb from underordnet - these will be merged into the parent, and should not be included in underordnetToHandle anymore
        const childrenToAbsorb = absorbChildrenOverride.absorbChildren.map(absorbChild => {
          const unit = getUnitFromLink(absorbChild.href, validatedUnits)
          return (repackFintEnhetRecursive(unit))
        })
        // The children to absorb have now been expanded with their own children, and are ready to be absorbed into the parent - so only the children of the chilToAbsorb should be added to the parent, and the childToAbsorb will thus be removed from the org-strcture
        grandChildrenToAddToCurrent = childrenToAbsorb.map(child => child.underordnet).flat()
        validation.handledByExceptionRules.push({ rule: 'absorbChildren', data: { organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn, absorbedChildren: childrenToAbsorb.map(child => ({ organisasjonsId: child.organisasjonsId, navn: child.navn })) }, description: 'Absorberte barn - barnet blir borte, men parent overtok barnets underordnede' })
      }

      // UnderordnetToHandle is now the children that should be handled recursively - allUnderordnet with the exception of the abstract itself units, and the children that have been absorbed
      underordnetToHandle = underordnetToHandle.map(link => {
        const underordnetUnit = getUnitFromLink(link.href, validatedUnits)
        return repackFintEnhetRecursive(underordnetUnit) // Recursively expands and fixes all children as well
      })
      actualUnit.underordnet = [...underordnetToHandle, ...grandChildrenToAddToCurrent].sort((a, b) => a.navn.localeCompare(b.navn)) // Merge underordnet and children to absorb and set as underordnet on actualUnit, and sort by navn to keep Bear happy

      // Set correct overordnet on all children as well - the beauty of recursion is that this already has been done for all children as well <3
      actualUnit.underordnet.forEach(child => {
        child.overordnet = [actualSelfLink]
        child._links.overordnet = [actualSelfLink]
      })
    } else {
      logger('warn', ['No underordnet for unit, dont think this should happen...', unitCopy.navn], context)
    }
    // Now we only have a nice nested structure of actual units, with correct overordnet and underordnet - and we can create a flat structure of this as well for the IDM
    const repackedFintUnit = {
      abstractEnhetOrganisasjonsId: unitCopy.organisasjonsId.identifikatorverdi,
      abstractEnhetNavn: unitCopy.navn,
      abstractTraversedUnits,
      ...correspondingBottomUnit
    }
    // The correspondingBottomUnit has all the correct data EXCEPT underordnet, so we add this to the repackedFintUnit ourselves - again, recursion has fixed this for all children as well already
    repackedFintUnit._links.underordnet = actualUnit.underordnet.map(child => {
      const childSelfLink = child.self.find(link => link.href.includes('organisasjonsid'))
      return childSelfLink
    })

    // Then we have to check if this unit have exception rule for manualLeader, and add the leader
    const manualLeader = manualLeaders[unitCopy.organisasjonsId.identifikatorverdi]
    if (manualLeader) {
      logger('warn', [`ManualLeader rule for ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) - adding/replacing with manual leader ${manualLeader.leader.href}`], context)
      repackedFintUnit._links.leder = [manualLeader.leader]
      actualUnit._links.leder = [manualLeader.leader]
      validation.handledByExceptionRules.push({ rule: 'manualLeader', data: { organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn, manualLeader: manualLeader.leader }, description: 'Overstyrte leder og la til manuell fra exception-rule' })
    }

    // Do not add absorbed units to the flat result, we do not want these in the structure
    const willBeAbsorbed = willBeAbsorbedBy(unitCopy)
    if (!willBeAbsorbed) {
      resultingUnits.push(repackedFintUnit)
    } else {
      logger('info', [`Unit ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) will be absorbed by parent ${willBeAbsorbed[0]} - not adding to resultingUnits`], context)
    }

    // Recursion fixed the children in the nested structure, but NOT in the flat structure - the children are added to the flat structure before they have correct overordnet, so we have to fix this now. Simply steal the correct data from the nested structure
    actualUnit.underordnet.forEach(child => {
      const childSelfLink = child.self.find(link => link.href.includes('organisasjonsid'))
      const childUnit = resultingUnits.find(enhet => enhet._links.self.some(link => link.href === childSelfLink.href)) // Find the child in the flat structure
      childUnit._links.overordnet = [actualSelfLink] // And set the correct overordnet
    })

    handledUnits.push({ organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn }) // Keep track of which units we have handled - so we can check that all are handled in the end - and we can check if some have been handled several times

    // And now we are done with this unit, and can return it to the parent (or end of recursion)
    return actualUnit
  }

  // Then we run the shit
  // Remember to check if some units were handled more than one time
  const structures = []
  for (const topUnit of topUnits) {
    if (['Overordnet orgid', 'Øverste nivå'].includes(topUnit.navn)) continue // Skip these
    const result = repackFintEnhetRecursive(topUnit)
    structures.push(result)
    writeFileSync(`./ignore/recursiveResultAgain-${topUnit.navn}.json`, JSON.stringify(result, null, 2)) // Skriv til fil
  }
  writeFileSync('./ignore/newFintUnitsAgain.json', JSON.stringify(resultingUnits, null, 2)) // Skriv til fil
  validation.tests.notHandledUnits.data = validatedUnits.filter(unit => !handledUnits.some(handledUnit => handledUnit.organisasjonsId === unit.organisasjonsId.identifikatorverdi))
  console.log(validation.tests.notHandledUnits.data.length)
  writeFileSync('./ignore/validationResult.json', JSON.stringify(validation, null, 2))
  writeFileSync('./ignore/handled.json', JSON.stringify(handledUnits, null, 2))

  return validation
}

const fintOrganizationFixedIdm = async (context) => {
  logger('info', ['fintOrganizationFixed', 'Fetching all organisasjonselementer from FINT'], context)
  const fintResult = await fintRest('/administrasjon/organisasjon/organisasjonselement', context)
  const enheter = fintResult?._embedded?._entries
  if (!enheter) throw new Error('Response from FINT did not contain "embedded._entries", something went wrong from FINT')
  if (!Array.isArray(enheter)) throw new Error('"embedded._entries" in response from FINT was not array. Something went wrong from FINT')

  writeFileSync('./ignore/rawFintUnits.json', JSON.stringify(enheter, null, 2)) // Skriv til fil

  const rawValidationResult = validateRawOrganizationUnits(enheter, context)
  if (!rawValidationResult.valid) return rawValidationResult
  // Maybe just return here if not valid? Or maybe return the validation result for further inspection?
  // Evt ha en messageGenerator basert på result - så kan den lage en error til oss :)
  const exceptionRules = getExceptionRules()
  const exceptionRuleValidationResult = validateExceptionRules(exceptionRules, rawValidationResult.validUnits, context)
  if (!exceptionRuleValidationResult.valid) return exceptionRuleValidationResult

  // Finn ut av en god struktur her gitt...
  const repackedFintUnits = repackFintIdmEnheter(rawValidationResult.tests.topUnits.data, rawValidationResult.validUnits, exceptionRules, context)

  // Vi kjører validering underveis i rekursiv gærning

  // Validerer valideringa kanskje? Så Returnere vi den nye flotte strukturen om alt er good - om noe er gærnt, henvis til validate endepunktet for å se hva som er galt (for å alltid returnere det samme på 200)

  return { rawValidationResult, exceptionRuleValidationResult, repackedFintUnits }
}

module.exports = { fintOrganizationFixedIdm, repackFintIdmEnheter }
