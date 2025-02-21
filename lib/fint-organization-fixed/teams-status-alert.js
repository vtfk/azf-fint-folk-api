const { default: axios } = require('axios')
const { fintOrganizationFixedIdm } = require('./idm')
const { teamsStatusAlertUrls, feidenavnDomain } = require('../../config')
const { logger } = require('@vtfk/logger')

const getDisplayData = (data, maxElements) => {
  // Møkk - adaptive card støtter bare 40 kb ellerno, så vi må drite i dataene her... henviser heller til validate endepunktet
  return null
  /*
  if (!Array.isArray(data)) return null
  if (data.length === 0) return null
  let dataToDisplay = data.slice(0, maxElements + 1)
  if (data.length > maxElements) {
    dataToDisplay.push({ info: `... og ${data.length - maxElements} flere elementer...` })
  }
  try {
    dataToDisplay = JSON.stringify(dataToDisplay, null, 2)
  } catch (error) {
    dataToDisplay = 'Dataene kunne ikke stringifies...'
  }
  return dataToDisplay
  */
}

const teamsStatusAlert = async (context) => {
  if (!teamsStatusAlertUrls || teamsStatusAlertUrls.length === 0) {
    logger('warn', ['teamsStatusAlert', 'Teams status alert URL is not set, skipping...'], context)
    return
  }

  let teamsMsg

  const icons = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    what: '❓'
  }
  const colors = {
    accent: 'accent',
    good: 'good',
    attention: 'attention',
    warning: 'warning'
  }

  try {
    // Kjør idm fixed org - generer opp en fin rapport og send den til Teams
    const { rawValidationResult, exceptionRuleValidationResult, repackedFintUnitsResult } = await fintOrganizationFixedIdm(context)

    const codeBlockFallback = {
      type: 'TextBlock',
      text: '*CodeBlock er ikke støttet på din enhet, data kan ikke vises her*',
      wrap: true,
      size: 'small'
    }

    // Summarized status
    const allIsGood = rawValidationResult?.valid && exceptionRuleValidationResult?.valid && repackedFintUnitsResult?.valid
    const countyName = feidenavnDomain.replace('@', '').replace('.no', '')
    const summary = {
      type: 'Container',
      items: [
        {
          type: 'TextBlock',
          text: `**Statusrapport for FINT-organisasjonskverning** (${countyName})`,
          wrap: true,
          size: 'large',
          weight: 'bolder',
          color: colors.accent
        },
        {
          type: 'TextBlock',
          text: allIsGood ? `${icons.pass} FINT og flott gitt` : `${icons.fail} UFINT og ikke flott, sjekk under og fiks`,
          weight: 'default',
          size: 'medium'
        },
        {
          type: 'TextBlock',
          text: 'Kjør /organizationFixed/idm/validate for å se detaljer - adaptive card støtter bare 40kb så kan ikke vise alt her...',
          weight: 'default',
          size: 'small'
        }
      ],
      spacing: 'Large',
      style: 'default'
    }

    // Raw validation
    const rawValidationReport = {
      type: 'Container',
      items: [
        {
          type: 'TextBlock',
          text: '**Validering av rawdata-enheter fra FINT**',
          wrap: true,
          size: 'medium',
          weight: 'bolder',
          color: colors.accent
        },
        {
          type: 'TextBlock',
          text: `${rawValidationResult.valid ? icons.pass : icons.fail} Valid: **${rawValidationResult.valid}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        },
        {
          type: 'TextBlock',
          text: `${rawValidationResult.internalError === 'no error' ? icons.pass : icons.fail} Internal errors: **${rawValidationResult.internalError}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        }
      ],
      spacing: 'Large',
      style: 'default'
    }
    const validationReportMapped = Object.values(rawValidationResult.tests).map((value) => {
      const statusIcon = icons[value.status] || icons.what
      const stuffToAdd = [
        {
          type: 'TextBlock',
          text: `${statusIcon} ${value.description}: **${value.data === 'not run' ? 'Ikke kjørt, sjekk error' : Array.isArray(value.data) ? value.data.length : value.data}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        }
      ]
      const displayData = getDisplayData(value.data, 5)
      if (displayData) {
        stuffToAdd.push({
          type: 'CodeBlock',
          codeSnippet: displayData,
          language: 'json',
          startLineNumber: 1,
          fallback: codeBlockFallback
        })
      }
      return stuffToAdd
    })
    rawValidationReport.items.push(...validationReportMapped.flat())

    // Exception rule validation
    const exceptionRuleValidationReport = {
      type: 'Container',
      items: [
        {
          type: 'TextBlock',
          text: '**Validering av unntaksregler**',
          wrap: true,
          size: 'medium',
          weight: 'bolder',
          color: colors.accent
        },
        {
          type: 'TextBlock',
          text: `${exceptionRuleValidationResult ? exceptionRuleValidationResult.valid ? icons.pass : icons.fail : icons.warn} Valid: **${typeof exceptionRuleValidationResult?.valid === 'boolean' ? exceptionRuleValidationResult.valid : 'Validering ikke kjørt...'}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        }
      ],
      spacing: 'Large',
      style: 'default'
    }
    if (exceptionRuleValidationResult) {
      exceptionRuleValidationReport.items.push(
        {
          type: 'TextBlock',
          text: `${exceptionRuleValidationResult.internalError === 'no error' ? icons.pass : icons.fail} Internal errors: **${exceptionRuleValidationResult.internalError}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        },
        {
          type: 'TextBlock',
          text: `${exceptionRuleValidationResult.valid ? icons.pass : icons.fail} Invalid rules: **${exceptionRuleValidationResult.invalidRules.length}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        }
      )
      const displayData = getDisplayData(exceptionRuleValidationResult.invalidRules, 20)
      if (displayData) {
        exceptionRuleValidationReport.items.push({
          type: 'CodeBlock',
          codeSnippet: displayData,
          language: 'json',
          startLineNumber: 1,
          fallback: codeBlockFallback
        })
      }
    }

    // Repacked FINT validation
    const repackedFintUnitsReport = {
      type: 'Container',
      items: [
        {
          type: 'TextBlock',
          text: '**Validering av repacking/fiksing av enheter fra FINT**',
          wrap: true,
          size: 'medium',
          weight: 'bolder',
          color: colors.accent
        },
        {
          type: 'TextBlock',
          text: `${repackedFintUnitsResult ? repackedFintUnitsResult.valid ? icons.pass : icons.fail : icons.warn} Valid: **${typeof repackedFintUnitsResult?.valid === 'boolean' ? repackedFintUnitsResult.valid : 'Validering ikke kjørt...'}**`,
          weight: 'default',
          size: 'medium',
          wrap: true
        }
      ],
      spacing: 'Large',
      style: 'default'
    }
    if (repackedFintUnitsResult) {
      repackedFintUnitsReport.items.push({
        type: 'TextBlock',
        text: `${repackedFintUnitsResult.internalError === 'no error' ? icons.pass : icons.fail} Internal errors: **${rawValidationResult.internalError}**`,
        weight: 'default',
        size: 'medium',
        wrap: true
      })
      const repackedFintUnitsReportMapped = Object.values(repackedFintUnitsResult.tests).map((value) => {
        const statusIcon = icons[value.status] || icons.what
        const stuffToAdd = [
          {
            type: 'TextBlock',
            text: `${statusIcon} ${value.description}: **${value.data === 'not run' ? 'Ikke kjørt, sjekk error' : Array.isArray(value.data) ? value.data.length : value.data}**`,
            weight: 'default',
            size: 'medium',
            wrap: true
          }
        ]
        const displayData = getDisplayData(value.data, 15)
        if (displayData) {
          stuffToAdd.push({
            type: 'CodeBlock',
            codeSnippet: displayData,
            language: 'json',
            startLineNumber: 1,
            fallback: codeBlockFallback
          })
        }
        return stuffToAdd
      })
      repackedFintUnitsReport.items.push(...repackedFintUnitsReportMapped.flat())

      // Create a status for used exception rules as well
      const usedExceptionRules = {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: `Unntaksregler som ble brukt i repacking: **${repackedFintUnitsResult.handledByExceptionRules.length}**`,
            wrap: true,
            weight: 'bolder',
            size: 'medium',
            color: colors.accent
          }
        ]
      }
      const displayData = getDisplayData(repackedFintUnitsResult.handledByExceptionRules, 20)
      if (displayData) {
        usedExceptionRules.items.push({
          type: 'CodeBlock',
          codeSnippet: displayData,
          language: 'json',
          startLineNumber: 1,
          fallback: codeBlockFallback
        })
      }

      repackedFintUnitsReport.items.push(usedExceptionRules)
    }

    teamsMsg = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.5',
          msteams: { width: 'full' },
          body: [
            summary,
            rawValidationReport,
            exceptionRuleValidationReport,
            repackedFintUnitsReport
          ]
        }
      }]
    }
  } catch (error) {
    logger('error', ['teamsStatusAlert', 'Failed to generate Teams status alert', error.message], context)
    teamsMsg = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.5',
          msteams: { width: 'full' },
          body: [
            {
              type: 'TextBlock',
              text: '**Statusrapport for FINT-organisasjonskverning**',
              wrap: true,
              size: 'large',
              weight: 'bolder',
              color: 'attention'
            },
            {
              type: 'TextBlock',
              text: `${icons.fail} Noe gikk galt under generering av statusrapport`,
              weight: 'default',
              wrap: true,
              size: 'medium'
            },
            {
              type: 'TextBlock',
              text: error.response?.data || error.stack || error.toString(),
              weight: 'default',
              wrap: true,
              size: 'medium'
            }
          ]
        }
      }]
    }
  }
  for (const webhookUrl of teamsStatusAlertUrls) {
    logger('info', ['teamsStatusAlert', 'Sending Teams status alert'], context)
    try {
      await axios.post(webhookUrl, teamsMsg)
    } catch (error) {
      logger('error', ['teamsStatusAlert', 'Failed to send Teams status alert', error.message], context)
    }
  }
}

module.exports = { teamsStatusAlert }
