const { logger } = require('@vtfk/logger')
const { fintRest } = require('../requests/call-fint')
const { validateRawOrganizationUnits, validateExceptionRules, getUnitFromLink } = require('./idm-validation')
const { getExceptionRules } = require('./exception-rules')
const { organizationFixed, aditro: { maxUnitsWithUnknownOrgType } } = require('../../config')
const { getAditroOrgUnits, getAditroProjectDimension6Hours } = require('./aditro-unit-types')

const vgsNameChain = (nameChain) => {
  const vgsSuffixes = ['vgs', 'videregående skole', 'videregåande skule']
  const firstUnitNameVgsSuffix = vgsSuffixes.find(suffix => nameChain[0].toLowerCase().endsWith(suffix))
  if (!firstUnitNameVgsSuffix) return false
  const schoolName = nameChain[0].substring(0, nameChain[0].length - firstUnitNameVgsSuffix.length).trim()
  return nameChain.every(name => name.toLowerCase().startsWith(schoolName.toLowerCase()) && vgsSuffixes.some(suffix => name.toLowerCase().endsWith(suffix)))
}

/**
 *
 * @param {Object[]} topUnits
 * @param {Object[]} validatedUnits
 * @param {import('./aditro-unit-types').AditroUnits} aditroUnits
 * @param {Object} exceptionRules
 * @param {Object} context
 * @returns
 */
const repackFintIdmEnheter = (topUnits, validatedUnits, aditroUnits, exceptionRules, context) => {
  if (!Array.isArray(topUnits)) throw new Error('topUnits is not an array')
  if (!Array.isArray(validatedUnits)) throw new Error('validatedUnits is not an array')
  if (!(aditroUnits instanceof Map)) throw new Error('aditroUnits is not a Map')
  if (typeof exceptionRules !== 'object') throw new Error('exceptionRules is not an object')
  const { absorbChildrenOverrides, useAbstractAsUnitOverride, nameChainOverride, overrideNextProbableLink, manualLeaders } = exceptionRules // Desctructure for easier access
  const handledUnits = []
  const resultingUnitsFlat = []
  const validation = {
    valid: false,
    internalError: 'no error',
    tests: {
      correspondingBottomUnitMissing: {
        description: 'Enheter der det ikke ble funnet en tilsvarende enhet på bunnivå (som ikke ble håndtert av unntak)',
        data: [],
        status: 'not run'
      },
      correspondingBottomUnitDifferentName: {
        description: 'Enheter der navnet på bunnivå ikke stemmer overens med navnet på alle abstrakte nivåer ovenfor (som ikke ble håndtert av unntak)',
        data: [],
        status: 'not run'
      },
      notHandledUnits: {
        description: 'Enheter som ikke ble håndtert av repackFintEnhetRecursive - alle skal håndteres',
        data: [],
        status: 'not run'
      },
      handledMoreThanOneTimeUnits: {
        description: 'Enheter som ble håndtert mer enn en gang - dette skal jo ikke skje og bør undersøkes',
        data: [],
        status: 'not run'
      },
      notTriggeredExceptionRules: {
        description: 'Regler som ikke ble trigget under repackFintEnhetRecursive',
        data: [],
        status: 'not run'
      },
      allowedNumberOfRepackedUnits: {
        description: `Antall repacked-enheter er innenfor gitte grenser (${organizationFixed.idmMinimumUnits} til ${organizationFixed.idmMaximumUnits})`,
        data: null,
        status: 'not run'
      },
      missingLeader: {
        description: 'Enheter som ikke har noen leder',
        data: [],
        status: 'not run'
      },
      missingAditroUnit: {
        description: 'Enheter som finnes i FINT, men ikke i Aditro',
        data: [],
        status: 'not run'
      },
      missingAditroOrgType: {
        description: 'Enheter som ikke har organisasjonsType (projectDimension6Hours) i Aditro',
        data: [],
        status: 'not run'
      }
    },
    handledByExceptionRules: [],
    resultingUnitsFlat: [],
    resultingUnitsNested: []
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
        validation.handledByExceptionRules.push({ rule: 'useAbstractAsUnitOverride', data: { organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn }, description: 'Brukte abstrakt enhet istedet for å lete nedover' })
        break // Break out of while loop, no need to go further. The unit itself will be used as the actual unit
      }
      // Then we check if this unit has an override rule for next link - in that case, we use that instead of checking for pattern nextLink
      const nextLinkOverride = overrideNextProbableLink[correspondingBottomUnit.organisasjonsId.identifikatorverdi]
      if (nextLinkOverride) {
        logger('info', [`Override rule for ${correspondingBottomUnit.navn} (${correspondingBottomUnit.organisasjonsId.identifikatorverdi}) - overriding nextProbableLink to ${nextLinkOverride.nextLink.href}`], context)
        validation.handledByExceptionRules.push({ rule: 'overrideNextProbableLink', data: { organisasjonsId: correspondingBottomUnit.organisasjonsId.identifikatorverdi, navn: correspondingBottomUnit.navn }, description: `Overstyrte normal regel og gikk direkte videre til ${nextLinkOverride.nextLink.href} (${nextLinkOverride.nextLink.navn}) i stedet for å legge til "0" eller "00" på id` })
        nextLevelProbableLink = nextLinkOverride.nextLink.href
      } else {
        const selfOrgIdLink = correspondingBottomUnit._links.self.find(link => link.href.includes('organisasjonsid')) // Get self-organisasjonsId link, e.g /organisasjonsid/O-39003-41, then we try to add 0, check if that unit exist in underordnet, if not try to add 00, and check the same
        nextLevelProbableLink = `${selfOrgIdLink.href}0`
        if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
          nextLevelProbableLink = `${selfOrgIdLink.href}00`
        }
        if (organizationFixed.checkNextLink01) {
          if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
            nextLevelProbableLink = `${selfOrgIdLink.href}01` // Hmm tester
          }
        }
      }
      // Check that the nextProbableLink actually exists in underordnet, if not, this unit is not on a valid format - unless it is allowed to not have a corresponding bottom unit
      if (!correspondingBottomUnit._links.underordnet.some(link => link.href === nextLevelProbableLink)) {
        validation.tests.correspondingBottomUnitMissing.data.push(unit)
        break // Break out of while loop, no need to go further. Invalid unit.
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
      // Check for vgs special case where we allow the name to be different - we allow if the name ends with vgs or videregående skole and starts the same school name as well
      if (!vgsNameChain(abstractTraversedUnitsNameChain)) { // If not vgs special case, we have to check more
        const nameChainOverrideRule = nameChainOverride[unitCopy.organisasjonsId.identifikatorverdi]
        if (nameChainOverrideRule && (nameChainOverrideRule.allowedNameChain.join(',').toLowerCase() === abstractTraversedUnitsNameChain.join(',').toLowerCase())) {
          logger('warn', [`NameChainOverride rule for ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) - allowing different name chain`], context)
          validation.handledByExceptionRules.push({ rule: 'nameChainOverride', data: { organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn, allowedNameChain: nameChainOverrideRule.allowedNameChain }, description: 'Overstyrte navneregler og tillot annen navnekjede' })
        } else {
          const suggestedNameChainOverride = {
            [unitCopy.organisasjonsId.identifikatorverdi]: {
              navn: unitCopy.navn,
              allowedNameChain: abstractTraversedUnitsNameChain
            }
          }
          validation.tests.correspondingBottomUnitDifferentName.data.push({ organisasjonsId: unitCopy.organisasjonsId, navn: unitCopy.navn, suggestedNameChainOverride, abstractTraversedUnits })
        }
      }
    }

    // Now we have the actual (not abstract) unit that corresponds to the unit we are currently on - in correspondingBottomUnit, and we have all underordnet (including itself abstract units) along the way in allUnderordnet
    // Build the actual unit the way we need the nested structure, for the other endpoints
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

    // If top unit, we need to set itself as overordnet
    if (topUnits.some(topUnit => topUnit.organisasjonsId.identifikatorverdi === unitCopy.organisasjonsId.identifikatorverdi)) {
      actualUnit._links.overordnet = [actualUnit.self.find(link => link.href.includes('organisasjonsid'))]
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
        validation.handledByExceptionRules.push({ rule: 'absorbChildrenOverrides', data: { organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn, absorbedChildren: childrenToAbsorb.map(child => ({ organisasjonsId: child.organisasjonsId, navn: child.navn })) }, description: 'Absorberte barn - barnet blir borte, men parent overtok barnets underordnede' })
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

    // Then we have to get the organisasjonsType from Aditro and add it to the unit
    const aditroProjectDimension6HoursResult = getAditroProjectDimension6Hours(correspondingBottomUnit.organisasjonsId.identifikatorverdi, aditroUnits)
    if (aditroProjectDimension6HoursResult.unitNotFound) {
      logger('warn', [`No aditro unit found for unit ${correspondingBottomUnit.navn} (${correspondingBottomUnit.organisasjonsId.identifikatorverdi}), dont think this should happen...`], context)
      validation.tests.missingAditroUnit.data.push({ organisasjonsId: correspondingBottomUnit.organisasjonsId.identifikatorverdi, navn: correspondingBottomUnit.navn })
    }
    if (aditroProjectDimension6HoursResult.missingProjectDimension6Hours || aditroProjectDimension6HoursResult.invalidProjectDimension6Hours) {
      logger('info', [`No projectDimension6Hours found or invalid for unit ${correspondingBottomUnit.navn} (${correspondingBottomUnit.organisasjonsId.identifikatorverdi}), using 'ukjent'`], context)
      validation.tests.missingAditroOrgType.data.push({ organisasjonsId: correspondingBottomUnit.organisasjonsId.identifikatorverdi, navn: correspondingBottomUnit.navn })
    }

    const organisasjonsType = {
      systemId: aditroProjectDimension6HoursResult.projectDimension6Hours.id,
      kode: aditroProjectDimension6HoursResult.projectDimension6Hours.value,
      navn: aditroProjectDimension6HoursResult.projectDimension6Hours.description
    }

    // Now we only have a nice nested structure of actual units, with correct overordnet and underordnet - and we can create a flat structure of this as well for the IDM
    const repackedFintUnit = {
      abstractEnhetOrganisasjonsId: unitCopy.organisasjonsId.identifikatorverdi,
      abstractEnhetNavn: unitCopy.navn,
      abstractTraversedUnits,
      ...correspondingBottomUnit,
      organisasjonsType
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
      validation.handledByExceptionRules.push({ rule: 'manualLeaders', data: { organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn, manualLeader: manualLeader.leader }, description: 'Overstyrte leder og la til manuell fra exception-rule' })
    }

    // Do not add absorbed units to the flat result, we do not want these in the structure
    const willBeAbsorbed = willBeAbsorbedBy(unitCopy)
    if (!willBeAbsorbed) {
      resultingUnitsFlat.push(repackedFintUnit) // Add the repacked unit to the flat structure
    } else {
      logger('info', [`Unit ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) will be absorbed by parent ${willBeAbsorbed[0]} - not adding to resultingUnitsFlat`], context)
    }

    // Recursion fixed the children in the nested structure, but NOT in the flat structure - the children are added to the flat structure before they have correct overordnet, so we have to fix this now. Simply steal the correct data from the nested structure
    actualUnit.underordnet.forEach(child => {
      const childSelfLink = child.self.find(link => link.href.includes('organisasjonsid'))
      const childUnit = resultingUnitsFlat.find(enhet => enhet._links.self.some(link => link.href === childSelfLink.href)) // Find the child in the flat structure
      childUnit._links.overordnet = [actualSelfLink] // And set the correct overordnet
    })

    // Check if already handled - if so, we might have a problem
    if (handledUnits.some(handledUnit => handledUnit.organisasjonsId === unitCopy.organisasjonsId.identifikatorverdi)) {
      logger('warn', [`Unit ${unitCopy.navn} (${unitCopy.organisasjonsId.identifikatorverdi}) has already been handled - this should not happen...`], context)
      validation.tests.handledMoreThanOneTimeUnits.data.push({ organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn })
    }
    handledUnits.push({ organisasjonsId: unitCopy.organisasjonsId.identifikatorverdi, navn: unitCopy.navn }) // Keep track of which units we have handled - so we can check that all are handled in the end - and we can check if some have been handled several times

    // And now we are done with this unit, and can return it to the parent (or end of recursion)
    return actualUnit
  }

  // Then we run the shit
  try {
    const resultingUnitsNested = []
    for (const topUnit of topUnits) {
      const result = repackFintEnhetRecursive(topUnit)
      resultingUnitsNested.push(result)
    }
    // Check if there are units we havent handled with recursive function
    validation.tests.notHandledUnits.data = validatedUnits.filter(unit => !handledUnits.some(handledUnit => handledUnit.organisasjonsId === unit.organisasjonsId.identifikatorverdi))
    // Check if any exception rules were not triggered
    for (const ruleType in exceptionRules) {
      for (const ruleUnit in exceptionRules[ruleType]) {
        if (validation.handledByExceptionRules.some(handledRule => (handledRule.rule === ruleType) && (handledRule.data.organisasjonsId === ruleUnit))) continue
        validation.tests.notTriggeredExceptionRules.data.push({ ruleType, ruleUnit })
      }
    }

    // Check that valid and return with units if ok
    // Set status for tests
    validation.tests.correspondingBottomUnitMissing.status = validation.tests.correspondingBottomUnitMissing.data.length === 0 ? 'pass' : 'fail'
    validation.tests.correspondingBottomUnitDifferentName.status = validation.tests.correspondingBottomUnitDifferentName.data.length === 0 ? 'pass' : 'fail'
    validation.tests.notHandledUnits.status = validation.tests.notHandledUnits.data.length === 0 ? 'pass' : 'fail'
    validation.tests.handledMoreThanOneTimeUnits.status = validation.tests.handledMoreThanOneTimeUnits.data.length === 0 ? 'pass' : 'fail'
    validation.tests.notTriggeredExceptionRules.status = validation.tests.notTriggeredExceptionRules.data.length === 0 ? 'pass' : 'warn'
    validation.tests.allowedNumberOfRepackedUnits.data = resultingUnitsFlat.length
    validation.tests.allowedNumberOfRepackedUnits.status = (resultingUnitsFlat.length >= organizationFixed.idmMinimumUnits && resultingUnitsFlat.length <= organizationFixed.idmMaximumUnits) ? 'pass' : 'fail'
    validation.tests.missingLeader.data = resultingUnitsFlat.filter(unit => !unit._links.leder).map(unit => ({ organisasjonsId: unit.organisasjonsId.identifikatorverdi, navn: unit.navn }))
    validation.tests.missingLeader.status = validation.tests.missingLeader.data.length === 0 ? 'pass' : 'warn'
    validation.tests.missingAditroUnit.status = validation.tests.missingAditroUnit.data.length === 0 ? 'pass' : 'fail'
    validation.tests.missingAditroOrgType.status = validation.tests.missingAditroOrgType.data.length === 0 ? 'pass' : validation.tests.missingAditroOrgType.data.length < maxUnitsWithUnknownOrgType ? 'warn' : 'fail'

    validation.valid = Object.values(validation.tests).every(test => {
      return test.status === 'pass' || test.status === 'warn'
    })

    if (!validation.valid) {
      return validation
    }
    validation.resultingUnitsFlat = resultingUnitsFlat
    validation.resultingUnitsNested = resultingUnitsNested

    return validation
  } catch (error) {
    validation.valid = false
    validation.internalError = error.stack || error.toString()
    return validation
  }
}

const fintOrganizationFixedIdm = async (context) => {
  logger('info', ['fintOrganizationFixed', 'Fetching all organisasjonselementer from FINT'], context)
  const fintResult = await fintRest('/administrasjon/organisasjon/organisasjonselement', context)
  const enheter = fintResult?._embedded?._entries
  if (!enheter) throw new Error('Response from FINT did not contain "embedded._entries", something went wrong from FINT')
  if (!Array.isArray(enheter)) throw new Error('"embedded._entries" in response from FINT was not array. Something went wrong from FINT')

  const rawValidationResult = validateRawOrganizationUnits(enheter, context)
  if (!rawValidationResult.valid) return { rawValidationResult }

  const exceptionRules = getExceptionRules()
  const exceptionRuleValidationResult = validateExceptionRules(exceptionRules, rawValidationResult.validUnits, context)
  if (!exceptionRuleValidationResult.valid) return { rawValidationResult, exceptionRuleValidationResult }

  // Then we fetch aditroUnits as well, to be able to expand FINT units with organisasjonsType (which is not avaiable from FINT)
  const aditroUnits = await getAditroOrgUnits()

  const repackedFintUnitsResult = repackFintIdmEnheter(rawValidationResult.tests.topUnits.data, rawValidationResult.validUnits, aditroUnits, exceptionRules, context)

  return { rawValidationResult, exceptionRuleValidationResult, repackedFintUnitsResult }
}

module.exports = { fintOrganizationFixedIdm, repackFintIdmEnheter, vgsNameChain }
