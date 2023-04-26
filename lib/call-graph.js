const graphToken = require('./graph-token')
const axios = require('axios').default
const { graphUrl, feidenavnTeacherDomain, employeeNumberExtenstionAttribute } = require('../config')

const getFeidenavn = async (objectId) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${objectId}?$select=onPremisesSamAccountName`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesSamAccountName) throw new Error(`Could not find onPremisesSamAccountName for "${objectId}"`)
  return `${data.onPremisesSamAccountName}${feidenavnTeacherDomain}`
}

const getAnsattnummer = async (objectId) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${objectId}?$select=onPremisesExtensionAttributes`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesExtensionAttributes) throw new Error(`Could not find onPremisesExtensionAttributes for "${objectId}"`)
  if (!data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]) throw new Error(`Could not find onPremisesExtensionAttributes.${employeeNumberExtenstionAttribute} for "${objectId}"`)
  return data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]
}

module.exports = { getFeidenavn, getAnsattnummer }