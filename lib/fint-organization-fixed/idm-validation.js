const { logger } = require('@vtfk/logger')
const { organizationFixed, fint: { url } } = require('../../config')

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

const hasCorrectOrganisasjonsIdFormat = (organisasjonsId) => {
  return organisasjonsId.split('-').length === 3
}

// Forventer array inn fra forrige funksjon
const validateRawOrganizationUnits = (rawOrganizationUnits, context) => {
  const validationResult = {
    valid: false, // Pessimistisk, antar at det er noe kødd
    internalError: 'no error',
    tests: {
      allowedNumberOfRawUnits: {
        description: `Antall raw-enheter er innenfor gitte grenser (${organizationFixed.idmMinimumUnits} til ${organizationFixed.idmMaximumUnits})`,
        data: null,
        status: 'not run'
      },
      missingOrganisasjonsId: {
        description: 'Enheter uten organisasjonsId (maks 10), aksepterer noen tomme fra FINT av en eller annen grunn',
        data: [],
        status: 'not run'
      },
      invalidOrganisasjonsIdFormat: {
        description: 'Enheter med ugyldig organisasjonsId-format (ikke "x-x-x")',
        data: [],
        status: 'not run'
      },
      haveItselfAsChild: {
        description: 'Enheter som har seg selv som underordnet (skaper evig loop, fjerner lenka til seg selv i underordnet)',
        data: [],
        status: 'not run'
      },
      missingOverordnet: {
        description: 'Enheter uten noen overordnet (itj lov)',
        data: [],
        status: 'not run'
      },
      missingSelfOrgIdLink: {
        description: 'Enheter uten en self-link med som bruker organisasjonsId som nøkkel',
        data: [],
        status: 'not run'
      },
      missingGyldighetsperiode: {
        description: 'Enheter uten gyldighetsperiode i det hele tatt...',
        data: [],
        status: 'not run'
      },
      expiredUnits: {
        description: 'Enheter som har utgått gyldighetsperiode',
        data: [],
        status: 'not run'
      },
      relationToExpiredChild: {
        description: 'Enheter som har relasjon til underordnede enheter med utgått gyldighetsperiode og ikke er utgått selv (relasjonene fjernes for å unngå problemer, MEN skal det være sånn da??)',
        data: [],
        status: 'not run'
      },
      relationToExpiredParent: {
        description: 'Enheter som har relasjon til overordnet enhet med utgått gyldighetsperiode og ikke er utgått selv (ikke lov)',
        data: [],
        status: 'not run'
      },
      brokenChildRelation: {
        description: 'Enheter som har underordnet som ikke finnes (eller har duplikat), eller der en underordnet enhet ikke peker tilbake på overordnet. OBS! Vi tillater disse, da vi ikke tillater ødelagte parent-relasjoner - men de kan være nyttige å vite om, da enheten blir ekskludert fra resultatet.',
        data: [],
        status: 'not run'
      },
      brokenParentRelation: {
        description: 'Enheter med relasjon til en overordnet som enten ikke finnes (eller har duplikat), eller der overordnet enhet ikke peker tilbake på underordnet',
        data: [],
        status: 'not run'
      },
      abstractWithArbeidsforhold: {
        description: 'Abstrakte enheter (enheter med underordnede) med arbeidsforhold',
        data: [],
        status: 'not run'
      },
      topUnits: {
        description: 'Topp-enheter (enheter som har seg selv som overordnet) - må ha minst en',
        data: [],
        status: 'not run'
      },
      allowedNumberOfValidUnits: {
        description: `Antall valid-enheter er innenfor gitte grenser (${organizationFixed.idmMinimumUnits} til ${organizationFixed.idmMaximumUnits})`,
        data: null,
        status: 'not run'
      }
    },
    validUnits: null
  }

  // Omg... FINT har noen lenker med camelcase og noen uten... jeg bare konverter alle organisasjonsid-lenker til lowercase. OOOGGG enda bedre, noen kan ha seg selv som underordnet, må fjerne de lenkene for å ikke gå i evig loop...
  const fixOrgLinks = (unit) => {
    if (Array.isArray(unit._links.overordnet)) {
      for (const link of unit._links.overordnet) {
        if (link.href.includes('organisasjonsId')) {
          link.href = link.href.replace('organisasjonsId', 'organisasjonsid')
        }
      }
    }
    if (Array.isArray(unit._links.underordnet)) {
      for (const link of unit._links.underordnet) {
        if (link.href.includes('organisasjonsId')) {
          link.href = link.href.replace('organisasjonsId', 'organisasjonsid')
        }
      }
    }
    if (Array.isArray(unit._links.self)) {
      for (const link of unit._links.self) {
        if (link.href.includes('organisasjonsId')) {
          link.href = link.href.replace('organisasjonsId', 'organisasjonsid')
        }
      }
    }
    // Så fjerner vi de som har seg selv som underordnet
    if (Array.isArray(unit._links.underordnet) && Array.isArray(unit._links.self)) {
      const haveItselfAsChild = unit._links.underordnet.some(link => unit._links.self.some(selfLink => selfLink.href === link.href))
      if (haveItselfAsChild) {
        validationResult.tests.haveItselfAsChild.data.push(JSON.parse(JSON.stringify(unit)))
        unit._links.underordnet = unit._links.underordnet.filter(link => !unit._links.self.some(selfLink => selfLink.href === link.href)) // remove the link to itself in underordnet
      }
    }
  }

  try {
    let enheter = rawOrganizationUnits
    // Validate that we have required stuff

    // Number of raw units
    validationResult.tests.allowedNumberOfRawUnits.data = enheter.length
    validationResult.tests.allowedNumberOfRawUnits.status = (organizationFixed.idmMinimumUnits <= validationResult.tests.allowedNumberOfRawUnits.data && validationResult.tests.allowedNumberOfRawUnits.data <= organizationFixed.idmMaximumUnits) ? 'pass' : 'fail'

    // OrganisasjonsId
    validationResult.tests.missingOrganisasjonsId.data = enheter.filter(enhet => !enhet.organisasjonsId || !enhet.organisasjonsId.identifikatorverdi || enhet.organisasjonsId.identifikatorverdi.length === 0) // Sjekk hvor mange tomme det er
    validationResult.tests.missingOrganisasjonsId.status = validationResult.tests.missingOrganisasjonsId.data.length < 10 ? 'pass' : 'fail'
    enheter = enheter.filter(enhet => enhet.organisasjonsId && enhet.organisasjonsId.identifikatorverdi && enhet.organisasjonsId.identifikatorverdi.length > 0) // Fjern de som ikke har organisasjonsId

    // Abstract units with arbeidsforhold
    validationResult.tests.abstractWithArbeidsforhold.data = enheter.filter(enhet => Array.isArray(enhet._links.arbeidsforhold) && enhet._links.arbeidsforhold.length > 0 && Array.isArray(enhet._links.underordnet) && enhet._links.underordnet.length > 0)
    validationResult.tests.abstractWithArbeidsforhold.status = validationResult.tests.abstractWithArbeidsforhold.data.length === 0 ? 'pass' : 'fail'

    // OrganisasjonsId not on format x-x-x
    validationResult.tests.invalidOrganisasjonsIdFormat.data = enheter.filter(enhet => !hasCorrectOrganisasjonsIdFormat(enhet.organisasjonsId.identifikatorverdi))
    validationResult.tests.invalidOrganisasjonsIdFormat.status = validationResult.tests.invalidOrganisasjonsIdFormat.data.length === 0 ? 'pass' : 'fail'
    // Trenger ikke fjerne disse, kan ta med i resultatet for de andre testene

    // Lowercase all links - and remove itself child links
    for (const unit of enheter) {
      fixOrgLinks(unit)
    }
    validationResult.tests.haveItselfAsChild.status = validationResult.tests.haveItselfAsChild.data.length === 0 ? 'pass' : 'warn'

    // Overordnet and self link with organisasjonsid
    validationResult.tests.missingOverordnet.data = enheter.filter(enhet => !Array.isArray(enhet._links?.overordnet) || enhet._links.overordnet.length === 0 || enhet._links.overordnet.length > 1)
    validationResult.tests.missingOverordnet.status = validationResult.tests.missingOverordnet.data.length === 0 ? 'pass' : 'fail'

    validationResult.tests.missingSelfOrgIdLink.data = enheter.filter(enhet => !Array.isArray(enhet._links.self) || !enhet._links.self.some(link => link.href.includes('organisasjonsid')))
    validationResult.tests.missingSelfOrgIdLink.status = validationResult.tests.missingSelfOrgIdLink.data.length === 0 ? 'pass' : 'fail'

    enheter = enheter.filter(enhet => !validationResult.tests.missingOverordnet.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter uten overordnet
    enheter = enheter.filter(enhet => !validationResult.tests.missingSelfOrgIdLink.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter uten self link med organisasjonsid

    // Validate gyldighetsperiode
    validationResult.tests.missingGyldighetsperiode.data = enheter.filter(enhet => !enhet.gyldighetsperiode)
    validationResult.tests.missingGyldighetsperiode.status = validationResult.tests.missingGyldighetsperiode.data.length === 0 ? 'pass' : 'warn'

    validationResult.tests.expiredUnits.data = enheter.filter(enhet => {
      const rightNow = new Date().toISOString()
      const todayAt2359 = new Date(`${rightNow.substring(0, 10)}T23:59:59.999Z`) // FINT datoer driter i timestamp, så vi bruker rett før midnatt
      if (enhet?.gyldighetsperiode?.slutt && (new Date(enhet.gyldighetsperiode.slutt) < todayAt2359)) {
        return true
      }
      return false
    })
    validationResult.tests.expiredUnits.status = validationResult.tests.expiredUnits.data.length === 0 ? 'pass' : 'warn'
    // Filtrerer vekk utgåtte enheter
    enheter = enheter.filter(enhet => !validationResult.tests.expiredUnits.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi))

    // Så finner vi enheter med relasjon til utgåtte underordnede - og fjerner samtidig relasjonene
    const expiredLinks = validationResult.tests.expiredUnits.data.map(expiredUnit => (expiredUnit._links.self.find(link => link.href.includes('organisasjonsid'))).href)
    for (const enhet of enheter) {
      const expiredChildLinks = Array.isArray(enhet._links.underordnet) ? enhet._links.underordnet.filter(link => expiredLinks.includes(link.href)) : []
      if (expiredChildLinks.length > 0) {
        enhet._links.underordnet = enhet._links.underordnet.filter(link => !expiredLinks.includes(link.href))
        validationResult.tests.relationToExpiredChild.data.push({
          organisasjonsId: {
            identifikatorverdi: enhet.organisasjonsId.identifikatorverdi
          },
          navn: enhet.navn,
          expiredChildLinks
        })
      }
    }
    validationResult.tests.relationToExpiredChild.status = validationResult.tests.relationToExpiredChild.data.length === 0 ? 'pass' : 'warn'

    // Så finner vi enheter med relasjon til utgått overordnet, det aksepterer vi ikke...
    for (const enhet of enheter) {
      const expiredParentLink = expiredLinks.includes(enhet._links.overordnet[0].href) ? enhet._links.overordnet[0].href : null
      if (expiredParentLink) {
        validationResult.tests.relationToExpiredParent.data.push({
          organisasjonsId: {
            identifikatorverdi: enhet.organisasjonsId.identifikatorverdi
          },
          navn: enhet.navn,
          expiredParentLink
        })
      }
    }
    validationResult.tests.relationToExpiredParent.status = validationResult.tests.relationToExpiredParent.data.length === 0 ? 'pass' : 'fail'
    enheter = enheter.filter(enhet => !validationResult.tests.relationToExpiredParent.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter med utgått overordnet - om det er noen der feiler hele driten allikevel

    // Validate child relation (we allow broken here for now, since we do not allow broken parent relation - but we need to know about them)
    const unitsWithBrokenChildRelations = []
    enheter.forEach(enhet => {
      const childLinks = Array.isArray(enhet._links.underordnet) ? enhet._links.underordnet.map(link => link.href) : []
      const checkUnit = {
        organisasjonsId: {
          identifikatorverdi: enhet.organisasjonsId.identifikatorverdi
        },
        navn: enhet.navn,
        selfLink: enhet._links.self.find(link => link.href.includes('organisasjonsid')),
        brokenChildLinks: []
      }
      childLinks.forEach(childLink => {
        try {
          const childUnit = getUnitFromLink(childLink, enheter)
          const parentLink = childUnit._links.overordnet[0].href
          if (parentLink !== checkUnit.selfLink.href) checkUnit.brokenChildLinks.push(childLink)
        } catch {
          checkUnit.brokenChildLinks.push(childLink) // Unique child not found
        }
      })
      if (checkUnit.brokenChildLinks.length > 0) unitsWithBrokenChildRelations.push(checkUnit)
    })
    validationResult.tests.brokenChildRelation.data = unitsWithBrokenChildRelations
    validationResult.tests.brokenChildRelation.status = unitsWithBrokenChildRelations.length === 0 ? 'pass' : 'warn'

    // Validate parent relation
    validationResult.tests.brokenParentRelation.data = enheter.filter(enhet => {
      const parentLink = enhet._links.overordnet[0].href
      try {
        const parentUnit = getUnitFromLink(parentLink, enheter)
        const selfLink = enhet._links.self.find(link => link.href.includes('organisasjonsid'))
        if (selfLink.href === parentLink) return false // Parent is self (top-level)
        return !parentUnit._links.underordnet.some(link => link.href === selfLink.href)
      } catch (error) {
        return true // Parent not found
      }
    })
    validationResult.tests.brokenParentRelation.status = validationResult.tests.brokenParentRelation.data.length === 0 ? 'pass' : 'fail'

    // Fjerner de der underordnet ikke finnes eller har ødelagt parent relation
    enheter = enheter.filter(enhet => !validationResult.tests.brokenChildRelation.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter med ødelagt child relation
    enheter = enheter.filter(enhet => !validationResult.tests.brokenParentRelation.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi)) // Fjern enheter med ødelagt parent relation

    // Her kan vi også fjerne de som ikke har korrekt id format for moro skyld
    enheter = enheter.filter(enhet => !validationResult.tests.invalidOrganisasjonsIdFormat.data.some(unit => unit.organisasjonsId.identifikatorverdi === enhet.organisasjonsId.identifikatorverdi))

    // Get top units from the validated units
    validationResult.tests.topUnits.data = enheter.filter(enhet => enhet._links.overordnet.some(link => enhet._links.self.some(selfLink => selfLink.href === link.href))) // Finn enheter som har seg selv som overordnet - disse er toppenheter
    validationResult.tests.topUnits.status = validationResult.tests.topUnits.data.length > 0 ? 'pass' : 'fail'

    // Number of raw units
    validationResult.tests.allowedNumberOfValidUnits.data = enheter.length
    validationResult.tests.allowedNumberOfValidUnits.status = (organizationFixed.idmMinimumUnits <= validationResult.tests.allowedNumberOfValidUnits.data && validationResult.tests.allowedNumberOfValidUnits.data <= organizationFixed.idmMaximumUnits) ? 'pass' : 'fail'

    // Check if we are happy
    validationResult.valid = Object.values(validationResult.tests).every(test => test.status === 'pass' || test.status === 'warn')

    if (validationResult.valid) validationResult.validUnits = enheter // Else it will be null, and stuff won't run in case someone tries to use it
    return validationResult
  } catch (error) {
    logger('error', ['Internal error when validating raw organization units', error.stack || error.toString()], context)
    validationResult.internalError = error.stack || error.toString()
    validationResult.valid = false
    return validationResult
  }
}

const validateExceptionRules = (exceptionRules, preValidatedUnits, context) => {
  if (!exceptionRules) throw new Error('Missing required parameter "exceptionRules"')
  if (!preValidatedUnits) throw new Error('Missing required parameter "preValidatedUnits"')
  if (!Array.isArray(preValidatedUnits)) throw new Error('Parameter "preValidatedUnits" is not an array')

  let { overrideNextProbableLink, useAbstractAsUnitOverride, nameChainOverride, absorbChildrenOverrides, manualLeaders } = exceptionRules
  const validationResult = {
    valid: false,
    internalError: 'no error',
    invalidRules: []
  }

  const verifyBaseFormat = (key, value) => {
    if (!key || !value) throw new Error('Missing required parameters (key, value) rule cannot be verified')
    if (!hasCorrectOrganisasjonsIdFormat(key)) return { verified: false, message: `Nøkkel ${key} er ikke på format "x-x-x", sett opp regelen korrekt...` }
    if (!value.navn) return { verified: false, message: 'Regel mangler "navn"-property, sett opp regelen korrekt...' }
    const matchingUnit = preValidatedUnits.find(unit => unit.organisasjonsId.identifikatorverdi === key)
    if (!matchingUnit) return { verified: false, message: `Ingen tilsvarende enhet funnet for organisasjonsId "${key}" i FINT - enten feil id eller HR har endret noe...` }
    if (matchingUnit.navn !== value.navn) return { verified: false, message: `Navn i regel "${value.navn}" matcher ikke navn i FINT: "${matchingUnit.navn}" for organisasjonsId "${key}" - enten feil navn i regel eller HR har endret noe...` }
    return { verified: true, matchingUnit }
  }
  const verifyLink = (link) => {
    if (!link) throw new Error('Missing required parameter "link" for verifyLinkFormat')
    if (!link.href) return { verified: false, message: `Mangler href-property i link ${link}, sett opp regelen korrekt...` }
    if (!link.navn) return { verified: false, message: `Mangler navn-property i link ${link}, sett opp regelen korrekt...` }
    if (!link.href.startsWith(`${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/`)) return { verified: false, message: `href-property i link ${link.href} starter ikke med "${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/" - sett opp regelen korrekt` }
    let matchingLinkUnit
    try {
      matchingLinkUnit = getUnitFromLink(link.href, preValidatedUnits)
    } catch (error) {
      return { verified: false, message: `Ingen unik enhet funnet i FINT for link ${link.href} - enten feil id eller HR har endret noe...` }
    }
    if (matchingLinkUnit.navn !== link.navn) return { verified: false, message: `Navn i lenke fra regel "${link.navn}" matcher ikke navn i FINT: "${matchingLinkUnit.navn}" for link ${link.href} - enten feil navn i regel eller HR har endret noe...` }
    return { verified: true, matchingLinkUnit }
  }

  const generateInvalidRule = (exceptionRuleName, key, value, message) => {
    if (!exceptionRuleName || !key || !message) throw new Error('Missing required parameters (exceptionRuleName, key, value, message) for generateInvalidRule')
    return {
      exceptionRule: exceptionRuleName,
      key,
      message
    }
  }
  try {
    // Verify that there are no unknown rules
    const validRuleNames = ['overrideNextProbableLink', 'useAbstractAsUnitOverride', 'nameChainOverride', 'absorbChildrenOverrides', 'manualLeaders']
    const unknownRules = Object.keys(exceptionRules).filter(ruleName => !validRuleNames.includes(ruleName))
    if (unknownRules.length > 0) {
      const invalidRule = generateInvalidRule('unknownRuleNames', unknownRules.join(', '), 'unknownRule', 'Ukjente regelnavn, har noen skrevet noe feil mon tro - sjekk exception-rules oppsettet...')
      validationResult.invalidRules.push(invalidRule)
    }
    // Check that all override exceptions are set up correctly
    if (!overrideNextProbableLink) overrideNextProbableLink = {}
    let exceptionRuleName = 'overrideNextProbableLink'
    for (const [key, value] of Object.entries(overrideNextProbableLink)) {
      const baseFormatVerified = verifyBaseFormat(key, value)
      if (!baseFormatVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, baseFormatVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.nextLink) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, `Mangler nextLink-property for overrideNextProbableLink med nøkkel ${key} - sett opp regelen korrekt...`)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      const linkVerified = verifyLink(value.nextLink)
      if (!linkVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, linkVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      const nextLinkIsChild = baseFormatVerified.matchingUnit._links.underordnet.find(link => link.href === value.nextLink.href)
      if (!nextLinkIsChild) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, `Next link "${value.nextLink.href}" er ikke en underenhet av enheten - enten feil oppsett, eller HR har endret noe... sjekk rådata :(`)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
    }
    // Check that all useAbstractAsUnitOverride exceptions are set up correctly
    if (!useAbstractAsUnitOverride) useAbstractAsUnitOverride = {}
    exceptionRuleName = 'useAbstractAsUnitOverride'
    for (const [key, value] of Object.entries(useAbstractAsUnitOverride)) {
      const baseFormatVerified = verifyBaseFormat(key, value)
      if (!baseFormatVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, baseFormatVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
    }
    // Check that all nameChainOverride exceptions are set up correctly
    if (!nameChainOverride) nameChainOverride = {}
    exceptionRuleName = 'nameChainOverride'
    for (const [key, value] of Object.entries(nameChainOverride)) {
      const baseFormatVerified = verifyBaseFormat(key, value)
      if (!baseFormatVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, baseFormatVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.allowedNameChain || !Array.isArray(value.allowedNameChain)) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, 'Mangler allowedNameChain-property (Array) - sett opp regelen korrekt...')
        validationResult.invalidRules.push(invalidRule)
        continue
      }
    }
    // Check that all absorbChildren exceptions are set up correctly
    if (!absorbChildrenOverrides) absorbChildrenOverrides = {}
    exceptionRuleName = 'absorbChildrenOverrides'
    for (const [key, value] of Object.entries(absorbChildrenOverrides)) {
      const baseFormatVerified = verifyBaseFormat(key, value)
      if (!baseFormatVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, baseFormatVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.absorbChildren || !Array.isArray(value.absorbChildren)) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, 'Mangler absorbChildren-property (Array) - sett opp regelen korrekt...')
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      for (const absorbChild of value.absorbChildren) {
        const linkVerified = verifyLink(absorbChild)
        if (!linkVerified.verified) {
          const invalidRule = generateInvalidRule(exceptionRuleName, key, value, linkVerified.message)
          validationResult.invalidRules.push(invalidRule)
          break // OBS her breaker vi, for å ikke legge til den samme regelen flere ganger
        }
        const nextLinkIsChild = baseFormatVerified.matchingUnit._links.underordnet.find(link => link.href === absorbChild.href)
        if (!nextLinkIsChild) {
          const invalidRule = generateInvalidRule(exceptionRuleName, key, value, `Absorb child link "${absorbChild.href}" er ikke en underenhet av enheten - enten feil oppsett, eller HR har endret noe... sjekk rådata :(`)
          validationResult.invalidRules.push(invalidRule)
          break // OBS her breaker vi, for å ikke legge til den samme regelen flere ganger
        }
      }
    }
    // Check that all manualLeaders exceptions are set up correctly
    if (!manualLeaders) manualLeaders = {}
    exceptionRuleName = 'manualLeaders'
    for (const [key, value] of Object.entries(manualLeaders)) {
      const baseFormatVerified = verifyBaseFormat(key, value)
      if (!baseFormatVerified.verified) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, baseFormatVerified.message)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.leader) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, 'Mangler leader-property - sett opp regelen korrekt...')
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.leader.href) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, 'Mangler leader.href-property - sett opp regelen korrekt...')
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      if (!value.leader.href.startsWith(`${url}/administrasjon/personal/personalressurs/ansattnummer/`)) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, `leader.href-property starter ikke med ${url}/administrasjon/personal/personalressurs/ansattnummer/ - sett opp regelen korrekt...`)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
      const leaderIsALeaderInFint = preValidatedUnits.some(unit => Array.isArray(unit._links.leder) && unit._links.leder.some(link => link.href === value.leader.href))
      if (!leaderIsALeaderInFint) {
        const invalidRule = generateInvalidRule(exceptionRuleName, key, value, `Lederen ${value.leader.href} er ikke en leder i FINT - enten feil oppsett, eller HR har endret noe... sjekk rådata :(`)
        validationResult.invalidRules.push(invalidRule)
        continue
      }
    }

    validationResult.valid = Array.isArray(validationResult.invalidRules) && validationResult.invalidRules.length === 0

    return validationResult
  } catch (error) {
    logger('error', ['Internal error when validating exception-rules', error.stack || error.toString()], context)
    validationResult.internalError = error.stack || error.toString()
    validationResult.valid = false
    return validationResult
  }
}

module.exports = { validateRawOrganizationUnits, getUnitFromLink, validateExceptionRules }
