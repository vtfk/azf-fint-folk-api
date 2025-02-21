const { logger, logConfig } = require('@vtfk/logger')
const { teamsStatusAlert } = require('../lib/fint-organization-fixed/teams-status-alert')

module.exports = async function (context, myTimer) {
  logConfig({
    prefix: 'azf-fint-folk - IDM Teams Status'
  })
  logger('info', ['Running timer trigger'], context)

  try {
    await teamsStatusAlert(context)
  } catch (error) {
    logger('error', ['Teams status alert failed...', error.response?.data || error.stack || error.toString()])
  }
}
