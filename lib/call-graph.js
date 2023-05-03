const graphToken = require('./graph-token')
const axios = require('axios').default
const { graphUrl, feidenavnTeacherDomain, employeeNumberExtenstionAttribute } = require('../config')

const getFeidenavn = async (upn) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesSamAccountName`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesSamAccountName) throw new Error(`Could not find onPremisesSamAccountName for "${upn}"`)
  return `${data.onPremisesSamAccountName}${feidenavnTeacherDomain}`
}

const getAnsattnummer = async (upn) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesExtensionAttributes`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesExtensionAttributes) throw new Error(`Could not find onPremisesExtensionAttributes for "${upn}"`)
  if (!data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]) throw new Error(`Could not find onPremisesExtensionAttributes.${employeeNumberExtenstionAttribute} for "${upn}"`)
  return data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]
}

module.exports = { getFeidenavn, getAnsattnummer }